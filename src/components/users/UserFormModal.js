"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS, DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { X, ShieldCheck, Shield, Loader2, Eye, EyeOff } from 'lucide-react';

export default function UserFormModal({ mode, user, onClose, onSuccess }) {
    const { getAuthToken, user: currentUser } = useAuth();
    const isEdit = mode === 'edit';

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(user?.isSuperAdmin || false);
    const [isAdmin, setIsAdmin] = useState(user?.isAdmin || false);
    const [permissions, setPermissions] = useState(user?.permissions || { ...DEFAULT_PERMISSIONS });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const togglePermission = (key) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const token = await getAuthToken();

            const payload = { displayName, isAdmin, isSuperAdmin, permissions };
            if (!isEdit) {
                payload.email = email;
                payload.password = password;
            }

            const url = isEdit ? `/api/users/${user.uid}` : '/api/users';
            const method = isEdit ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            onSuccess();
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter permissions for display
    const visiblePermissions = PERMISSIONS.filter(perm => {
        // Super Admin sees everything
        if (currentUser.isSuperAdmin) return true;
        
        // Admins can only manage sites they have manage permission for
        if (perm.key.startsWith('wtc_') || perm.key === 'canAccessWTC' || perm.key === 'manage_wtc') {
            return currentUser.permissions?.manage_wtc === true;
        }
        if (perm.key.startsWith('hls_') || perm.key === 'canAccessHLS' || perm.key === 'manage_hls') {
            return currentUser.permissions?.manage_hls === true;
        }
        
        // System permissions are Super Admin only in the UI for creation
        return false;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-[#D1DDDE] px-6 py-5 flex items-center justify-between rounded-t-2xl z-10">
                    <div>
                        <h2 className="text-xl font-black text-[#003135]">
                            {isEdit ? 'Edit User' : 'Add New User'}
                        </h2>
                        <p className="text-sm text-slate-400 mt-0.5">
                            {isEdit ? `Editing ${user?.displayName}` : 'Create a new system user'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium">
                            {error}
                        </div>
                    )}

                    {/* Display Name */}
                    <div>
                        <label className="block text-xs font-bold text-[#003135] uppercase tracking-wider mb-1.5">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            required
                            placeholder="e.g. Navindra"
                            className="w-full border border-[#D1DDDE] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3A8]/40 focus:border-[#00A3A8] transition-all"
                        />
                    </div>

                    {/* Email — only on create */}
                    {!isEdit && (
                        <div>
                            <label className="block text-xs font-bold text-[#003135] uppercase tracking-wider mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="user@inventory.system"
                                className="w-full border border-[#D1DDDE] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3A8]/40 focus:border-[#00A3A8] transition-all"
                            />
                        </div>
                    )}

                    {/* Password — only on create */}
                    {!isEdit && (
                        <div>
                            <label className="block text-xs font-bold text-[#003135] uppercase tracking-wider mb-1.5">
                                Initial Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="Minimum 6 characters"
                                    className="w-full border border-[#D1DDDE] rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3A8]/40 focus:border-[#00A3A8] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Roles Toggles (Only for Super Admin) */}
                    {(currentUser.isSuperAdmin) && (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-[#003135] uppercase tracking-wider mb-1">
                                System Roles
                            </label>
                            
                            {/* Super Admin Toggle */}
                            <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-purple-600" />
                                    <div>
                                        <p className="text-sm font-bold text-purple-800">Super Administrator</p>
                                        <p className="text-xs text-purple-600">Top-level control over all users and sites</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newVal = !isSuperAdmin;
                                        setIsSuperAdmin(newVal);
                                        if (newVal) setIsAdmin(true);
                                    }}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isSuperAdmin ? 'bg-purple-500' : 'bg-slate-200'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isSuperAdmin ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {/* Admin Toggle */}
                            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-amber-600" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-800">Administrator</p>
                                        <p className="text-xs text-amber-600">Can manage users for specific sites</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={isSuperAdmin}
                                    onClick={() => {
                                        const newVal = !isAdmin;
                                        setIsAdmin(newVal);
                                        // If turning off admin, also turn off management perms
                                        if (!newVal) {
                                            setPermissions(prev => ({ 
                                                ...prev, 
                                                manage_wtc: false, 
                                                manage_hls: false 
                                            }));
                                        }
                                    }}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAdmin ? 'bg-amber-500' : 'bg-slate-200'} ${isSuperAdmin ? 'opacity-50' : ''}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isAdmin ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {/* Management Permissions (Nested under Admin) */}
                            {isAdmin && !isSuperAdmin && (
                                <div className="pl-4 border-l-2 border-amber-100 space-y-2 mt-2">
                                    {visiblePermissions.filter(p => p.key.startsWith('manage_')).map(perm => (
                                        <div key={perm.key} className="flex items-center justify-between py-1">
                                            <div>
                                                <p className="text-xs font-bold text-amber-900">{perm.label}</p>
                                                <p className="text-[10px] text-amber-600">Grants full site control</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = !permissions[perm.key];
                                                    setPermissions(prev => {
                                                        const updated = { ...prev, [perm.key]: newVal };
                                                        // Auto-assign site permissions if management is enabled
                                                        if (newVal) {
                                                            if (perm.key === 'manage_wtc') {
                                                                updated.canAccessWTC = true;
                                                                updated.wtc_canAdd = true;
                                                                updated.wtc_canEdit = true;
                                                                updated.wtc_canDelete = true;
                                                            } else if (perm.key === 'manage_hls') {
                                                                updated.canAccessHLS = true;
                                                                updated.hls_canAdd = true;
                                                                updated.hls_canEdit = true;
                                                                updated.hls_canDelete = true;
                                                            }
                                                        }
                                                        return updated;
                                                    });
                                                }}
                                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${permissions[perm.key] ? 'bg-amber-500' : 'bg-slate-200'}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${permissions[perm.key] ? 'translate-x-4' : ''}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Permissions Matrix (Non-Management) */}
                    {!isSuperAdmin && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 mt-4">
                                <Shield size={16} className="text-[#00A3A8]" />
                                <p className="text-xs font-bold text-[#003135] uppercase tracking-wider">Functional Permissions</p>
                            </div>
                            <div className="space-y-2 border border-[#D1DDDE] rounded-xl overflow-hidden">
                                {visiblePermissions.filter(p => !p.key.startsWith('manage_')).map((perm, idx, filtered) => {
                                    // Check if we should show a category header
                                    let categoryHeader = null;
                                    if (perm.key === 'canAccessWTC') categoryHeader = "WTC Site Permissions";
                                    else if (perm.key === 'canAccessHLS') categoryHeader = "Life Studio Site Permissions";
                                    else if (perm.key === 'canViewLogs') categoryHeader = "System Permissions";

                                    return (
                                        <React.Fragment key={perm.key}>
                                            {categoryHeader && (
                                                <div className="bg-slate-50 px-4 py-2 border-b border-[#D1DDDE] flex items-center gap-2 mt-2 first:mt-0">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{categoryHeader}</span>
                                                </div>
                                            )}
                                            <div
                                                className={`flex items-center justify-between px-4 py-3 ${idx !== filtered.length - 1 ? 'border-b border-[#D1DDDE]/50' : ''} hover:bg-slate-50 transition-colors`}
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-[#003135]">{perm.label}</p>
                                                    <p className="text-xs text-slate-400">{perm.description}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePermission(perm.key)}
                                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4 ${permissions[perm.key] ? 'bg-[#00A3A8]' : 'bg-slate-200'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${permissions[perm.key] ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                                {visiblePermissions.filter(p => !p.key.startsWith('manage_')).length === 0 && (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        No permissions available for you to assign.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-[#D1DDDE] text-[#003135] font-bold rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-[#003135] text-white font-bold rounded-xl hover:bg-[#004a50] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {isEdit ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
