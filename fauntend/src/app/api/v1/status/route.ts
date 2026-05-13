/**
 * GET /api/v1/status
 * Returns platform status and maintenance mode info
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nafijpro-downloader-s3rj.onrender.com';

interface PlatformStatus {
  id: string;
  name: string;
  enabled: boolean;
  status: 'active' | 'maintenance' | 'offline';
}

interface StatusResponse {
  success: boolean;
  data: {
    maintenance: boolean;
    maintenanceType: 'off' | 'api' | 'all' | 'full';
    maintenanceMessage: string | null;
    platforms: PlatformStatus[];
  };
}

async function getBackendStatus(): Promise<PlatformStatus[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      // Extract platforms if available
      if (data?.platforms && Array.isArray(data.platforms)) {
        return data.platforms;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch backend status:', error);
  }

  // Return default platforms if backend is unreachable
  return [
    { id: 'tiktok', name: 'TikTok', enabled: true, status: 'active' },
    { id: 'instagram', name: 'Instagram', enabled: true, status: 'active' },
    { id: 'facebook', name: 'Facebook', enabled: true, status: 'active' },
    { id: 'twitter', name: 'Twitter', enabled: true, status: 'active' },
    { id: 'youtube', name: 'YouTube', enabled: true, status: 'active' },
    { id: 'reddit', name: 'Reddit', enabled: true, status: 'active' },
  ];
}

export async function GET(): Promise<Response> {
  try {
    const platforms = await getBackendStatus();

    const response: StatusResponse = {
      success: true,
      data: {
        maintenance: false,
        maintenanceType: 'off',
        maintenanceMessage: null,
        platforms,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60, s-maxage=60',
      },
    });
  } catch (error) {
    console.error('Status API error:', error);

    const response: StatusResponse = {
      success: true,
      data: {
        maintenance: false,
        maintenanceType: 'off',
        maintenanceMessage: null,
        platforms: [
          { id: 'tiktok', name: 'TikTok', enabled: true, status: 'active' },
          { id: 'instagram', name: 'Instagram', enabled: true, status: 'active' },
          { id: 'facebook', name: 'Facebook', enabled: true, status: 'active' },
          { id: 'twitter', name: 'Twitter', enabled: true, status: 'active' },
          { id: 'youtube', name: 'YouTube', enabled: true, status: 'active' },
          { id: 'reddit', name: 'Reddit', enabled: true, status: 'active' },
        ],
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
