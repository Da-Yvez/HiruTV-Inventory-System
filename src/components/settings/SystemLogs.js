"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    Search, 
    Shield, 
    RefreshCcw, 
    User,
    Calendar,
    Activity,
    Lock,
    UserPlus,
    UserMinus,
    Key,
    Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SystemLogs = () => {
    const { getAuthToken } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) {
                console.warn('[SystemLogs] No auth token available.');
                setLoading(false);
                return;
            }

            // Fetch only system-wide logs
            const res = await fetch(
                `/api/logs?collection=systemLogs&limit=200`,
                { 
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store'
                }
            );

            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('[SystemLogs] API error:', errData.error || 'Unknown error');
            }
        } catch (error) {
            console.error('[SystemLogs] Fetch error:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [getAuthToken]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            (log.action?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.details?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.user?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return matchesSearch;
    });

    const getLogType = (action) => {
        const a = action?.toLowerCase() || '';
        if (a.includes('user') && a.includes('created')) return { icon: <UserPlus size={14} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
        if (a.includes('user') && (a.includes('delete') || a.includes('remove'))) return { icon: <UserMinus size={14} />, color: 'text-rose-600 bg-rose-50 border-rose-100' };
        if (a.includes('password')) return { icon: <Key size={14} />, color: 'text-amber-600 bg-amber-50 border-amber-100' };
        if (a.includes('login')) return { icon: <Lock size={14} />, color: 'text-blue-600 bg-blue-50 border-blue-100' };
        if (a.includes('maintenance') || a.includes('clear')) return { icon: <Database size={14} />, color: 'text-slate-600 bg-slate-50 border-slate-100' };
        return { icon: <Activity size={14} />, color: 'text-slate-600 bg-slate-50 border-slate-100' };
    };

    const formatTimestamp = (ts) => {
        if (!ts) return 'N/A';
        const ms = typeof ts === 'number' ? ts : (ts.seconds ? ts.seconds * 1000 : null);
        return ms ? new Date(ms).toLocaleString() : 'N/A';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <RefreshCcw className="animate-spin mb-4 text-[#00A3A8]" size={32} />
                <p className="font-bold text-[#00A3A8] tracking-wide uppercase text-xs">Syncing system logs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 text-[#003135] rounded-2xl flex items-center justify-center">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-[#003135] tracking-tight">System Audit Trail</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-60">Global Administrative Logs</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Search audit trail..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135]"
                        />
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center justify-center w-12 h-12 bg-white hover:bg-[#003135] text-slate-500 hover:text-white rounded-2xl border border-slate-200 transition-all shadow-sm"
                        title="Refresh audit trail"
                    >
                        <RefreshCcw size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Event Type</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Audit Details</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Initiated By</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <AnimatePresence>
                                {filteredLogs.map((log) => {
                                    const type = getLogType(log.action);
                                    return (
                                        <motion.tr 
                                            key={log.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-slate-50/30 transition-colors"
                                        >
                                            <td className="px-8 py-5">
                                                <div className={`
                                                    inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border
                                                    ${type.color}
                                                `}>
                                                    {type.icon}
                                                    {log.action}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-sm text-slate-600 font-bold leading-relaxed max-w-lg">
                                                    {log.details}
                                                </p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-[#003135] text-white rounded-lg flex items-center justify-center font-black text-[10px]">
                                                        {log.user?.[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-black text-slate-700 tracking-tight">{log.user}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Calendar size={12} />
                                                        {formatTimestamp(log.timestamp).split(',')[0]}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-300 mt-1">
                                                        {formatTimestamp(log.timestamp).split(',')[1]}
                                                    </span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredLogs.length === 0 && (
                    <div className="py-24 text-center text-slate-300">
                        <div className="mb-6 flex justify-center opacity-10"><Shield size={80} /></div>
                        <p className="text-xl font-black uppercase tracking-widest opacity-50">Empty Audit Trail</p>
                        <p className="text-xs font-bold mt-2 opacity-40">No system actions have been recorded yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemLogs;
