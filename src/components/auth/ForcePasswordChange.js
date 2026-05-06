"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSite } from '@/context/SiteContext';
import { updatePassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForcePasswordChange() {
    const { user, refreshUserProfile, logout } = useAuth();
    const { clearSite } = useSite();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            // 1. Update Firebase Auth password
            await updatePassword(auth.currentUser, password);

            // 2. Update Firestore flag
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                forcePasswordChange: false
            });

            // Ensure they go to site selection
            clearSite();

            setSuccess(true);
            setTimeout(() => {
                refreshUserProfile();
            }, 2000);
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/requires-recent-login') {
                setError("For security, please sign out and sign back in before changing your password.");
            } else {
                setError(err.message || "Failed to update password");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[radial-gradient(#00A3A8_1px,transparent_1px)] [background-size:20px_20px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden p-8 md:p-10">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-4">
                            <KeyRound size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-[#003135]">Update Your Password</h2>
                        <p className="text-slate-500 text-sm mt-2 font-medium">
                            This is your first login. For your security, please set a new private password to continue.
                        </p>
                    </div>

                    {success ? (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center py-8 text-emerald-600"
                        >
                            <CheckCircle2 size={48} className="mb-4" />
                            <p className="font-bold text-lg">Password Updated!</p>
                            <p className="text-sm text-slate-400">Taking you to your dashboard...</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm flex items-start gap-3">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <span className="font-bold">{error}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                    <div className="relative mt-1.5">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-medium text-[#003135]"
                                            placeholder="Min 6 characters"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003135]"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                    <div className="relative mt-1.5">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-medium text-[#003135]"
                                            placeholder="Repeat password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-[#003135] text-white rounded-[20px] font-bold shadow-xl shadow-[#003135]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : <KeyRound size={20} />}
                                    Update Password & Continue
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={logout}
                                    className="w-full py-3 text-slate-400 hover:text-rose-600 font-bold transition-colors text-sm"
                                >
                                    Cancel & Sign Out
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
