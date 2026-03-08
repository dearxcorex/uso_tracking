import { NextRequest, NextResponse } from 'next/server';
import { getApiToken, getApiBase } from '@/lib/asset-api';
import {
  extractLatestImages,
  validateBatchImageIds,
  fetchBatchImages,
  type InspectionImages,
} from '@/lib/upload-utils';

/** Rewrite raw MinIO URLs to go through our proxy to bypass CORS */
function proxyImageUrls(images: InspectionImages): InspectionImages {
  const rewrite = (url: string | null) =>
    url ? `/api/upload/images/proxy?url=${encodeURIComponent(url)}` : null;
  return {
    ...images,
    equipImageUrl: rewrite(images.equipImageUrl),
    overallImageUrl: rewrite(images.overallImageUrl),
  };
}

/** Single item fetch (backward compatible): GET /api/upload/images?item_id=123 */
/** Batch fetch (new, faster):              GET /api/upload/images?item_ids=101,102,103 */
export async function GET(request: NextRequest) {
  try {
    const itemIds = request.nextUrl.searchParams.get('item_ids');

    // Batch mode — fetch multiple items in one request
    if (itemIds) {
      const validation = validateBatchImageIds(itemIds);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const token = await getApiToken();
      const base = getApiBase();

      const fetcher = async (itemId: number): Promise<InspectionImages> => {
        const r = await fetch(`${base}/items/${itemId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(`Failed to fetch item ${itemId}`);
        const data = await r.json();
        return proxyImageUrls(extractLatestImages(data.inspections));
      };

      const result = await fetchBatchImages(validation.ids!, fetcher, 5);
      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, max-age=60' },
      });
    }

    // Single mode — backward compatible
    const itemId = request.nextUrl.searchParams.get('item_id');
    if (!itemId || !/^\d+$/.test(itemId)) {
      return NextResponse.json({ error: 'item_id or item_ids is required' }, { status: 400 });
    }

    const token = await getApiToken();
    const r = await fetch(`${getApiBase()}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      return NextResponse.json({ error: 'Failed to fetch item from API' }, { status: 502 });
    }

    const data = await r.json();
    const images = proxyImageUrls(extractLatestImages(data.inspections));

    return NextResponse.json(images, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    console.error('Failed to fetch item images:', error);
    return NextResponse.json({ error: 'Failed to fetch item images' }, { status: 500 });
  }
}
