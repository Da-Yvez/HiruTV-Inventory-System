"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

import { PERMISSIONS } from '@/lib/permissions';
import { 
    Sparkles, Plus, Edit2, Trash2, Eye, EyeOff, Check, X, AlertCircle, Calendar, Users, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WhatsNewManagement() {
    const { getAuthToken, user: currentUser } = useAuth();
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    
    // Form states
    const [editingId, setEditingId] = useState(null);
    const [headline, setHeadline] = useState('');
    const [description, setDescription] = useState('');
    const [targetPermissions, setTargetPermissions] = useState([]);
    const [isActive, setIsActive] = useState(true);
    
    // For local UI preview
    const [previewMsg, setPreviewMsg] = useState(null);

    const fetchAnnouncements = async () => {
        try {
            const token = await getAuthToken();
            const res = await fetch('/api/whats-new', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch announcements");
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (e) {
            console.error("Error fetching messages:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = await getAuthToken();
            const res = await fetch('/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (e) {
            console.error("Error fetching users:", e);
        }
    };

    useEffect(() => {
        if (!currentUser?.isSuperAdmin) return;
        fetchAnnouncements();
        fetchUsers();
    }, [currentUser]);

    const openCreateModal = () => {
        setEditingId(null);
        setHeadline('');
        setDescription('');
        setTargetPermissions([]);
        setIsActive(true);
        setModalOpen(true);
    };

    const openEditModal = (msg) => {
        setEditingId(msg.id);
        setHeadline(msg.headline || '');
        setDescription(msg.description || '');
        setTargetPermissions(msg.targetPermissions || []);
        setIsActive(msg.active !== false);
        setModalOpen(true);
    };

    const handlePermissionToggle = (permKey) => {
        if (permKey === 'all') {
            if (targetPermissions.includes('all')) {
                setTargetPermissions([]);
            } else {
                setTargetPermissions(['all']);
            }
            return;
        }

        // Remove 'all' if selecting specific perms
        let updated = targetPermissions.filter(p => p !== 'all');
        if (updated.includes(permKey)) {
            updated = updated.filter(p => p !== permKey);
        } else {
            updated.push(permKey);
        }
        setTargetPermissions(updated);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!headline || !description) return;

        const payload = {
            headline,
            description,
            targetPermissions: targetPermissions.length === 0 ? ['all'] : targetPermissions,
            active: isActive,
        };

        try {
            const token = await getAuthToken();
            const url = editingId ? `/api/whats-new/${editingId}` : '/api/whats-new';
            const method = editingId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save announcement');
            }

            setModalOpen(false);
            fetchAnnouncements();
        } catch (error) {
            console.error("Failed to save what's new message:", error);
            alert("Error saving message: " + error.message);
        }
    };

    const handleToggleActive = async (msg) => {
        try {
            const token = await getAuthToken();
            const res = await fetch(`/api/whats-new/${msg.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ active: !msg.active })
            });

            if (!res.ok) throw new Error("Failed to toggle active state");
            fetchAnnouncements();
        } catch (error) {
            console.error("Failed to toggle active state:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            const token = await getAuthToken();
            const res = await fetch(`/api/whats-new/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Failed to delete announcement");
            fetchAnnouncements();
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    };

    const showPreview = (msg) => {
        setPreviewMsg(msg);
        setPreviewOpen(true);
    };

    if (!currentUser?.isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-400">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-600">Access Restricted</h2>
                <p className="text-sm mt-1">Only Super Administrators can manage system announcements.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h3 className="font-black text-[#003135] text-2xl tracking-tight">What's New Announcements</h3>
                    <p className="text-slate-500 text-sm font-medium">
                        Push live updates, news, and notifications to specific user groups when they log in.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-6 py-3 bg-[#003135] text-white font-bold rounded-2xl shadow-xl shadow-[#003135]/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm shrink-0"
                >
                    <Plus size={18} strokeWidth={2.5} />
                    CREATE ANNOUNCEMENT
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 bg-white rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
                </div>
            ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[32px] border border-slate-200 shadow-sm text-center text-slate-400">
                    <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mb-4">
                        <Sparkles size={28} />
                    </div>
                    <h4 className="font-bold text-slate-600 text-lg">No Announcements Created</h4>
                    <p className="text-sm max-w-sm mt-1">Create announcements to notify operators and users about features, changes or general alerts.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id}
                            className={`bg-white rounded-[32px] border transition-all p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6 ${
                                msg.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50/50 opacity-75'
                            }`}
                        >
                            <div className="space-y-3 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                                        msg.active 
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}>
                                        {msg.active ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                                        <Calendar size={12} />
                                        {msg.createdAt?.seconds 
                                            ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
                                            : 'Drafting'}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-bold">
                                        by {msg.createdBy || 'System'}
                                    </span>
                                    {(() => {
                                        const usersWhoSaw = users.filter(u => u.seenWhatsNew?.includes(msg.id));
                                        return (
                                            <span className="text-[11px] font-bold text-slate-400 hover:text-[#003135] cursor-pointer relative group flex items-center gap-1.5 ml-auto border border-slate-100 bg-slate-50 px-2 py-0.5 rounded-lg select-none">
                                                <Eye size={12} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                                                Seen by {usersWhoSaw.length}
                                                {usersWhoSaw.length > 0 && (
                                                    <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-slate-900/95 text-white text-[10px] py-1.5 px-3 rounded-xl whitespace-nowrap shadow-xl z-30 font-medium border border-white/5">
                                                        {usersWhoSaw.map(u => u.displayName).join(', ')}
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div>
                                    <h4 className="text-lg font-black text-[#003135]">{msg.headline}</h4>
                                    <p className="text-slate-600 text-sm mt-1.5 leading-relaxed whitespace-pre-line font-medium">
                                        {msg.description}
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Users size={12} />
                                        Target Audience
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(!msg.targetPermissions || msg.targetPermissions.includes('all')) ? (
                                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs">
                                                All Users
                                            </span>
                                        ) : (
                                            msg.targetPermissions.map(pKey => {
                                                const targetOptions = [
                                                    { key: 'role_admin', label: 'Role: Administrator', description: 'Target users with Administrator role (isAdmin == true)' },
                                                    { key: 'role_superadmin', label: 'Role: Super Administrator', description: 'Target users with Super Administrator role (isSuperAdmin == true)' },
                                                    ...PERMISSIONS
                                                ];
                                                const found = targetOptions.find(p => p.key === pKey);
                                                return (
                                                    <span key={pKey} className="px-2.5 py-0.5 bg-teal-50 text-teal-700 font-bold rounded-lg text-[11px] border border-teal-100">
                                                        {found ? found.label : pKey}
                                                    </span>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex md:flex-col justify-end items-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => showPreview(msg)}
                                        title="Preview Dialog"
                                        className="p-2.5 text-slate-500 hover:text-[#003135] hover:bg-slate-100 rounded-xl transition-all"
                                    >
                                        <Monitor size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(msg)}
                                        title={msg.active ? "Deactivate" : "Activate"}
                                        className={`p-2.5 rounded-xl transition-all ${
                                            msg.active 
                                                ? 'text-amber-500 hover:bg-amber-50' 
                                                : 'text-emerald-500 hover:bg-emerald-50'
                                        }`}
                                    >
                                        {msg.active ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                    <button
                                        onClick={() => openEditModal(msg)}
                                        title="Edit Announcement"
                                        className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        title="Delete Announcement"
                                        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h4 className="font-black text-[#003135] text-lg">
                                        {editingId ? 'Edit Announcement' : 'Create Announcement'}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Compose headline, message details, and target users</p>
                                </div>
                                <button 
                                    onClick={() => setModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Headline</label>
                                    <input 
                                        type="text"
                                        required
                                        value={headline}
                                        onChange={(e) => setHeadline(e.target.value)}
                                        placeholder="e.g. Introducing the New Stores In & Out Feature!"
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                    <textarea 
                                        required
                                        rows={5}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Provide detailed description of what's new. Explain new controls, workflows or system enhancements."
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-medium text-slate-700 leading-relaxed"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Users (By Permission)</label>
                                        <button
                                            type="button"
                                            onClick={() => handlePermissionToggle('all')}
                                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${
                                                targetPermissions.includes('all') || targetPermissions.length === 0
                                                    ? 'bg-[#003135] text-white border-transparent'
                                                    : 'bg-slate-50 text-[#5A6C6D] border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            Show to All Users
                                        </button>
                                    </div>
                                    
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl max-h-48 overflow-y-auto space-y-2.5">
                                        {(() => {
                                            const targetOptions = [
                                                { key: 'role_admin', label: 'Role: Administrator', description: 'Target users with Administrator role (isAdmin == true)' },
                                                { key: 'role_superadmin', label: 'Role: Super Administrator', description: 'Target users with Super Administrator role (isSuperAdmin == true)' },
                                                ...PERMISSIONS
                                            ];
                                            return targetOptions.map((perm) => {
                                                const isSelected = targetPermissions.includes(perm.key);
                                                const isDisabled = targetPermissions.includes('all');
                                                return (
                                                    <label 
                                                        key={perm.key} 
                                                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all select-none cursor-pointer ${
                                                            isDisabled
                                                                ? 'opacity-40 cursor-not-allowed bg-transparent border-transparent'
                                                                : isSelected
                                                                    ? 'bg-white border-[#003135] shadow-sm'
                                                                    : 'bg-white/50 border-transparent hover:bg-white'
                                                        }`}
                                                    >
                                                        <input 
                                                            type="checkbox"
                                                            disabled={isDisabled}
                                                            checked={isSelected && !isDisabled}
                                                            onChange={() => handlePermissionToggle(perm.key)}
                                                            className="mt-0.5 rounded text-[#003135] focus:ring-[#003135] cursor-pointer"
                                                        />
                                                        <div>
                                                            <p className="text-xs font-bold text-[#003135]">{perm.label}</p>
                                                            <p className="text-[10px] text-slate-400 font-semibold">{perm.description}</p>
                                                        </div>
                                                    </label>
                                                );
                                            });
                                        })()}
                                    </div>
                                    {targetPermissions.includes('all') && (
                                        <p className="text-[10px] text-slate-400 font-bold ml-1 uppercase">Note: "Show to All Users" overrides specific permission filters.</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-4 bg-[#F0F5F5] rounded-2xl">
                                    <div>
                                        <h5 className="text-xs font-black text-[#003135] uppercase tracking-tight">Active Immediately</h5>
                                        <p className="text-[10px] text-slate-500 font-semibold">If unchecked, this will be saved as a draft.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsActive(!isActive)}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${isActive ? 'bg-[#003135]' : 'bg-slate-300'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isActive ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button 
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="flex-1 py-3.5 bg-slate-100 text-[#5A6C6D] hover:bg-slate-200 rounded-2xl font-bold text-sm transition-all"
                                    >
                                        CANCEL
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 py-3.5 bg-[#003135] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#003135]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} strokeWidth={2.5} />
                                        {editingId ? 'UPDATE ANNOUNCEMENT' : 'PUBLISH ANNOUNCEMENT'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Dialog Preview */}
            <AnimatePresence>
                {previewOpen && previewMsg && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-gradient-to-b from-white to-[#F8FAFA] rounded-[36px] border border-white max-w-md w-full shadow-2xl p-8 relative overflow-hidden text-center"
                        >
                            {/* Top glowing orange line */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-red-500" />
                            
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-orange-500/20">
                                <Sparkles size={30} className="animate-pulse" />
                            </div>

                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">What's New</span>
                            <h4 className="text-xl font-black text-[#003135] mt-2 mb-4 leading-tight">{previewMsg.headline}</h4>
                            
                            <div className="bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-5 mb-6 max-h-60 overflow-y-auto text-left">
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                                    {previewMsg.description}
                                </p>
                            </div>

                            <button
                                onClick={() => setPreviewOpen(false)}
                                className="w-full py-4 bg-[#003135] text-white hover:text-orange-300 rounded-2xl font-black text-sm shadow-xl shadow-[#003135]/25 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider"
                            >
                                Got it, thanks!
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
