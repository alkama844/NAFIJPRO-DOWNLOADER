'use client';

import { useState, useEffect } from 'react';
import { Copy, Trash2, Plus, RefreshCw } from 'lucide-react';

export default function APIKeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rate_limit_per_minute: 60,
    expire_in_days: 30,
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys');
      const data = await res.json();
      setKeys(data || []);
    } catch (error) {
      console.error('Failed to fetch keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/api-keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setNewKey(data);
        setFormData({ name: '', rate_limit_per_minute: 60, expire_in_days: 30 });
        setShowCreateForm(false);
        fetchKeys();
      }
    } catch (error) {
      console.error('Failed to create key:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Delete this API key?')) return;

    try {
      await fetch(`/api/admin/api-keys?id=${keyId}`, { method: 'DELETE' });
      fetchKeys();
    } catch (error) {
      console.error('Failed to delete key:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">API Keys for /api/v1/extract</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
        >
          <Plus size={20} /> New Key
        </button>
      </div>

      {/* New Key Display */}
      {newKey && (
        <div className="bg-green-50 border border-green-300 p-4 rounded mb-6">
          <p className="text-green-800 font-bold mb-2">⚠️ Copy this key now - it won't be shown again!</p>
          <div className="flex items-center gap-2 bg-green-100 p-3 rounded font-mono text-sm">
            <code className="flex-1">{newKey.key}</code>
            <button
              onClick={() => copyToClipboard(newKey.key)}
              className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
            >
              <Copy size={16} />
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-green-800 underline"
          >
            Close
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateKey} className="bg-gray-50 p-4 rounded mb-6 border">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Key Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border p-2 rounded"
                placeholder="e.g., My App"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rate Limit (per minute)</label>
                <input
                  type="number"
                  value={formData.rate_limit_per_minute}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) })
                  }
                  className="w-full border p-2 rounded"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expire In (days, 0 = never)</label>
                <input
                  type="number"
                  value={formData.expire_in_days}
                  onChange={(e) =>
                    setFormData({ ...formData, expire_in_days: parseInt(e.target.value) })
                  }
                  className="w-full border p-2 rounded"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Key'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* API Keys List */}
      <div className="bg-white border rounded">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Your API Keys</h2>
          <button onClick={fetchKeys} className="text-blue-600 hover:text-blue-800">
            <RefreshCw size={20} />
          </button>
        </div>

        {loading && !keys.length ? (
          <div className="p-8 text-center text-gray-500">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No API keys yet. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Key Preview</th>
                  <th className="text-left p-3">Rate Limit</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Last Used</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{key.name}</td>
                    <td className="p-3 font-mono text-sm">{key.preview}</td>
                    <td className="p-3">{key.rate_limit_per_minute}/min</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          key.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {key.enabled ? 'Active' : 'Disabled'}
                      </span>
                      {key.expire_at && key.expired && (
                        <span className="ml-2 px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-3 text-sm">{new Date(key.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-red-600 hover:text-red-800 inline-block"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage Example */}
      <div className="mt-8 bg-blue-50 border border-blue-300 p-4 rounded">
        <h3 className="font-bold mb-2">📌 How to Use:</h3>
        <p className="text-sm mb-3">Add your API key to the header when making requests:</p>
        <div className="bg-blue-100 p-3 rounded font-mono text-sm overflow-x-auto">
          <code>{`curl -X POST https://nafijpro-downloader.onrender.com/api/v1/extract \
  -H "X-API-Key: nak_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'`}</code>
        </div>
      </div>
    </div>
  );
}
