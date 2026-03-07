import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiToken, getApiBase } from '@/lib/asset-api';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const servicePointIdsStr = formData.get('servicePointIds') as string;
    const itemIdsStr = formData.get('itemIds') as string;
    const status = (formData.get('status') as string) || 'normal_use';
    const reason = (formData.get('reason') as string) || '';
    const equipImage = formData.get('equipImage') as File | null;
    const overallImage = formData.get('overallImage') as File | null;

    if (!servicePointIdsStr || !itemIdsStr || !equipImage || !overallImage) {
      return NextResponse.json({ error: 'Missing required fields: servicePointIds, itemIds, equipImage, overallImage' }, { status: 400 });
    }

    // Validate JSON inputs
    let servicePointIds: number[];
    let itemIds: number[];
    try {
      servicePointIds = JSON.parse(servicePointIdsStr);
      itemIds = JSON.parse(itemIdsStr);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in servicePointIds or itemIds' }, { status: 400 });
    }

    if (!Array.isArray(servicePointIds) || !Array.isArray(itemIds) || !itemIds.length) {
      return NextResponse.json({ error: 'servicePointIds and itemIds must be non-empty arrays' }, { status: 400 });
    }

    // Validate file sizes (max 10MB each)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (equipImage.size > MAX_FILE_SIZE || overallImage.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Each image must be under 10MB' }, { status: 400 });
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(equipImage.type) || !validTypes.includes(overallImage.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and HEIC images are allowed' }, { status: 400 });
    }

    const token = await getApiToken();

    // Read image files once
    const equipBytes = Buffer.from(await equipImage.arrayBuffer());
    const overallBytes = Buffer.from(await overallImage.arrayBuffer());

    const results: { itemId: number; success: boolean; error?: string }[] = [];

    for (const itemId of itemIds) {
      try {
        const body = new FormData();
        body.append('status', status);
        body.append('disposal_reason', reason);
        body.append('address_edit_requested', '0');
        body.append('equip_image', new Blob([equipBytes], { type: 'image/jpeg' }), 'equip.jpg');
        body.append('overall_image', new Blob([overallBytes], { type: 'image/jpeg' }), 'overall.jpg');

        const r = await fetch(`${getApiBase()}/items/${itemId}/inspect`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });

        results.push({ itemId, success: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` });
      } catch (err) {
        results.push({ itemId, success: false, error: String(err) });
      }

      // Brief throttle to avoid overwhelming external API
      if (itemIds.indexOf(itemId) < itemIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Determine status: if this is a single-item step upload, use 'partial'
    // Only set 'uploaded' if explicitly marked complete
    const successCount = results.filter((r) => r.success).length;
    const isComplete = formData.get('isComplete') === 'true';
    let uploadStatus: string;
    if (isComplete && successCount === itemIds.length) {
      uploadStatus = 'uploaded';
    } else if (successCount > 0) {
      uploadStatus = 'partial';
    } else {
      uploadStatus = 'pending';
    }

    // Update ALL service points with this asset_id
    await prisma.uso_service_point.updateMany({
      where: { id: { in: servicePointIds } },
      data: {
        upload_status: uploadStatus,
        uploaded_at: uploadStatus === 'uploaded' ? new Date() : undefined,
        reason: reason || undefined,
      },
    });

    return NextResponse.json({
      results,
      uploadStatus,
      successCount,
      totalCount: itemIds.length,
    });
  } catch (error) {
    console.error('Upload submission failed:', error);
    return NextResponse.json({ error: 'Upload submission failed' }, { status: 500 });
  }
}
