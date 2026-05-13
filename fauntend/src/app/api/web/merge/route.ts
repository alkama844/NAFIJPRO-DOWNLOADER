import { NextRequest } from 'next/server';
import { generateWebSignature } from '../_internal/signature';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nafijpro-downloader-s3rj.onrender.com';
const WEB_INTERNAL_SHARED_SECRET = process.env.WEB_INTERNAL_SHARED_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    // Get the request body
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    // Get Origin header from incoming request
    const originHeader = req.headers.get('origin') || req.headers.get('referer') || '';
    const origin = originHeader ? new URL(originHeader).origin : '';

    // Generate signature for backend
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Origin header for backend validation
    if (origin) {
      headers['Origin'] = origin;
    }

    if (WEB_INTERNAL_SHARED_SECRET) {
      // Sign request using WEB_INTERNAL_SHARED_SECRET
      const { signature, timestamp, nonce } = generateWebSignature(
        'POST',
        '/api/web/merge',
        WEB_INTERNAL_SHARED_SECRET,
        bodyText
      );

      headers['X-Downaria-Signature'] = signature;
      headers['X-Downaria-Timestamp'] = timestamp;
      headers['X-Downaria-Nonce'] = nonce;
    }

    // Forward to backend merge endpoint with signature
    const response = await fetch(`${BACKEND_URL}/api/web/merge`, {
      method: 'POST',
      headers,
      body: bodyText,
    });

    const contentType = response.headers.get('content-type');
    const isStreamResponse = contentType?.includes('video') ||
                           contentType?.includes('audio') ||
                           contentType?.includes('application/octet-stream') ||
                           response.headers.has('content-disposition');

    if (isStreamResponse) {
      // Stream the response back as-is for file downloads
      const buffer = await response.arrayBuffer();
      return new Response(buffer, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="audio.mp4"',
          'Content-Length': String(buffer.byteLength),
        },
      });
    }

    // For JSON responses (errors)
    let jsonData;
    try {
      jsonData = await response.json();
    } catch {
      // If JSON parsing fails, return the raw text as error
      const text = await response.text();
      return Response.json(
        { error: text || 'Unknown error from server' },
        { status: response.status || 500 }
      );
    }
    return Response.json(jsonData, { status: response.status });
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
