import { NextRequest, NextResponse } from 'next/server';
import { getApiToken, getApiBase } from '@/lib/asset-api';

export async function GET(request: NextRequest) {
  try {
    const assetId = request.nextUrl.searchParams.get('asset_id');
    if (!assetId) {
      return NextResponse.json({ error: 'asset_id is required' }, { status: 400 });
    }

    const token = await getApiToken();
    const params = new URLSearchParams({
      q: assetId,
      page_size: '100',
      hide_done: 'false',
      pcode: '36',
    });

    const r = await fetch(`${getApiBase()}/items?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      return NextResponse.json({ error: 'Failed to fetch sub-assets from API' }, { status: 502 });
    }

    const data = await r.json();
    const items = (data.rows || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      assetId: item.asset_id,
      subAssetId: item.sub_asset_id,
      oAssetId: item.o_asset_id,
      assetDesc: item.asset_desc,
      refDoc: item.ref_doc,
      locationText: item.location_text,
      statusKey: item._status_key,
      derivedStatus: item._derived_status,
    }));

    return NextResponse.json({ total: data.total, items });
  } catch (error) {
    console.error('Failed to fetch sub-assets:', error);
    return NextResponse.json({ error: 'Failed to fetch sub-assets' }, { status: 500 });
  }
}
