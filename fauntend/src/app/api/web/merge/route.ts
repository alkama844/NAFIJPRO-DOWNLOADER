import { NextRequest } from 'next/server';
import { generateWebSignature } from '../_internal/signature';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nafijpro-downloader.onrender.com';
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
