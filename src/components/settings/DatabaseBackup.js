"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    Database, Download, Upload, AlertTriangle, CheckCircle, 
    RefreshCw, AlertCircle, FileJson, Play, Users, Search, X, Plus, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DatabaseBackup() {
    const { getAuthToken, user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [backupPreview, setBackupPreview] = useState(null);
    const [rawBackupData, setRawBackupData] = useState(null);
    const [confirmText, setConfirmText] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Super Admin Access Control States
    const [usersList, setUsersList] = useState([]);
    const [fetchingUsers, setFetchingUsers] = useState(false);
    const [updatingUserUid, setUpdatingUserUid] = useState(null);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch users if the current user is a Super Admin
    useEffect(() => {
        if (!currentUser?.isSuperAdmin) return;

        const fetchUsers = async () => {
            setFetchingUsers(true);
            try {
                const token = await getAuthToken();
                const res = await fetch('/api/users', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to load users');
                const data = await res.json();
                
                // Exclude the viewer and the current super admin from the list
                const filtered = data.users.filter(u => 
                    u.email !== 'viewer@hirutv.lk' && u.uid !== currentUser.uid
                );
                setUsersList(filtered);
            } catch (err) {
                console.error('Error fetching users:', err.message);
            } finally {
                setFetchingUsers(false);
            }
        };

        fetchUsers();
    }, [currentUser, getAuthToken]);

    const handleToggleAccess = async (user) => {
        setUpdatingUserUid(user.uid);
        setError(null);
        setSuccess(null);

        const currentPerms = user.permissions || {};
        const newBackupVal = !currentPerms.canBackupDatabase;

        try {
            const token = await getAuthToken();
            const res = await fetch(`/api/users/${user.uid}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    permissions: {
                        ...currentPerms,
                        canBackupDatabase: newBackupVal
                    }
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update user permission');
            }

            // Update local state
            setUsersList(prev => prev.map(u => {
                if (u.uid === user.uid) {
                    return {
                        ...u,
                        permissions: {
                            ...(u.permissions || {}),
                            canBackupDatabase: newBackupVal
                        }
                    };
                }
                return u;
            }));

            setSuccess(`Successfully updated backup access for ${user.displayName || user.email}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdatingUserUid(null);
        }
    };

    const handleDownloadBackup = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const token = await getAuthToken();
            const res = await fetch('/api/backup', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate backup');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `hirutv-inventory-backup-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setSuccess('Backup successfully created and downloaded!');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError(null);
        setSuccess(null);
        setBackupPreview(null);
        setRawBackupData(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (typeof data !== 'object' || data === null) {
                    throw new Error('Invalid JSON format');
                }

                const preview = {};
                Object.entries(data).forEach(([colName, docs]) => {
                    if (docs && typeof docs === 'object') {
                        preview[colName] = Object.keys(docs).length;
                    }
                });

                if (Object.keys(preview).length === 0) {
                    throw new Error('Backup file contains no collections');
                }

                setBackupPreview(preview);
                setRawBackupData(data);
            } catch (err) {
                setError(`Failed to parse backup file: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    const handleRestoreDatabase = async () => {
        if (!rawBackupData) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        setShowConfirmModal(false);

        try {
            const token = await getAuthToken();
            const res = await fetch('/api/backup', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(rawBackupData)
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Failed to restore database');
            }

            setSuccess('Database successfully restored! All collections updated.');
            setBackupPreview(null);
            setRawBackupData(null);
            setConfirmText('');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const isAuthorized = currentUser?.isSuperAdmin || currentUser?.permissions?.canBackupDatabase === true;

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-400">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-600">Access Restricted</h2>
                <p className="text-sm mt-1">You do not have administrative permission to manage database backups.</p>
            </div>
        );
    }

    // Get list of users who currently have access
    const activeAccessUsers = usersList.filter(u => u.permissions?.canBackupDatabase === true);

    // Filter users list based on search query for the modal
    const searchedUsers = searchQuery.trim() === '' ? [] : usersList.filter(user => 
        (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left Section: Backup & Restore Actions (Takes 2 Columns) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Header Info Panel */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-[#003135] text-lg">Database Backup & Recovery</h3>
                            <p className="text-slate-500 text-xs font-medium mt-0.5">
                                Export your database snapshot to local storage or restore from an existing JSON backup.
                            </p>
                        </div>
                    </div>

                    {/* Side-by-Side Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* Export Card */}
                        <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col justify-between min-h-[300px]">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                                        <Download size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-[#003135]">Backup Database</h4>
                                        <p className="text-xs text-slate-500 font-medium">Download JSON snapshot</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                                    Generates a file containing all database collections. Keep this file in a secure location.
                                </p>
                            </div>
                            <button
                                onClick={handleDownloadBackup}
                                disabled={loading}
                                className="w-full py-4 bg-[#003135] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#003135]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-auto"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                                DOWNLOAD JSON
                            </button>
                        </div>

                        {/* Import/Restore Card */}
                        <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col justify-between min-h-[300px]">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                                        <Upload size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-[#003135]">Restore Database</h4>
                                        <p className="text-xs text-slate-500 font-medium">Upload JSON file to restore</p>
                                    </div>
                                </div>
                                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-6 text-center transition-colors relative cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <FileJson size={28} className="text-slate-300" />
                                        <p className="text-xs font-bold">Drag and drop or click to upload</p>
                                    </div>
                                </div>
                            </div>

                            {/* Preview section */}
                            {backupPreview && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mt-4"
                                >
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">File Contents</h5>
                                    <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1">
                                        {Object.entries(backupPreview).map(([colName, count]) => (
                                            <div key={colName} className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                                                <span>{colName}</span>
                                                <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px]">{count} docs</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmModal(true)}
                                        className="w-full mt-3 py-2.5 bg-rose-600 text-white rounded-xl font-black text-xs shadow-lg shadow-rose-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Play size={12} />
                                        RESTORE DATABASE
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100"
                            >
                                <AlertCircle size={16} />
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100"
                            >
                                <CheckCircle size={16} />
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Section: Access Control & Security Notice (Takes 1 Column) */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Access Control (Super Admin only) */}
                    {currentUser?.isSuperAdmin && (
                        <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                            <div className="flex flex-col gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-[#003135] leading-tight">Access Control</h4>
                                        <p className="text-xs text-slate-500 font-medium">Manage permissions</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowAccessModal(true);
                                        setSearchQuery('');
                                    }}
                                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-600/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                                >
                                    <Plus size={14} />
                                    GIVE ACCESS
                                </button>
                            </div>

                            {fetchingUsers ? (
                                <div className="flex justify-center py-6">
                                    <RefreshCw className="animate-spin text-slate-300" size={24} />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Users</h5>
                                    {activeAccessUsers.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-4 italic bg-slate-50 border border-slate-100 rounded-xl text-center">
                                            No normal users currently have access. Super Admins always have access.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                            {activeAccessUsers.map(user => (
                                                <div key={user.uid} className="flex justify-between items-center p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 leading-tight truncate">{user.displayName || 'Unnamed User'}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{user.email}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleAccess(user)}
                                                        disabled={updatingUserUid === user.uid}
                                                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50 shrink-0"
                                                    >
                                                        {updatingUserUid === user.uid ? (
                                                            <RefreshCw className="animate-spin" size={14} />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warning card */}
                    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20 animate-pulse">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h5 className="font-black text-amber-900 text-sm mb-1 uppercase tracking-tight">Warning</h5>
                                <p className="text-xs text-amber-900/60 font-bold leading-relaxed">
                                    Restoring a backup will overwrite files and documents with identical IDs. Existing items not present in the backup will remain untouched. Perform restores with caution.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Give Access / Search User Modal */}
            {showAccessModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative"
                    >
                        <button
                            onClick={() => setShowAccessModal(false)}
                            className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Search size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[#003135]">Add User Access</h3>
                                <p className="text-xs text-slate-500 font-medium">Search for user by email or name to grant backup permissions</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Search size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users by name or email..."
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 text-sm"
                                />
                            </div>

                            <div className="mt-4 max-h-[250px] overflow-y-auto pr-1">
                                {searchQuery.trim() === '' ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <Users className="mx-auto text-slate-300 mb-2" size={32} />
                                        <p className="text-xs font-bold">Type name or email to search</p>
                                    </div>
                                ) : searchedUsers.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-8">No matching users found.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {searchedUsers.map(user => {
                                            const hasAccess = user.permissions?.canBackupDatabase === true;
                                            const isUpdating = updatingUserUid === user.uid;
                                            return (
                                                <div key={user.uid} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700">{user.displayName || 'Unnamed User'}</p>
                                                        <p className="text-[10px] text-slate-400">{user.email}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleAccess(user)}
                                                        disabled={isUpdating}
                                                        className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all flex items-center gap-1 ${
                                                            hasAccess 
                                                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10'
                                                        }`}
                                                    >
                                                        {isUpdating ? (
                                                            <RefreshCw className="animate-spin" size={10} />
                                                        ) : hasAccess ? (
                                                            'REVOKE'
                                                        ) : (
                                                            'GRANT ACCESS'
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Confirm Restore Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl relative"
                    >
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-xl font-black text-[#003135] mb-2">Are you absolutely sure?</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                            This action will overwrite data inside your database with the contents of the backup file. This cannot be undone.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Type <span className="text-rose-600 font-black">RESTORE</span> to confirm
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="RESTORE"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-rose-600 focus:bg-white transition-all font-bold text-rose-600"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowConfirmModal(false);
                                        setConfirmText('');
                                    }}
                                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="button"
                                    disabled={confirmText !== 'RESTORE' || loading}
                                    onClick={handleRestoreDatabase}
                                    className="flex-1 py-3.5 bg-rose-600 text-white rounded-xl font-black text-xs hover:bg-rose-700 transition-all disabled:opacity-50"
                                >
                                    CONFIRM RESTORE
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
