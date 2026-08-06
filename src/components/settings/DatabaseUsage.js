"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    Cpu, RefreshCw, AlertCircle, HardDrive, Server 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DatabaseUsage() {
    const { getAuthToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [usageData, setUsageData] = useState(null);

    const fetchUsage = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getAuthToken();
            const res = await fetch('/api/db-usage', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to fetch system usage statistics');
            }

            const data = await res.json();
            setUsageData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KiB', 'MiB', 'GiB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const totalBytes = usageData?.totalBytes || 0;
    const limitBytes = usageData?.limitBytes || 1073741824; // 1 GiB
    const usagePercent = Math.min((totalBytes / limitBytes) * 100, 100);

    return (
        <div className="space-y-8">
            {/* Header & Control Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#003135] tracking-tight">System Usage</h2>
                        <p className="text-sm text-slate-500 font-medium">Track Firestore storage size and collection stats</p>
                    </div>
                </div>
                <button
                    onClick={fetchUsage}
                    disabled={loading}
                    className="self-start sm:self-center px-5 py-3 bg-[#003135] text-white rounded-2xl font-bold text-xs tracking-wide shadow-md hover:bg-[#002225] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'FETCHING...' : 'FETCH'}
                </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-5 bg-rose-50 text-rose-600 rounded-[24px] text-xs font-bold border border-rose-100 shadow-sm"
                    >
                        <AlertCircle size={20} className="shrink-0" />
                        <div>
                            <p className="font-extrabold text-[13px]">Fetch Failed</p>
                            <p className="font-medium text-slate-500 mt-0.5">{error}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Storage Quota Card */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <HardDrive size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-[#003135] leading-tight">Stored Data Space</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Spark Plan Free Tier (1 GiB Limit)</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-8 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : !usageData ? (
                    <div className="py-8 flex items-center justify-center text-xs font-bold text-slate-400">
                        Click "FETCH" to calculate storage space
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-3xl font-black text-[#003135]">{formatBytes(totalBytes)}</span>
                                <span className="text-xs font-bold text-slate-400">of {formatBytes(limitBytes)}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500">Total estimated stored size of all collections</p>
                        </div>

                        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-400">
                            <span>{usagePercent.toFixed(4)}% Used</span>
                            <span>{(100 - usagePercent).toFixed(4)}% Remaining</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Collection breakdown table */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
                        <Server size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-[#003135] leading-tight">Collection Breakdown</h4>
                        <p className="text-xs text-slate-500 font-medium">Estimated size and document count per collection</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-3 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400">Loading collection sizes...</span>
                    </div>
                ) : usageData?.report ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-wider">
                                    <th className="py-4">Collection Name</th>
                                    <th className="py-4 text-center">Document Count</th>
                                    <th className="py-4 text-right">Estimated Size</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {usageData.report.map((item) => (
                                    <tr key={item.id} className="text-sm font-bold text-slate-700 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 text-[#003135] font-extrabold">{item.id}</td>
                                        <td className="py-4 text-center text-slate-500">{item.count.toLocaleString()}</td>
                                        <td className="py-4 text-right text-slate-500">{formatBytes(item.bytes)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-slate-200 text-sm font-extrabold text-[#003135]">
                                    <td className="py-4 font-black">TOTAL DATABASE</td>
                                    <td className="py-4 text-center font-black">{usageData.totalDocs.toLocaleString()} docs</td>
                                    <td className="py-4 text-right font-black">{formatBytes(usageData.totalBytes)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-250">
                        No usage data available. Click the "FETCH" button in the top right to calculate and display.
                    </div>
                )}
            </div>
        </div>
    );
}
