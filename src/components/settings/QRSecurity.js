"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    QrCode, ShieldCheck, KeyRound, AlertCircle, Check, 
    RefreshCw, Eye, EyeOff, Lock, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VIEWER_EMAIL = 'viewer@hirutv.lk';

export default function QRSecurity() {
    const { getAuthToken, user: currentUser } = useAuth();
    const [viewerUser, setViewerUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchViewer = async () => {
            setLoading(true);
            try {
                const token = await getAuthToken();
                const res = await fetch('/api/users', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch user data');
                const data = await res.json();
                const viewer = data.users.find(u => u.email === VIEWER_EMAIL);
                setViewerUser(viewer);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchViewer();
    }, [getAuthToken]);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (!viewerUser) return;
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setActionLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const token = await getAuthToken();
            const res = await fetch(`/api/users/${viewerUser.uid}/reset-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    password: newPassword,
                    forcePasswordChange: false // Explicitly disable for shared viewer account
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update password');
            }

            setSuccess(true);
            setNewPassword('');
            setTimeout(() => setSuccess(false), 5000);
        } catch (e) {
            setError(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (!currentUser?.isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-400">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-600">Access Restricted</h2>
                <p className="text-sm mt-1">Only Super Administrators can manage QR security settings.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: Info Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-4">
                            <QrCode size={24} />
                        </div>
                        <h3 className="font-black text-[#003135] text-lg mb-2">QR Security</h3>
                        <p className="text-slate-500 text-xs font-medium leading-relaxed">
                            Manage the access credentials used by field staff and the public to view asset data.
                        </p>
                    </div>

                    <div className="bg-[#003135] rounded-3xl p-6 text-white shadow-xl shadow-[#003135]/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                <ShieldCheck size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
                        </div>
                        <p className="text-xs font-bold opacity-80 mb-1">Authenticated via:</p>
                        <p className="font-black text-sm mb-4">{VIEWER_EMAIL}</p>
                        <div className="h-px bg-white/10 mb-4" />
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            Gated Access Active
                        </div>
                    </div>
                </div>

                {/* Right: Management Form */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h4 className="font-black text-[#003135]">Update Access Password</h4>
                                <p className="text-xs text-slate-500 font-medium">This will immediately change the password for the viewer account</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <RefreshCw className="animate-spin text-slate-300" size={32} />
                            </div>
                        ) : (
                            <form onSubmit={handleUpdatePassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                    <div className="relative group">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003135] transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new secure password"
                                            className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135]"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003135]"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold ml-1 uppercase">Minimum 6 characters recommended</p>
                                </div>

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
                                            <Check size={16} />
                                            Password updated successfully! The public scan portal is now secured with the new password.
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button 
                                    type="submit"
                                    disabled={actionLoading || !newPassword}
                                    className="w-full py-4 bg-[#003135] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#003135]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? (
                                        <RefreshCw className="animate-spin" size={18} />
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            CONFIRM PASSWORD UPDATE
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="mt-8 p-6 bg-amber-50 rounded-[32px] border border-amber-100">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h5 className="font-black text-amber-900 text-sm mb-1 uppercase tracking-tight">Security Notice</h5>
                                <p className="text-xs text-amber-900/60 font-bold leading-relaxed">
                                    Changing this password will NOT log out existing users who are currently viewing asset data. 
                                    However, any new scans or expired sessions will require the new password.
                                    The "Force Password Change" flag is disabled for this account to facilitate shared access.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
