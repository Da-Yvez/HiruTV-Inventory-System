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
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActivityLogs = () => {
    const { currentSite } = useSite();
    const { getAuthToken, user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clearing, setClearing] = useState(false);
    
    // Clear log states
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [clearMode, setClearMode] = useState('full'); // 'full' | 'range'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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
            const siteRes = await fetch(
                `/api/logs?collection=${currentSite.logsCollection}&limit=100`,
                { 
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store'
                }
            );

            let allLogs = [];

            if (siteRes.ok) {
                const { logs: siteLogs } = await siteRes.json();
                allLogs = siteLogs || [];
            } else {
                const errData = await siteRes.json().catch(() => ({}));
                console.error('[ActivityLogs] API error fetching site logs:', errData.error || 'Unknown error');
            }

            // Sort by timestamp descending, and take top 100
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

    const handleClearLogs = async () => {
        let url = `/api/logs?collection=${currentSite.logsCollection}`;
        
        let confirmMsg = `Are you sure you want to permanently clear all logs in ${currentSite?.name || 'this site'} activity log history? This action CANNOT be undone.`;

        if (clearMode === 'range') {
            if (!startDate && !endDate) {
                alert("Please select at least a Start Date or End Date.");
                return;
            }
            if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

            const startFormatted = startDate ? new Date(startDate).toLocaleString() : 'anytime';
            const endFormatted = endDate ? new Date(endDate).toLocaleString() : 'anytime';
            confirmMsg = `Are you sure you want to permanently clear logs between ${startFormatted} and ${endFormatted}? This action CANNOT be undone.`;
        }

        if (!window.confirm(confirmMsg)) return;

        setClearing(true);
        try {
            const token = await getAuthToken();
            if (!token) return;

            const res = await fetch(url, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to clear logs');

            fetchLogs();
            setIsClearModalOpen(false);
            alert(`Successfully cleared ${data.count} logs.`);
        } catch (error) {
            console.error('Error clearing logs:', error);
            alert(error.message);
        } finally {
            setClearing(false);
        }
    };

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
                    {user?.isSuperAdmin && (
                        <button
                            onClick={() => setIsClearModalOpen(true)}
                            className="flex items-center justify-center gap-1.5 px-5 h-12 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-2xl border border-rose-100 transition-all font-black text-xs uppercase tracking-widest"
                            title="Clear logs"
                        >
                            Clear Logs
                        </button>
                    )}
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
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {filteredLogs.map((log) => (
                                    <motion.tr 
                                        key={log.id}
                                        layout
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

            {/* Clear Logs Range Modal */}
            <AnimatePresence>
                {isClearModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-6 flex flex-col"
                        >
                            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                                        <History size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[#003135]">Clear Activity Logs</h3>
                                        <p className="text-xs text-slate-400 font-semibold">{currentSite?.name} Logs</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsClearModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setClearMode('full')}
                                        className={`flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest border transition-all ${
                                            clearMode === 'full'
                                                ? 'bg-[#003135] text-white border-transparent'
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        Full Clear
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClearMode('range')}
                                        className={`flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest border transition-all ${
                                            clearMode === 'range'
                                                ? 'bg-[#003135] text-white border-transparent'
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        Date Range
                                    </button>
                                </div>

                                {clearMode === 'range' && (
                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Start Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#003135] focus:bg-white rounded-2xl text-xs font-bold text-[#003135] focus:outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">End Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#003135] focus:bg-white rounded-2xl text-xs font-bold text-[#003135] focus:outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    onClick={() => setIsClearModalOpen(false)}
                                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-[#003135] rounded-2xl font-bold text-xs transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearLogs}
                                    disabled={clearing}
                                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/25 transition-all"
                                >
                                    {clearing ? 'Clearing...' : 'Confirm Clear'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ActivityLogs;
