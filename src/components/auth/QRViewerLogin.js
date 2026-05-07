"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Key, AlertCircle, ShieldCheck } from 'lucide-react';

const VIEWER_EMAIL = "viewer@hirutv.lk";

const QRViewerLogin = ({ onSuccess }) => {
    const { login } = useAuth();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(VIEWER_EMAIL, password);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            setError('Incorrect password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Brand Logo */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-slate-200/50 flex items-center justify-center overflow-hidden mb-4 border border-slate-100">
                        <img src="/logo.jpg" alt="Hiru TV" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-black text-[#003135] tracking-tight">Public Asset Scan</h1>
                    <p className="text-slate-500 font-medium text-sm">Protected by Hiru TV IT Security</p>
                </div>

                <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 p-8 border border-slate-100">
                    <div className="flex items-center gap-3 mb-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Authentication Required</p>
                            <p className="text-xs font-bold text-emerald-800/60">Enter password to view asset data</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access Password</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003135] transition-colors">
                                    <Key size={18} />
                                </div>
                                <input 
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135]"
                                />
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="flex items-center gap-2 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100"
                                >
                                    <AlertCircle size={14} />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-[#003135] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#003135]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    UNLOCK ASSET DATA
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-12 text-center space-y-4">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Hiru TV Inventory System</p>
                    <div className="opacity-40 hover:opacity-100 transition-opacity">
                        <a 
                            href="https://yvexa.dev" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]"
                        >
                            Powered by YVEXA
                        </a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default QRViewerLogin;
