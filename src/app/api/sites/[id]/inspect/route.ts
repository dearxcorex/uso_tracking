import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inspectUpdate, parseInspectBody, parseSiteId } from '@/lib/inspect';

/** Set a site's inspection status: body `{ inspected: boolean }` */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const siteId = parseSiteId((await params).id);
    if (siteId === null) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const inspected = parseInspectBody(await request.json().catch(() => null));
    if (inspected === null) {
      return NextResponse.json({ error: 'Body must be { inspected: boolean }' }, { status: 400 });
    }

    const updated = await prisma.visit_plan.updateMany({
      where: { id: siteId },
      data: inspectUpdate(inspected),
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const site = await prisma.visit_plan.findUniqueOrThrow({
      where: { id: siteId },
      select: { id: true, inspected: true, inspected_at: true },
    });
    return NextResponse.json({ id: site.id, inspected: site.inspected, inspectedAt: site.inspected_at?.toISOString() ?? null });
  } catch (error) {
    console.error('PATCH /api/sites/[id]/inspect failed:', error);
    return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 });
  }
}
