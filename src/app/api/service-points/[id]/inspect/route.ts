import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pointId = parseInt(id);
    if (isNaN(pointId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const current = await prisma.uso_service_point.findUnique({
      where: { id: pointId },
      select: { inspected: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Service point not found' }, { status: 404 });
    }

    const newInspected = !current.inspected;
    const updated = await prisma.uso_service_point.update({
      where: { id: pointId },
      data: {
        inspected: newInspected,
        inspected_at: newInspected ? new Date() : null,
      },
      select: {
        id: true,
        inspected: true,
        inspected_at: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to toggle inspection:', error);
    return NextResponse.json({ error: 'Failed to toggle inspection' }, { status: 500 });
  }
}
