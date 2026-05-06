"use client";

import React from 'react';
import { useSite } from '@/context/SiteContext';
import { motion } from 'framer-motion';
import { Building2, Globe, ArrowRight } from 'lucide-react';

import { GLSLHills } from '@/components/glsl-hills';

const SiteSelection = () => {
    const { selectSite, siteConfig } = useSite();

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
                    {Object.values(siteConfig).map((site) => (
                        <motion.div
                            key={site.id}
                            variants={item}
                            whileHover={{ scale: 1.02, y: -8 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectSite(site.id)}
                            className="relative group cursor-pointer"
                        >
                            {/* Card Glow */}
                            <div className="absolute -inset-px rounded-[40px] bg-gradient-to-br from-orange-500/30 to-red-600/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl transition-all duration-300">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/5 rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-500" />
                                
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mb-8 text-white shadow-lg shadow-orange-500/20 transform group-hover:rotate-6 transition-transform duration-300">
                                        {site.icon === 'Building2' ? <Building2 size={38} /> : <Globe size={38} />}
                                    </div>
                                    
                                    <h3 className="text-4xl font-black text-white mb-3 group-hover:text-orange-400 transition-colors">{site.name}</h3>
                                    <p className="text-white/40 text-lg mb-10 h-14 font-medium leading-relaxed">{site.fullName}</p>
                                    
                                    <div className="flex items-center gap-3 text-orange-400 font-black tracking-wider uppercase text-sm group-hover:gap-6 transition-all">
                                        Enter Site <ArrowRight size={20} strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
                
                <p className="mt-16 text-center text-white/20 text-xs font-bold tracking-widest uppercase">
                    Hiru TV Network Management System
                </p>
            </div>
        </div>
    );
};

export default SiteSelection;
