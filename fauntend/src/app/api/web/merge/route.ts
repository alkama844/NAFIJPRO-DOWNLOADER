import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function POST(req: NextRequest) {
  try {
    // Get the request body
    const body = await req.json();

    // Forward directly to backend merge endpoint
    // No signing needed - frontend calls this local route, not backend directly
    const response = await fetch(`${BACKEND_URL}/api/v1/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // If response is a stream (blob), we need to handle it specially
    if (response.headers.get('content-type')?.includes('video') ||
        response.headers.get('content-type')?.includes('audio') ||
        response.headers.get('content-disposition')) {
      // Stream the response back as-is for file downloads
      const buffer = await response.arrayBuffer();
      return new Response(buffer, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
          'Content-Disposition': response.headers.get('content-disposition') || 'attachment',
          'Content-Length': String(buffer.byteLength),
        },
      });
    }

    // For JSON responses
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error('[Merge Route] Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Merge request failed',
      },
      { status: 500 }
    );
  }
}
