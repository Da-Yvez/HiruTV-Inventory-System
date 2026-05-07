"use client";

import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AssetLabel from './AssetLabel';

const LabelPrintModal = ({ isOpen, onClose, device }) => {
    if (!isOpen || !device) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h2 className="text-2xl font-black text-[#003135] tracking-tight">Asset Label Preview</h2>
                            <p className="text-slate-500 font-medium text-sm">Professional QR tag for {device.pcNumber}</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 hover:bg-slate-200 rounded-2xl transition-colors text-slate-400"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Preview Area */}
                    <div className="p-12 bg-slate-100 flex justify-center items-center">
                        <div className="shadow-2xl shadow-[#003135]/10 rounded-2xl overflow-hidden">
                            <AssetLabel device={device} />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-10 py-8 border-t border-slate-100 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-400">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                <Printer size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest leading-none">Ready to Print</span>
                        </div>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={onClose}
                                className="px-10 py-4 bg-[#003135] text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-[#003135]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                CLOSE PREVIEW
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LabelPrintModal;
