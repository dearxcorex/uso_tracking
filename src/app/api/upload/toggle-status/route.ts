import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeUploadToggle, validateToggleRequest } from '@/lib/upload-utils';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateToggleRequest(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { ids } = validation;

    // Get current status from first point
    const point = await prisma.uso_service_point.findFirst({
      where: { id: { in: ids } },
      select: { upload_status: true },
    });

    if (!point) {
      return NextResponse.json({ error: 'Service point not found' }, { status: 404 });
    }

    const toggle = computeUploadToggle(point.upload_status);

    await prisma.uso_service_point.updateMany({
      where: { id: { in: ids } },
      data: {
        upload_status: toggle.upload_status,
        uploaded_at: toggle.uploaded_at,
      },
    });

    return NextResponse.json({
      upload_status: toggle.upload_status,
      uploaded_at: toggle.uploaded_at,
    });
  } catch (error) {
    console.error('Toggle upload status failed:', error);
    return NextResponse.json({ error: 'Toggle upload status failed' }, { status: 500 });
  }
}
