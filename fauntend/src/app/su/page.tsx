'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Users, Gift, LogOut, Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Swal from 'sweetalert2';

type Tab = 'login' | 'users' | 'referrals';
type User = {
  id: string;
  email: string;
  username?: string;
  role: string;
  created_at: string;
  is_banned?: boolean;
  ban_reason?: string;
};
type Referral = {
  id: number;
  code: string;
  role: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
};

// Helper to convert errors to readable strings
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const err = error as any;

    // Try message property first
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }

    // Try error property
    if (err.error && typeof err.error === 'string') {
      return err.error;
    }

    // Try data.error (API response structure)
    if (err.data?.error && typeof err.data.error === 'string') {
      return err.data.error;
    }

    // Try status text
    if (err.statusText && typeof err.statusText === 'string') {
      return err.statusText;
    }

    // Last resort: check if it looks like JSON
    try {
      const str = JSON.stringify(err);
      if (str && str !== '{}' && !str.includes('[object Object]')) {
        return str.substring(0, 150);
      }
    } catch {}
  }
  return 'An unknown error occurred';
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('login');
  const [password, setPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);

  // Referrals state
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [refPage, setRefPage] = useState(1);
  const [refTotal, setRefTotal] = useState(0);

  // Edit states
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [editingReferral, setEditingReferral] = useState<Partial<Referral> | null>(null);
  const [newReferral, setNewReferral] = useState({ code: '', role: 'user', max_uses: '0' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Verify password by making a dummy API request
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${password}` },
      });

      if (response.ok) {
        setAdminToken(password);
        setTab('users');
        setPassword('');
        await loadUsers(1);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Password',
          text: 'The password you entered is incorrect.',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to verify password',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async (page: number) => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setUserTotal(data.pagination?.total || 0);
        setUserPage(page);
      } else {
        console.error('Failed to load users:', data.error);
        Swal.fire({
          icon: 'error',
          title: 'Failed to Load Users',
          text: data.error || 'Could not load users',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          timer: 3000,
        });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getErrorMessage(error),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        timer: 3000,
      });
    }
  };

  const loadReferrals = async (page: number) => {
    try {
      const res = await fetch(`/api/admin/referrals?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setReferrals(data.data);
        setRefTotal(data.pagination?.total || 0);
        setRefPage(page);
      } else {
        console.error('Failed to load referrals:', data.error);
        Swal.fire({
          icon: 'error',
          title: 'Failed to Load Referrals',
          text: data.error || 'Could not load referrals',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          timer: 3000,
        });
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getErrorMessage(error),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        timer: 3000,
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser?.id) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingUser),
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'User Updated',
          text: 'User details updated successfully',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          timer: 2000,
        });
        setEditingUser(null);
        await loadUsers(userPage);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getErrorMessage(error),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete User?',
      text: `Are you sure you want to delete ${email}? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'User Deleted',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          timer: 2000,
        });
        await loadUsers(userPage);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getErrorMessage(error),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReferral = async () => {
    if (!newReferral.code.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Code',
        text: 'Please enter a referral code',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: newReferral.code,
          role: newReferral.role,
          max_uses: parseInt(newReferral.max_uses),
        }),
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Referral Created',
          text: `Code ${newReferral.code} created successfully`,
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          timer: 2000,
        });
        setNewReferral({ code: '', role: 'user', max_uses: '0' });
        await loadReferrals(refPage);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getErrorMessage(error),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReferral = async () => {
    if (!editingReferral?.id) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/referrals/${editingReferral.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingReferral),
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Referral Updated',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          timer: 2000,
        });
        setEditingReferral(null);
        await loadReferrals(refPage);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getErrorMessage(error),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReferral = async (refId: number, code: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Referral?',
      text: `Delete referral code ${code}? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/referrals/${refId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Referral Deleted',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          timer: 2000,
        });
        await loadReferrals(refPage);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getErrorMessage(error),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAdminToken('');
    setTab('login');
    setUsers([]);
    setReferrals([]);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-[var(--accent-primary)]" />
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Admin Panel</h1>
          </div>
          {adminToken && (
            <Button
              variant="secondary"
              onClick={logout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Logout
            </Button>
          )}
        </div>

        {/* Login Form */}
        {!adminToken ? (
          <div className="glass-card p-8 max-w-md mx-auto">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password && !isLoading) {
                      handleLogin(e as unknown as React.FormEvent);
                    }
                  }}
                  className="input-url w-full"
                  placeholder="Enter admin password"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !password}
              >
                {isLoading ? 'Verifying...' : 'Access Dashboard'}
              </Button>
            </form>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-[var(--border-color)]">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setTab('users'); loadUsers(1); }}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                  tab === 'users'
                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Users className="w-4 h-4" /> Users
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setTab('referrals'); loadReferrals(1); }}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                  tab === 'referrals'
                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Gift className="w-4 h-4" /> Referrals
              </button>
            </div>

            {/* Users Tab */}
            {tab === 'users' && (
              <div className="space-y-4">
                {editingUser ? (
                  <div className="glass-card p-6">
                    <h2 className="text-xl font-bold mb-4">Edit User</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Email</label>
                        <input
                          type="email"
                          value={editingUser.email || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="input-url w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Username</label>
                        <input
                          type="text"
                          value={editingUser.username || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="input-url w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Role</label>
                        <select
                          value={editingUser.role || 'user'}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                          className="input-url w-full"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Ban User</label>
                        <select
                          value={editingUser.is_banned ? 'true' : 'false'}
                          onChange={(e) => setEditingUser({ ...editingUser, is_banned: e.target.value === 'true' })}
                          className="input-url w-full"
                        >
                          <option value="false">Not Banned</option>
                          <option value="true">Banned</option>
                        </select>
                      </div>
                      {editingUser.is_banned && (
                        <div>
                          <label className="block text-sm text-[var(--text-secondary)] mb-2">Ban Reason</label>
                          <input
                            type="text"
                            value={editingUser.ban_reason || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, ban_reason: e.target.value })}
                            className="input-url w-full"
                            placeholder="Reason for ban"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateUser} disabled={isLoading}>Save Changes</Button>
                        <Button variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg-secondary)]">
                          <tr>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Email</th>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Username</th>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Role</th>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Status</th>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Created</th>
                            <th className="px-4 py-3 text-right text-[var(--text-secondary)]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-t border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/50 transition">
                              <td className="px-4 py-3">{user.email}</td>
                              <td className="px-4 py-3">{user.username || '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.role === 'admin'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {user.is_banned ? (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                    Banned
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                                {new Date(user.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingUser(user)}
                                    className="p-1 hover:bg-[var(--bg-secondary)] rounded transition"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4 text-[var(--accent-primary)]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                    className="p-1 hover:bg-[var(--bg-secondary)] rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {users.length === 0 && (
                      <div className="p-8 text-center text-[var(--text-muted)]">
                        No users found
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {!editingUser && userTotal > 20 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => loadUsers(userPage - 1)}
                      disabled={userPage === 1}
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-[var(--text-secondary)]">
                      Page {userPage} of {Math.ceil(userTotal / 20)}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => loadUsers(userPage + 1)}
                      disabled={userPage >= Math.ceil(userTotal / 20)}
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Referrals Tab */}
            {tab === 'referrals' && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Create New Referral
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      value={newReferral.code}
                      onChange={(e) => setNewReferral({ ...newReferral, code: e.target.value.toUpperCase() })}
                      className="input-url"
                      placeholder="Code (e.g., NAFIJ26)"
                      maxLength={20}
                    />
                    <select
                      value={newReferral.role}
                      onChange={(e) => setNewReferral({ ...newReferral, role: e.target.value })}
                      className="input-url"
                    >
                      <option value="user">User Role</option>
                      <option value="admin">Admin Role</option>
                    </select>
                    <input
                      type="number"
                      value={newReferral.max_uses}
                      onChange={(e) => setNewReferral({ ...newReferral, max_uses: e.target.value })}
                      className="input-url"
                      placeholder="Max Uses (0=unlimited)"
                      min="0"
                    />
                    <Button onClick={handleCreateReferral} disabled={isLoading || !newReferral.code}>
                      Create
                    </Button>
                  </div>
                </div>

                {/* Referrals List */}
                {editingReferral ? (
                  <div className="glass-card p-6">
                    <h2 className="text-xl font-bold mb-4">Edit Referral</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Code</label>
                        <input type="text" value={editingReferral.code || ''} disabled className="input-url w-full opacity-50" />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Role</label>
                        <select
                          value={editingReferral.role || 'user'}
                          onChange={(e) => setEditingReferral({ ...editingReferral, role: e.target.value })}
                          className="input-url w-full"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Max Uses</label>
                        <input
                          type="number"
                          value={editingReferral.max_uses || 0}
                          onChange={(e) => setEditingReferral({ ...editingReferral, max_uses: parseInt(e.target.value) })}
                          className="input-url w-full"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Current Uses</label>
                        <input
                          type="number"
                          value={editingReferral.current_uses || 0}
                          onChange={(e) => setEditingReferral({ ...editingReferral, current_uses: parseInt(e.target.value) })}
                          className="input-url w-full"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Active</label>
                        <select
                          value={editingReferral.is_active ? 'true' : 'false'}
                          onChange={(e) => setEditingReferral({ ...editingReferral, is_active: e.target.value === 'true' })}
                          className="input-url w-full"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Expires At (Optional)</label>
                        <input
                          type="date"
                          value={editingReferral.expires_at ? editingReferral.expires_at.split('T')[0] : ''}
                          onChange={(e) => setEditingReferral({ ...editingReferral, expires_at: e.target.value })}
                          className="input-url w-full"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateReferral} disabled={isLoading}>Save Changes</Button>
                        <Button variant="secondary" onClick={() => setEditingReferral(null)}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg-secondary)]">
                          <tr>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Code</th>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Role</th>
                            <th className="px-4 py-3 text-center text-[var(--text-secondary)]">Uses</th>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Status</th>
                            <th className="px-4 py-3 text-left text-[var(--text-secondary)]">Expires</th>
                            <th className="px-4 py-3 text-right text-[var(--text-secondary)]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {referrals.map((ref) => (
                            <tr key={ref.id} className="border-t border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/50 transition">
                              <td className="px-4 py-3 font-mono font-bold text-[var(--accent-primary)]">{ref.code}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  ref.role === 'admin'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {ref.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {ref.current_uses} / {ref.max_uses === 0 ? '∞' : ref.max_uses}
                              </td>
                              <td className="px-4 py-3">
                                {ref.is_active ? (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                                    Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                                {ref.expires_at ? new Date(ref.expires_at).toLocaleDateString() : 'Never'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingReferral(ref)}
                                    className="p-1 hover:bg-[var(--bg-secondary)] rounded transition"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4 text-[var(--accent-primary)]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReferral(ref.id, ref.code)}
                                    className="p-1 hover:bg-[var(--bg-secondary)] rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {referrals.length === 0 && (
                      <div className="p-8 text-center text-[var(--text-muted)]">
                        No referral codes found
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {!editingReferral && refTotal > 20 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => loadReferrals(refPage - 1)}
                      disabled={refPage === 1}
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-[var(--text-secondary)]">
                      Page {refPage} of {Math.ceil(refTotal / 20)}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => loadReferrals(refPage + 1)}
                      disabled={refPage >= Math.ceil(refTotal / 20)}
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
