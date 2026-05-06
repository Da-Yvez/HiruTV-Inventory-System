"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { 
    Users, Plus, Pencil, Trash2, KeyRound, 
    ShieldCheck, Shield, RefreshCw, Copy, Check,
    Mail, AlertCircle, X, ChevronDown
} from 'lucide-react';
import UserFormModal from './UserFormModal';

export default function UserManagement() {
    const { getAuthToken } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalState, setModalState] = useState({ open: false, mode: 'create', user: null });
    const [deleteConfirm, setDeleteConfirm] = useState(null); // uid of user pending delete
    const [resetResult, setResetResult] = useState(null); // { email, link }
    const [copiedLink, setCopiedLink] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // uid of user being actioned

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getAuthToken();
            const res = await fetch('/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load users');
            const { users } = await res.json();
            setUsers(users);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [getAuthToken]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleDelete = async (uid) => {
        setActionLoading(uid);
        try {
            const token = await getAuthToken();
            const res = await fetch(`/api/users/${uid}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setDeleteConfirm(null);
            fetchUsers();
        } catch (e) {
            setError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleResetPassword = async (uid) => {
        setActionLoading(uid);
        try {
            const token = await getAuthToken();
            const res = await fetch(`/api/users/${uid}/reset-password`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResetResult({ email: data.email, link: data.resetLink });
        } catch (e) {
            setError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(resetResult.link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const permissionSummary = (permissions = {}) => {
        return PERMISSIONS.filter(p => permissions[p.key]).map(p => p.label);
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-[#003135] tracking-tight flex items-center gap-3">
                        <Users size={30} className="text-[#00A3A8]" />
                        User Management
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Create and manage system users with per-user permissions
                    </p>
                </div>
                <button
                    onClick={() => setModalState({ open: true, mode: 'create', user: null })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#003135] text-white rounded-xl font-bold hover:bg-[#004a50] transition-colors shadow-lg shadow-[#003135]/20"
                >
                    <Plus size={18} />
                    Add User
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="font-medium text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Reset Password Result */}
            {resetResult && (
                <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-[#003135] flex items-center gap-2">
                            <KeyRound size={16} className="text-[#00A3A8]" />
                            Password Reset Link for {resetResult.email}
                        </p>
                        <button onClick={() => setResetResult(null)}>
                            <X size={16} className="text-slate-400 hover:text-slate-600" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Share this link with the user — it expires after 1 hour.</p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white border border-teal-200 rounded-lg px-3 py-2 text-xs text-slate-700 overflow-x-auto whitespace-nowrap block">
                            {resetResult.link}
                        </code>
                        <button
                            onClick={copyLink}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#003135] text-white rounded-lg text-xs font-bold transition-all"
                        >
                            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                            {copiedLink ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-[#D1DDDE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-[#003135]/20 border-t-[#003135] rounded-full animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Users size={40} className="mb-3 opacity-40" />
                        <p className="font-semibold">No users yet</p>
                        <p className="text-sm">Click "Add User" to create the first one.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#D1DDDE] bg-[#F0F5F5]">
                                <th className="text-left px-6 py-4 font-bold text-[#003135] text-xs uppercase tracking-wider">User</th>
                                <th className="text-left px-6 py-4 font-bold text-[#003135] text-xs uppercase tracking-wider">Role</th>
                                <th className="text-left px-6 py-4 font-bold text-[#003135] text-xs uppercase tracking-wider">Permissions</th>
                                <th className="text-right px-6 py-4 font-bold text-[#003135] text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D1DDDE]/50">
                            {users.map(u => (
                                <tr key={u.uid} className="hover:bg-[#F8FAFA] transition-colors">
                                    {/* User cell */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003135] to-[#00A3A8] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                {u.displayName?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#003135]">{u.displayName}</p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Mail size={10} /> {u.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Role cell */}
                                    <td className="px-6 py-4">
                                        {u.isAdmin ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold">
                                                <ShieldCheck size={12} />
                                                Administrator
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold">
                                                <Shield size={12} />
                                                Operator
                                            </span>
                                        )}
                                    </td>

                                    {/* Permissions cell */}
                                    <td className="px-6 py-4">
                                        {u.isAdmin ? (
                                            <span className="text-xs text-slate-400 italic">Full access</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {permissionSummary(u.permissions).slice(0, 4).map(label => (
                                                    <span key={label} className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-md text-xs font-medium">
                                                        {label}
                                                    </span>
                                                ))}
                                                {permissionSummary(u.permissions).length > 4 && (
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">
                                                        +{permissionSummary(u.permissions).length - 4} more
                                                    </span>
                                                )}
                                                {permissionSummary(u.permissions).length === 0 && (
                                                    <span className="text-xs text-slate-400 italic">No permissions</span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Actions cell */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Reset password */}
                                            <button
                                                onClick={() => handleResetPassword(u.uid)}
                                                disabled={actionLoading === u.uid}
                                                title="Reset Password"
                                                className="p-2 text-slate-400 hover:text-[#00A3A8] hover:bg-teal-50 rounded-lg transition-all"
                                            >
                                                {actionLoading === u.uid ? (
                                                    <RefreshCw size={16} className="animate-spin" />
                                                ) : (
                                                    <KeyRound size={16} />
                                                )}
                                            </button>

                                            {/* Edit */}
                                            <button
                                                onClick={() => setModalState({ open: true, mode: 'edit', user: u })}
                                                title="Edit User"
                                                className="p-2 text-slate-400 hover:text-[#003135] hover:bg-slate-100 rounded-lg transition-all"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            {/* Delete */}
                                            {deleteConfirm === u.uid ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-red-600 font-semibold">Sure?</span>
                                                    <button
                                                        onClick={() => handleDelete(u.uid)}
                                                        disabled={actionLoading === u.uid}
                                                        className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all"
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(u.uid)}
                                                    title="Delete User"
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Refresh */}
            <div className="mt-4 flex justify-end">
                <button onClick={fetchUsers} className="text-xs text-slate-400 hover:text-[#003135] flex items-center gap-1.5 transition-colors">
                    <RefreshCw size={12} />
                    Refresh
                </button>
            </div>

            {/* Modal */}
            {modalState.open && (
                <UserFormModal
                    mode={modalState.mode}
                    user={modalState.user}
                    onClose={() => setModalState({ open: false, mode: 'create', user: null })}
                    onSuccess={() => {
                        setModalState({ open: false, mode: 'create', user: null });
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
}
