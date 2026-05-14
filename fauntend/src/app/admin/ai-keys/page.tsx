'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../layout';
import { Plus, RefreshCw, AlertCircle, CheckCircle, Clock, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import useSWR from 'swr';

interface APIKey {
    id: string;
    provider: 'groq' | 'openai' | 'gemini' | 'claude' | 'azure';
    model: string;
    priority_order: number;
    enabled: boolean;
    status: 'active' | 'testing' | 'error' | 'disabled';
    last_tested_at?: string;
    last_error?: string;
    error_count: number;
    success_count: number;
    created_at: string;
    updated_at: string;
    key_preview?: string; // First 8 + last 4 chars: "gsk_***abc"
}

interface ProviderStatus {
    name: string;
    is_available: boolean;
    last_error?: string;
    rate_limit_remaining: number;
    rate_limit_reset?: string;
    failure_count: number;
    last_success_time?: string;
}

interface StatsData {
    total_keys: number;
    active_keys: number;
    total_usage: number;
    providers: Record<string, ProviderStatus>;
}

export default function AIKeysPage() {
    const { adminFetch, canAccess } = useAdmin();
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [filterProvider, setFilterProvider] = useState<string>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    // Fetch stats
    const { data: stats, mutate: mutateStats } = useSWR<StatsData>(
        '/api/admin/ai-keys/stats',
        (url) => adminFetch(url).then(r => r.json()),
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    // Fetch all keys
    const { data: keys = [], mutate: mutateKeys } = useSWR<APIKey[]>(
        '/api/admin/ai-keys',
        (url) => adminFetch(url).then(r => r.json()),
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    if (!canAccess('admin')) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-red-900">Access Denied</h3>
                        <p className="text-sm text-red-800">You need admin access to manage API keys.</p>
                    </div>
                </div>
            </div>
        );
    }

    const handleRefresh = async () => {
        await mutateStats();
        await mutateKeys();
    };

    const handleCopyKey = (id: string, preview: string) => {
        navigator.clipboard.writeText(preview);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleReveal = (id: string) => {
        const newSet = new Set(revealedKeys);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setRevealedKeys(newSet);
    };

    const handleDeleteKey = async (id: string) => {
        try {
            const response = await adminFetch(`/api/admin/ai-keys/${id}`, { method: 'DELETE' });
            if (response.ok) {
                mutateKeys();
                mutateStats();
                setDeleteConfirmId(null);
            }
        } catch (error) {
            console.error('Failed to delete key:', error);
        }
    };

    const filteredKeys = filterProvider === 'all'
        ? keys
        : keys.filter(k => k.provider === filterProvider);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">AI API Keys</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage API keys for Groq and other AI providers</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Key
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <StatsCard
                        label="Total Keys"
                        value={stats.total_keys}
                        icon={<Clock className="w-5 h-5" />}
                    />
                    <StatsCard
                        label="Active Keys"
                        value={stats.active_keys}
                        icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                    />
                    <StatsCard
                        label="Total Usage"
                        value={`${stats.total_usage}`}
                        icon={<RefreshCw className="w-5 h-5" />}
                    />
                    <StatsCard
                        label="Providers"
                        value={Object.keys(stats.providers).length}
                        icon={<AlertCircle className="w-5 h-5" />}
                    />
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by Provider:</label>
                <select
                    value={filterProvider}
                    onChange={(e) => setFilterProvider(e.target.value)}
                    className="px-3 py-1 rounded border border-gray-300 text-sm"
                >
                    <option value="all">All Providers</option>
                    <option value="groq">Groq (Primary)</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="claude">Claude</option>
                    <option value="azure">Azure</option>
                </select>
            </div>

            {/* Keys List */}
            <div className="space-y-3">
                {(filteredKeys ?? []).length === 0 ? (
                    <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-600">
                        No API keys configured yet. Add one to get started.
                    </div>
                ) : (
                    (filteredKeys ?? []).map(key => (
                        <KeyCard
                            key={key.id}
                            keyData={key}
                            isRevealed={revealedKeys.has(key.id)}
                            onReveal={() => toggleReveal(key.id)}
                            onCopy={() => handleCopyKey(key.id, key.key_preview || '')}
                            onDelete={() => setDeleteConfirmId(key.id)}
                            isCopied={copiedId === key.id}
                            showDeleteConfirm={deleteConfirmId === key.id}
                            onConfirmDelete={() => handleDeleteKey(key.id)}
                            onCancelDelete={() => setDeleteConfirmId(null)}
                        />
                    ))
                )}
            </div>

            {/* Add Key Modal */}
            {showAddModal && (
                <AddKeyModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        mutateKeys();
                        mutateStats();
                    }}
                    adminFetch={adminFetch}
                />
            )}
        </div>
    );
}

function StatsCard({ label, value, icon }: { label: string; value: any; icon: React.ReactNode }) {
    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className="text-gray-400">{icon}</div>
            </div>
        </div>
    );
}

