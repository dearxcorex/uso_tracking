import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const points = await prisma.uso_service_point.findMany({
      where: {
        upload_status: { in: ['pending', 'partial'] },
        asset_id: { not: null },
      },
      select: {
        id: true,
        asset_id: true,
        o_asset_id: true,
        service_name: true,
        village: true,
        district: true,
        province: true,
        upload_status: true,
        uploaded_at: true,
        inspected_at: true,
      },
      orderBy: { inspected_at: 'desc' },
    });

    // Group by asset_id — show 1 card per unique asset_id
    const grouped = new Map<string, {
      ids: number[];
      asset_id: string;
      o_asset_id: string | null;
      service_name: string;
      village: string | null;
      district: string | null;
      province: string;
      upload_status: string | null;
      uploaded_at: Date | null;
      inspected_at: Date | null;
      point_count: number;
    }>();

    for (const p of points) {
      const key = p.asset_id!;
      if (!grouped.has(key)) {
        grouped.set(key, {
          ids: [p.id],
          asset_id: key,
          o_asset_id: p.o_asset_id,
          service_name: p.service_name,
          village: p.village,
          district: p.district,
          province: p.province,
          upload_status: p.upload_status,
          uploaded_at: p.uploaded_at,
          inspected_at: p.inspected_at,
          point_count: 1,
        });
      } else {
        const g = grouped.get(key)!;
        g.ids.push(p.id);
        g.point_count++;
      }
    }

    return NextResponse.json(Array.from(grouped.values()));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch pending uploads:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
