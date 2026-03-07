import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.ASSET_API_BASE || 'http://34.126.174.195:8000/api';

async function getApiToken(): Promise<string> {
  const user = process.env.ASSET_API_USER;
  const pass = process.env.ASSET_API_PASS;
  if (!user || !pass) {
    throw new Error('ASSET_API_USER and ASSET_API_PASS must be set');
  }
  const form = new URLSearchParams({ username: user, password: pass });
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!r.ok) throw new Error('API login failed');
  const data = await r.json();
  return data.access_token;
}

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

    const r = await fetch(`${API_BASE}/items?${params}`, {
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