function KeyCard({
    keyData,
    isRevealed,
    onReveal,
    onCopy,
    onDelete,
    isCopied,
    showDeleteConfirm,
    onConfirmDelete,
    onCancelDelete,
}: {
    keyData: APIKey;
    isRevealed: boolean;
    onReveal: () => void;
    onCopy: () => void;
    onDelete: () => void;
    isCopied: boolean;
    showDeleteConfirm: boolean;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
}) {
    const providerColors: Record<string, string> = {
        groq: 'bg-blue-100 text-blue-800 border-blue-300',
        openai: 'bg-green-100 text-green-800 border-green-300',
        gemini: 'bg-purple-100 text-purple-800 border-purple-300',
        claude: 'bg-orange-100 text-orange-800 border-orange-300',
        azure: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    };

    const statusIcons: Record<string, React.ReactNode> = {
        active: <CheckCircle className="w-4 h-4 text-green-600" />,
        testing: <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />,
        error: <AlertCircle className="w-4 h-4 text-red-600" />,
        disabled: <Clock className="w-4 h-4 text-gray-600" />,
    };

    return (
        <div className={`p-4 bg-white border rounded-lg transition ${showDeleteConfirm ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${providerColors[keyData.provider]}`}>
                            {keyData.provider.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{keyData.model}</span>
                        <div className="flex items-center gap-1 text-gray-600">
                            {statusIcons[keyData.status]}
                            <span className="text-xs capitalize">{keyData.status}</span>
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-600">API Key</p>
                            <div className="mt-1 flex items-center gap-2">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                                    {isRevealed ? keyData.key_preview : '••••••••••••'}
                                </code>
                                <button
                                    onClick={onReveal}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title={isRevealed ? 'Hide' : 'Show'}
                                >
                                    {isRevealed ? (
                                        <EyeOff className="w-4 h-4 text-gray-600" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-gray-600" />
                                    )}
                                </button>
                                <button
                                    onClick={onCopy}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title="Copy"
                                >
                                    <Copy className="w-4 h-4 text-gray-600" />
                                </button>
                                {isCopied && <span className="text-xs text-green-600">Copied!</span>}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-gray-600">Priority</p>
                            <p className="text-lg font-bold mt-1">{keyData.priority_order}</p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-600">Success Rate</p>
                            <p className="text-sm mt-1">
                                {keyData.success_count + keyData.error_count === 0
                                    ? 'N/A'
                                    : `${Math.round((keyData.success_count / (keyData.success_count + keyData.error_count)) * 100)}%`}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-600">Last Tested</p>
                            <p className="text-sm mt-1 text-gray-600">
                                {keyData.last_tested_at ? new Date(keyData.last_tested_at).toLocaleDateString() : 'Never'}
                            </p>
                        </div>
                    </div>

                    {keyData.last_error && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            {keyData.last_error}
                        </div>
                    )}
                </div>

                <div className="ml-4 flex flex-col gap-2">
                    <button
                        onClick={onDelete}
                        className="p-2 hover:bg-red-100 rounded text-red-600 transition"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded flex items-center justify-between">
                    <span className="text-sm text-red-900">Permanently delete this API key?</span>
                    <div className="flex gap-2">
                        <button
                            onClick={onConfirmDelete}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition"
                        >
                            Delete
                        </button>
                        <button
                            onClick={onCancelDelete}
                            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function AddKeyModal({
    onClose,
    onSuccess,
    adminFetch,
}: {
    onClose: () => void;
    onSuccess: () => void;
    adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
}) {
    const [provider, setProvider] = useState<'groq' | 'openai' | 'gemini' | 'claude' | 'azure'>('groq');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('llama-3.1-70b-versatile');
    const [priority, setPriority] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const modelsByProvider: Record<string, string[]> = {
        groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
        openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        gemini: ['gemini-pro', 'gemini-pro-vision'],
        claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        azure: ['gpt-4-deployment', 'gpt-35-turbo-deployment'],
    };

    const handleAddKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await adminFetch('/api/admin/ai-keys', {
                method: 'POST',
                body: JSON.stringify({
                    provider,
                    api_key: apiKey,
                    model,
                    priority_order: priority,
                    enabled: true,
                }),
            });

            if (response.ok) {
                onSuccess();
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                setError(errorData.message || 'Failed to add API key');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add API key');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestKey = async () => {
        setTestResult(null);
        setIsLoading(true);

        try {
            const response = await adminFetch('/api/admin/ai-keys/test', {
                method: 'POST',
                body: JSON.stringify({
                    provider,
                    api_key: apiKey,
                    model,
                }),
            });

            const data = await response.json();
            setTestResult({
                success: response.ok,
                message: data.message || (response.ok ? 'Key is valid' : 'Key validation failed'),
            });
        } catch (err) {
            setTestResult({
                success: false,
                message: err instanceof Error ? err.message : 'Test failed',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4">Add API Key</h2>

                <form onSubmit={handleAddKey} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    {testResult && (
                        <div className={`p-3 rounded text-sm ${testResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                            {testResult.message}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => {
                                setProvider(e.target.value as any);
                                setModel(modelsByProvider[e.target.value][0]);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="groq">Groq (Recommended)</option>
                            <option value="openai">OpenAI</option>
                            <option value="gemini">Gemini</option>
                            <option value="claude">Claude</option>
                            <option value="azure">Azure</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                        <div className="flex gap-2">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="p-2 hover:bg-gray-100 rounded"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {modelsByProvider[provider]?.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority Order (1-5)</label>
                        <input
                            type="number"
                            min="1"
                            max="5"
                            value={priority}
                            onChange={(e) => setPriority(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleTestKey}
                            disabled={!apiKey || isLoading}
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg disabled:opacity-50 transition"
                        >
                            Test Key
                        </button>
                        <button
                            type="submit"
                            disabled={!apiKey || isLoading}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition"
                        >
                            {isLoading ? 'Loading...' : 'Add Key'}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition"
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
}
