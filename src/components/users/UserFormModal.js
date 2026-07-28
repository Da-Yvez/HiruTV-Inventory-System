"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS, DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { X, ShieldCheck, Shield, Loader2, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { siteConfig } from '@/context/SiteContext';

export default function UserFormModal({ mode, user, onClose, onSuccess }) {
    const { getAuthToken, user: currentUser } = useAuth();
    const isEdit = mode === 'edit';

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [epfNumber, setEpfNumber] = useState(user?.epfNumber || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(user?.isSuperAdmin || false);
    const [isAdmin, setIsAdmin] = useState(user?.isAdmin || false);
    const [permissions, setPermissions] = useState(user?.permissions || { ...DEFAULT_PERMISSIONS });
    const [allowedDepartments, setAllowedDepartments] = useState(user?.allowedDepartments || {});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [siteDepartments, setSiteDepartments] = useState({
        wtc: siteConfig.wtc.departments,
        hls: siteConfig.hls.departments,
        hlse: siteConfig.hlse.departments
    });

    useEffect(() => {
        const fetchSiteDepts = async () => {
            const depts = { ...siteDepartments };
            for (const siteId of ['wtc', 'hls', 'hlse']) {
                try {
                    const snap = await getDoc(doc(db, 'sites', siteId));
                    if (snap.exists() && snap.data().departments) {
                        depts[siteId] = snap.data().departments;
                    }
                } catch (e) {
                    console.error(`Error fetching departments for ${siteId}:`, e);
                }
            }
            setSiteDepartments(depts);
        };
        fetchSiteDepts();
    }, []);

    const togglePermission = (key) => {
        setPermissions(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            // Clear allowedDepartments if site access is revoked
            if (key === 'canAccessWTC' && !updated.canAccessWTC) {
                setAllowedDepartments(d => ({ ...d, wtc: [] }));
            }
            if (key === 'canAccessHLS' && !updated.canAccessHLS) {
                setAllowedDepartments(d => ({ ...d, hls: [] }));
            }
            if (key === 'canAccessHLSE' && !updated.canAccessHLSE) {
                setAllowedDepartments(d => ({ ...d, hlse: [] }));
            }
            return updated;
        });
    };

    const [expandedCategories, setExpandedCategories] = useState({
        wtc: false,
        hls: false,
        hlse: false,
        system: false
    });

    const toggleCategory = (catId) => {
        setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    const getGroupedPermissions = () => {
        const wtc = [];
        const hls = [];
        const hlse = [];
        const system = [];

        visiblePermissions.filter(p => !p.key.startsWith('manage_')).forEach(perm => {
            if (perm.key.startsWith('wtc_') || perm.key === 'canAccessWTC') {
                wtc.push(perm);
            } else if (perm.key.startsWith('hls_') || perm.key === 'canAccessHLS') {
                hls.push(perm);
            } else if (perm.key.startsWith('hlse_') || perm.key === 'canAccessHLSE') {
                hlse.push(perm);
            } else {
                system.push(perm);
            }
        });

        return [
            { id: 'wtc', title: 'WTC Site Permissions', items: wtc },
            { id: 'hls', title: 'Life Studio Site Permissions', items: hls },
            { id: 'hlse', title: 'Life Studio Equipments Site Permissions', items: hlse },
            { id: 'system', title: 'System Permissions', items: system },
        ].filter(group => group.items.length > 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const token = await getAuthToken();

            const payload = { displayName, epfNumber, isAdmin, isSuperAdmin, permissions, allowedDepartments };
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
        if (perm.key.startsWith('hlse_') || perm.key === 'canAccessHLSE' || perm.key === 'manage_hlse') {
            return currentUser.permissions?.manage_hlse === true;
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

                    {/* EPF Number */}
                    <div>
                        <label className="block text-xs font-bold text-[#003135] uppercase tracking-wider mb-1.5">
                            EPF Number
                        </label>
                        <input
                            type="text"
                            value={epfNumber}
                            onChange={e => setEpfNumber(e.target.value)}
                            placeholder="e.g. 1234"
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
                                                manage_hls: false,
                                                manage_hlse: false
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
                                                            } else if (perm.key === 'manage_hlse') {
                                                                updated.canAccessHLSE = true;
                                                                updated.hlse_canAdd = true;
                                                                updated.hlse_canEdit = true;
                                                                updated.hlse_canDelete = true;
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
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mt-4">
                                <Shield size={16} className="text-[#00A3A8]" />
                                <p className="text-xs font-bold text-[#003135] uppercase tracking-wider">Functional Permissions</p>
                            </div>
                            
                            <div className="space-y-3">
                                {getGroupedPermissions().map((group) => {
                                    const isOpen = expandedCategories[group.id];
                                    const activeCount = group.items.filter(item => permissions[item.key]).length;

                                    return (
                                        <div key={group.id} className="border border-[#D1DDDE] rounded-xl overflow-hidden shadow-sm bg-white">
                                            {/* Header */}
                                            <button
                                                type="button"
                                                onClick={() => toggleCategory(group.id)}
                                                className="w-full flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-[#D1DDDE] hover:bg-slate-100 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-[#003135] uppercase tracking-wider">{group.title}</span>
                                                    {activeCount > 0 && (
                                                        <span className="bg-[#003135]/5 text-[#003135] text-[10px] px-2 py-0.5 rounded-lg font-black">
                                                            {activeCount} active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-slate-400">
                                                    {isOpen ? <ChevronDown size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
                                                </div>
                                            </button>

                                            {/* Body */}
                                            {isOpen && (
                                                <div className="divide-y divide-slate-100 bg-white">
                                                    {group.items.map((perm) => (
                                                        <div
                                                            key={perm.key}
                                                            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors"
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
                                                    ))}
                                                    {['wtc', 'hls', 'hlse'].includes(group.id) && permissions[group.id === 'wtc' ? 'canAccessWTC' : group.id === 'hls' ? 'canAccessHLS' : 'canAccessHLSE'] && (
                                                        <div className="px-4 py-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
                                                            <div>
                                                                <p className="text-xs font-bold text-[#003135] uppercase tracking-wider">
                                                                    Limit Allowed {group.id === 'hlse' ? 'Categories' : 'Departments'}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    Select which {group.id === 'hlse' ? 'categories' : 'departments'} this user can see. Leave all unselected to allow access to all.
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {siteDepartments[group.id]?.map(dept => {
                                                                    const isChecked = allowedDepartments[group.id]?.includes(dept);
                                                                    return (
                                                                        <button
                                                                            key={dept}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setAllowedDepartments(prev => {
                                                                                    const current = prev[group.id] || [];
                                                                                    const updated = current.includes(dept)
                                                                                        ? current.filter(d => d !== dept)
                                                                                        : [...current, dept];
                                                                                    return { ...prev, [group.id]: updated };
                                                                                });
                                                                            }}
                                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                                                                isChecked
                                                                                    ? 'bg-[#003135] text-white border-[#003135]'
                                                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                                            }`}
                                                                        >
                                                                            {dept}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {getGroupedPermissions().length === 0 && (
                                    <div className="p-8 text-center text-slate-400 text-sm border border-dashed border-[#D1DDDE] rounded-xl">
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
