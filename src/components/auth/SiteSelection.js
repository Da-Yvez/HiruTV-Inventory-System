"use client";

import React from 'react';
import { useSite } from '@/context/SiteContext';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { motion } from 'framer-motion';
import { Building2, Globe, ArrowRight, Lock } from 'lucide-react';

import { GLSLHills } from '@/components/glsl-hills';

const SiteSelection = ({ onOpenSettings }) => {
    const { selectSite, siteConfig } = useSite();
    const { user } = useAuth();

    // Map site ID -> permission key
    const sitePermKey = { wtc: 'canAccessWTC', hls: 'canAccessHLS' };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        show: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center p-6">
            {/* ── Animated Hills Background ── */}
            <div className="absolute inset-0 z-0">
                <GLSLHills speed={0.4} cameraZ={140} />
            </div>

            {/* ── Dark overlay for readability ── */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] z-1" />

            <div className="relative z-10 w-full max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-5xl font-black tracking-tight text-white mb-4">
                        <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 bg-clip-text text-transparent">
                            Select Workspace
                        </span>
                    </h1>
                    <p className="text-white/50 text-lg font-medium">Choose a site to manage inventory and logs</p>
                </motion.div>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 gap-10"
                >
                    {Object.values(siteConfig).map((site) => {
                        const permKey = sitePermKey[site.id];
                        const canAccess = hasPermission(user, permKey);

                        return (
                        <motion.div
                            key={site.id}
                            variants={item}
                            whileHover={canAccess ? { scale: 1.02, y: -8 } : {}}
                            whileTap={canAccess ? { scale: 0.98 } : {}}
                            onClick={() => canAccess && selectSite(site.id)}
                            className={`relative group ${canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                        >
                            {/* Card Glow — only for accessible sites */}
                            {canAccess && (
                                <div className="absolute -inset-px rounded-[40px] bg-gradient-to-br from-orange-500/30 to-red-600/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            )}
                            
                            <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl transition-all duration-300">
                                {canAccess && (
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/5 rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-500" />
                                )}
                                
                                <div className="relative z-10">
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 text-white shadow-lg transition-transform duration-300 ${canAccess ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/20 group-hover:rotate-6' : 'bg-white/10'}`}>
                                        {canAccess
                                            ? (site.icon === 'Building2' ? <Building2 size={38} /> : <Globe size={38} />)
                                            : <Lock size={32} />}
                                    </div>
                                    
                                    <h3 className={`text-4xl font-black mb-3 transition-colors ${canAccess ? 'text-white group-hover:text-orange-400' : 'text-white/50'}`}>{site.name}</h3>
                                    <p className="text-white/40 text-lg mb-10 h-14 font-medium leading-relaxed">{site.fullName}</p>
                                    
                                    <div className={`flex items-center gap-3 font-black tracking-wider uppercase text-sm transition-all ${canAccess ? 'text-orange-400 group-hover:gap-6' : 'text-white/20'}`}>
                                        {canAccess ? (
                                            <>Enter Site <ArrowRight size={20} strokeWidth={3} /></>
                                        ) : (
                                            <>No Access <Lock size={16} /></>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        );
                    })}
                </motion.div>
                
                {(user?.isAdmin || user?.isSuperAdmin) && (
                    <motion.div
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="mt-12 flex justify-center"
                    >
                        <button 
                            onClick={onOpenSettings}
                            className="flex items-center gap-3 px-10 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[32px] border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                        >
                            <Lock className="text-orange-400 group-hover:rotate-12 transition-transform" size={20} />
                            <span className="font-black tracking-widest uppercase text-sm">System Settings</span>
                            <ArrowRight size={18} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </button>
                    </motion.div>
                )}
                
                <div className="mt-16 text-center space-y-2">
                    <p className="text-white/20 text-xs font-bold tracking-widest uppercase">
                        Hiru TV Inventory Management System
                    </p>
                    <p className="text-white/10 text-[10px] font-bold tracking-widest uppercase">
                        Powered by <a href="https://yvexa.dev" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500/50 transition-colors">YVEXA</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SiteSelection;
