"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { useSite } from '@/context/SiteContext';
import { 
    Search, 
    History, 
    RefreshCcw, 
    User,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActivityLogs = () => {
    const { currentSite } = useSite();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!currentSite) return;

        const q = query(
            collection(db, currentSite.logsCollection),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(logList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentSite]);

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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <RefreshCcw className="animate-spin mb-4" size={32} />
                <p className="font-medium">Loading activity logs...</p>
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
                                                {log.timestamp}
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
