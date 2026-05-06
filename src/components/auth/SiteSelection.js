"use client";

import React from 'react';
import { useSite } from '@/context/SiteContext';
import { motion } from 'framer-motion';
import { Building2, Globe, ArrowRight } from 'lucide-react';

const SiteSelection = () => {
    const { selectSite, siteConfig } = useSite();

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003135] to-[#00474A] p-6">
            <div className="w-full max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl font-bold text-white mb-4">Select Workspace</h1>
                    <p className="text-emerald-100/70 text-lg">Choose a site to manage inventory and logs</p>
                </motion.div>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                    {Object.values(siteConfig).map((site) => (
                        <motion.div
                            key={site.id}
                            variants={item}
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectSite(site.id)}
                            className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 cursor-pointer shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00A3A8]/5 rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform" />
                            
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-[#003135]/5 rounded-2xl flex items-center justify-center mb-6 text-[#003135] group-hover:bg-[#003135] group-hover:text-white transition-colors duration-300">
                                    {site.icon === 'Building2' ? <Building2 size={32} /> : <Globe size={32} />}
                                </div>
                                
                                <h3 className="text-3xl font-bold text-[#003135] mb-2">{site.name}</h3>
                                <p className="text-slate-500 mb-8 h-12">{site.fullName}</p>
                                
                                <div className="flex items-center gap-2 text-[#00A3A8] font-bold group-hover:gap-4 transition-all">
                                    Open Dashboard <ArrowRight size={20} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default SiteSelection;
