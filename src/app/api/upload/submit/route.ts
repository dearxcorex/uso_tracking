import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_BASE = 'http://34.126.174.195:8000/api';

async function getApiToken(): Promise<string> {
  const user = process.env.ASSET_API_USER;
  const pass = process.env.ASSET_API_PASS;
  if (!user || !pass) throw new Error('ASSET_API_USER and ASSET_API_PASS must be set');
  const form = new URLSearchParams({ username: user, password: pass });
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!r.ok) throw new Error('API login failed');
  return (await r.json()).access_token;
}

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

    const servicePointIds: number[] = JSON.parse(servicePointIdsStr);

    const itemIds: number[] = JSON.parse(itemIdsStr);
    if (!itemIds.length) {
      return NextResponse.json({ error: 'itemIds must not be empty' }, { status: 400 });
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

        const r = await fetch(`${API_BASE}/items/${itemId}/inspect`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });

        results.push({ itemId, success: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` });
      } catch (err) {
        results.push({ itemId, success: false, error: String(err) });
      }

      // Throttle between requests
      if (itemIds.indexOf(itemId) < itemIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 150));
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
