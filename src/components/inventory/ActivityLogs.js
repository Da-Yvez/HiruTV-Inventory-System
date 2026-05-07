"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSite } from '@/context/SiteContext';
import { 
    Search, 
    History, 
    RefreshCcw, 
    User,
    Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActivityLogs = () => {
    const { currentSite } = useSite();
    const { getAuthToken } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = useCallback(async () => {
        if (!currentSite?.logsCollection) return;

        setLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) {
                console.warn('[ActivityLogs] No auth token available.');
                setLoading(false);
                return;
            }

            // Fetch site-specific logs
            const siteResPromise = fetch(
                `/api/logs?collection=${currentSite.logsCollection}&limit=100`,
                { 
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store'
                }
            );

            // Fetch system-wide logs (logins, etc.)
            const systemResPromise = fetch(
                `/api/logs?collection=systemLogs&limit=100`,
                { 
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store'
                }
            );

            const [siteRes, systemRes] = await Promise.all([siteResPromise, systemResPromise]);

            let allLogs = [];

            if (siteRes.ok) {
                const { logs: siteLogs } = await siteRes.json();
                allLogs = [...allLogs, ...(siteLogs || [])];
            } else {
                const errData = await siteRes.json().catch(() => ({}));
                console.error('[ActivityLogs] API error fetching site logs:', errData.error || 'Unknown error');
            }

            if (systemRes.ok) {
                const { logs: sysLogs } = await systemRes.json();
                allLogs = [...allLogs, ...(sysLogs || [])];
            } else {
                const errData = await systemRes.json().catch(() => ({}));
                console.error('[ActivityLogs] API error fetching system logs:', errData.error || 'Unknown error');
            }

            // Merge, sort by timestamp descending, and take top 100
            allLogs.sort((a, b) => {
                const timeA = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
                const timeB = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
                return timeB - timeA;
            });

            setLogs(allLogs.slice(0, 100));
        } catch (error) {
            console.error('[ActivityLogs] Fetch error:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [currentSite, getAuthToken]);

    // Initial load
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Auto-refresh every 15 seconds so new logs appear without a full reload
    useEffect(() => {
        const interval = setInterval(fetchLogs, 15000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            (log.action?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.details?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.user?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return matchesSearch;
    });

    const getActionColor = (action) => {
        const a = action?.toLowerCase() || '';
        if (a.includes('add') || a.includes('created')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (a.includes('edit') || a.includes('updated')) return 'bg-amber-50 text-amber-600 border-amber-100';
        if (a.includes('delete') || a.includes('removed')) return 'bg-rose-50 text-rose-600 border-rose-100';
        return 'bg-blue-50 text-blue-600 border-blue-100';
    };

    // Format timestamp — comes back as milliseconds (number) from the API
    const formatTimestamp = (ts) => {
        if (!ts) return 'N/A';
        // API returns millis; legacy Firestore Timestamp object has .seconds
        const ms = typeof ts === 'number' ? ts : (ts.seconds ? ts.seconds * 1000 : null);
        return ms ? new Date(ms).toLocaleString() : 'N/A';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <RefreshCcw className="animate-spin mb-4 text-orange-500" size={32} />
                <p className="font-bold text-orange-600 tracking-wide uppercase text-xs">Syncing logs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-[#003135] tracking-tight">Activity Logs</h1>
                    <p className="text-slate-500 font-medium">Recent system actions and changes</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-[#D1DDDE] rounded-2xl focus:outline-none focus:border-[#003135] transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center justify-center w-12 h-12 bg-slate-50 hover:bg-[#003135] text-slate-500 hover:text-white rounded-2xl border border-[#D1DDDE] transition-all"
                        title="Refresh logs"
                    >
                        <RefreshCcw size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-[#D1DDDE] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-[#D1DDDE]">
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Details</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {filteredLogs.map((log) => (
                                    <motion.tr 
                                        key={log.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <span className={`
                                                inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border
                                                ${getActionColor(log.action)}
                                            `}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-600 font-medium max-w-md truncate" title={log.details}>
                                                {log.details}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[#003135]">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{log.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                <Calendar size={14} />
                                                {formatTimestamp(log.timestamp)}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredLogs.length === 0 && (
                    <div className="py-20 text-center text-slate-400">
                        <div className="mb-4 flex justify-center opacity-20"><History size={60} /></div>
                        <p className="text-xl font-bold">No logs found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogs;
