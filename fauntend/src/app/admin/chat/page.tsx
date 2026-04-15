'use client';

/**
 * ISSUE 6.1 - NOT IMPLEMENTED
 *
 * This page is currently DISABLED and hidden from navigation.
 *
 * Problem: The page is completely non-functional with only hardcoded mock data:
 * - All provider data is hardcoded (no backend integration)
 * - Copy buttons copy mock strings instead of real data
 * - Settings buttons don't actually save or persist anything
 * - Usage stats are fake values
 *
 * Decision: Given time constraints and that chat is not a critical feature,
 * this page was removed from navigation rather than building a backend.
 *
 * To restore:
 * 1. Implement real backend endpoints for chat provider management
 * 2. Create database schema for storing chat configurations
 * 3. Update this page to use real API calls via hooks
 * 4. Re-add the navigation link in admin/layout.tsx
 *
 * The page remains in the codebase for future implementation.
 * Users can still access it manually by navigating to /admin/chat
 */

import { useState } from 'react';
import { MessageCircle, Settings, Key, Zap, AlertCircle, Check, Copy } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';
import { AdminCard } from '@/components/admin';

const PROVIDERS = [
    {
        id: 'groq',
        name: 'Groq',
        icon: '⚡',
        color: 'text-blue-400',
        description: 'Fast LLM inference',
        models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
        status: 'active'
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        icon: '🔮',
        color: 'text-purple-400',
        description: 'Multimodal AI',
        models: ['gemini-2.5-flash', 'gemini-flash-latest'],
        status: 'active'
    },
    {
        id: 'openai',
        name: 'OpenAI',
        icon: '🤖',
        color: 'text-green-400',
        description: 'GPT-5 and GPT-4',
        models: ['gpt-5', 'gpt-4-turbo'],
        status: 'inactive'
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        icon: '🧠',
        color: 'text-orange-400',
        description: 'Claude models',
        models: ['claude-3-opus', 'claude-3-sonnet'],
        status: 'inactive'
    }
];

export default function ChatAdminPage() {
    return (
        <AdminGuard requiredRole="admin">
            <ChatAdminContent />
        </AdminGuard>
    );
}

function ChatAdminContent() {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedProvider, setExpandedProvider] = useState<string>('groq');

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-purple-400" />
                        Chat API Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Configure and manage AI chat providers</p>
                </div>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {PROVIDERS.map(provider => (
                    <AdminCard key={provider.id}>
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{provider.icon}</span>
                                    <div>
                                        <h3 className="font-bold">{provider.name}</h3>
                                        <p className="text-xs text-gray-400">{provider.description}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    provider.status === 'active'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                    {provider.status === 'active' ? '✓ Active' : 'Inactive'}
                                </span>
                            </div>

                            {/* API Key Section */}
                            <div className="pt-3 border-t border-gray-700">
                                <label className="text-xs font-medium text-gray-400 block mb-2">API Key</label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        defaultValue="sk_test_•••••••••••••••••"
                                        className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm font-mono"
                                        readOnly
                                    />
                                    <button
                                        onClick={() => copyToClipboard('sk_test_key', `key-${provider.id}`)}
                                        className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                                        title="Copy API key"
                                    >
                                        {copiedId === `key-${provider.id}` ? (
                                            <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                                {provider.status === 'active' && (
                                    <p className="text-xs text-green-400 mt-1">✓ Connected & Working</p>
                                )}
                            </div>

                            {/* Models */}
                            <div className="pt-3 border-t border-gray-700">
                                <label className="text-xs font-medium text-gray-400 block mb-2">Available Models</label>
                                <div className="space-y-1">
                                    {provider.models.map(model => (
                                        <div key={model} className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/50">
                                            <Zap className="w-3 h-3 text-yellow-400" />
                                            <span className="text-xs font-mono">{model}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="pt-3 border-t border-gray-700 flex gap-2">
                                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-sm transition-colors">
                                    <Settings className="w-4 h-4" />
                                    Configure
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm transition-colors">
                                    <Key className="w-4 h-4" />
                                    Update Key
                                </button>
                            </div>
                        </div>
                    </AdminCard>
                ))}
            </div>

            {/* Chat Configuration */}
            <AdminCard>
                <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Global Chat Settings
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Default Model */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Default Model</label>
                            <select className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm">
                                <option>groq-llama-3.1-70b</option>
                                <option>groq-llama-3.1-8b</option>
                                <option>gemini-2.5-flash</option>
                                <option>gpt-5</option>
                            </select>
                        </div>

                        {/* Max Tokens */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Max Tokens per Request</label>
                            <input
                                type="number"
                                defaultValue="4096"
                                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                            />
                        </div>

                        {/* Temperature */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Temperature (0.0 - 1.0)</label>
                            <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                defaultValue="0.7"
                                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                            />
                        </div>

                        {/* Timeout */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Request Timeout (seconds)</label>
                            <input
                                type="number"
                                defaultValue="30"
                                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                            />
                        </div>
                    </div>

                    <button className="w-full px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors">
                        Save Settings
                    </button>
                </div>
            </AdminCard>

            {/* Usage Stats */}
            <AdminCard>
                <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Chat Usage Statistics
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Requests', value: '12,543', color: 'blue' },
                            { label: 'Groq Requests', value: '8,234', color: 'cyan' },
                            { label: 'Failure Rate', value: '0.8%', color: 'green' },
                            { label: 'Avg Response', value: '1.2s', color: 'purple' }
                        ].map((stat, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-gray-900/50">
                                <p className="text-xs text-gray-400">{stat.label}</p>
                                <p className={`text-lg font-bold mt-1 text-${stat.color}-400`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </AdminCard>

            {/* Information */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Chat API Configuration Guide</p>
                    <ul className="text-xs space-y-1 text-blue-200">
                        <li>✓ Groq is configured and active for fast inference</li>
                        <li>✓ All providers support session management automatically</li>
                        <li>✓ Fallback to secondary provider if primary fails</li>
                        <li>✓ Rate limits enforced per API key and provider</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
