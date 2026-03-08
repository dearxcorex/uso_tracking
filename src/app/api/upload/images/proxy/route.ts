import { NextRequest, NextResponse } from 'next/server';

/**
 * Image proxy — fetches images from external MinIO server-side to bypass CORS.
 * GET /api/upload/images/proxy?url=<encoded-minio-url>
 *
 * Only allows URLs from the known MinIO host (34.126.174.195:9000).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  // Security: only proxy from our known MinIO host
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== '34.126.174.195' || parsed.port !== '9000') {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
