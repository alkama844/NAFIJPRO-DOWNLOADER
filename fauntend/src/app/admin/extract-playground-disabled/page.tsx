'use client';

import { useState } from 'react';
import { Play, Copy, Download } from 'lucide-react';

export default function ExtractPlaygroundPage() {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const handleTest = async () => {
    if (!url) {
      setError('URL is required');
      return;
    }

    if (!apiKey) {
      setError('API Key is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const startTime = Date.now();

      const res = await fetch('/api/v1/extract', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const responseTime = Date.now() - startTime;

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Error: ${res.status}`);
      } else {
        setResponse(data);
        setStats({
          statusCode: res.status,
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toLocaleString(),
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to make request');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">API Playground</h1>
      <p className="text-gray-600 mb-6">Test the /api/v1/extract endpoint</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Section */}
        <div className="bg-white border rounded p-4">
          <h2 className="text-xl font-bold mb-4">Request</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">API Key *</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="nak_..."
                className="w-full border p-2 rounded font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Get a key from /admin/api-keys</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">URL *</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/video"
                className="w-full border p-2 rounded"
              />
            </div>

            <button
              onClick={handleTest}
              disabled={loading || !url || !apiKey}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play size={20} /> {loading ? 'Testing...' : 'Test Extract'}
            </button>
          </div>

          {/* Request Code */}
          <div className="mt-6 p-3 bg-gray-50 rounded">
            <p className="text-xs font-bold text-gray-700 mb-2">cURL Command:</p>
            <div className="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto">
              <code>{`curl -X POST ${process.env.NEXT_PUBLIC_API_URL}/api/v1/extract \\
  -H "X-API-Key: ${apiKey || 'YOUR_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"${url || 'https://example.com'}"}'`}</code>
            </div>
          </div>
        </div>

        {/* Response Section */}
        <div className="bg-white border rounded p-4">
          <h2 className="text-xl font-bold mb-4">Response</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
              <div className="bg-blue-50 p-2 rounded">
                <p className="text-gray-600">Status</p>
                <p className="font-bold">{stats.statusCode}</p>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <p className="text-gray-600">Response Time</p>
                <p className="font-bold">{stats.responseTime}</p>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <p className="text-gray-600">Time</p>
                <p className="font-bold text-xs">{stats.timestamp}</p>
              </div>
            </div>
          )}

          {response ? (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold">JSON Response:</label>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>

              {response.video_url && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs font-bold mb-2">Preview:</p>
                  <video controls className="w-full rounded" style={{ maxHeight: '300px' }}>
                    <source src={response.video_url} />
                  </video>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">Response will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Documentation */}
      <div className="mt-8 bg-gray-50 border rounded p-4">
        <h3 className="font-bold mb-3">📚 API Endpoint Documentation</h3>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-bold">Endpoint:</span> POST /api/v1/extract
          </p>
          <p>
            <span className="font-bold">Authentication:</span> Header: X-API-Key
          </p>
          <p>
            <span className="font-bold">Rate Limit:</span> Depends on your key settings (e.g., 60/min)
          </p>
          <p>
            <span className="font-bold">Request Body:</span>
          </p>
          <div className="bg-white p-2 rounded font-mono text-xs overflow-x-auto">
            <code>{`{ "url": "https://example.com" }`}</code>
          </div>
          <p>
            <span className="font-bold">Response:</span>
          </p>
          <div className="bg-white p-2 rounded font-mono text-xs overflow-x-auto">
            <code>{`{
  "title": "...",
  "video_url": "...",
  "quality": "720p",
  "duration": 3600,
  ...
}`}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
