"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useSite } from '@/context/SiteContext';
import { useAuth } from '@/context/AuthContext';
import { 
    Search, 
    Filter, 
    Download, 
    RefreshCcw, 
    Edit, 
    Eye, 
    Trash2, 
    CheckSquare, 
    Square,
    MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InventoryTable = () => {
    const { currentSite } = useSite();
    const { user } = useAuth();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');

    useEffect(() => {
        if (!currentSite) return;

        const q = query(
            collection(db, currentSite.firebaseCollection),
            orderBy('pcNumber', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const deviceList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDevices(deviceList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentSite]);

    const toggleTally = async (deviceId, currentStatus) => {
        try {
            const deviceRef = doc(db, currentSite.firebaseCollection, deviceId);
            await updateDoc(deviceRef, {
                isTallied: !currentStatus,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error toggling tally:", error);
        }
    };

    const filteredDevices = devices.filter(device => {
        const matchesSearch = 
            (device.pcNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (device.pcModel?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (device.userName?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesDept = !filterDept || device.department === filterDept;

        return matchesSearch && matchesDept;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <RefreshCcw className="animate-spin mb-4" size={32} />
                <p className="font-medium">Syncing with database...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-[#D1DDDE]">
                <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Search PC number, model, or user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all"
                        />
                    </div>
                    <div className="relative w-full sm:w-60">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all appearance-none"
                        >
                            <option value="">All Departments</option>
                            {currentSite.departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-3 bg-[#1D6F42] text-white rounded-2xl font-bold hover:bg-[#155d32] transition-all shadow-lg shadow-green-900/10">
                        <Download size={20} />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Devices', value: devices.length, color: 'text-[#003135]' },
                    { label: 'Active', value: devices.filter(d => d.status === 'active').length, color: 'text-emerald-600' },
                    { label: 'Failed', value: devices.filter(d => d.status === 'failed').length, color: 'text-rose-600' },
                    { label: 'Replaced', value: devices.filter(d => d.status === 'replaced').length, color: 'text-amber-600' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-[#D1DDDE] flex flex-col items-center">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-4xl font-black mt-2 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#D1DDDE] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-[#D1DDDE]">
                                {currentSite.name === 'HLS' && <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Tally</th>}
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Device Details</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Department & User</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Specifications</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {filteredDevices.map((device) => (
                                    <motion.tr 
                                        key={device.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        {currentSite.name === 'HLS' && (
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => toggleTally(device.id, device.isTallied)}
                                                    className={`p-2 rounded-lg transition-colors ${device.isTallied ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-slate-400'}`}
                                                >
                                                    {device.isTallied ? <CheckSquare size={24} /> : <Square size={24} />}
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-[#003135]">{device.pcNumber}</span>
                                                <span className="text-sm text-slate-500 font-medium">{device.pcModel}</span>
                                                <span className="text-xs text-slate-400 mt-1">S/N: {device.pcSerial}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="inline-flex px-3 py-1 bg-[#003135]/5 text-[#003135] rounded-full text-xs font-bold w-fit mb-2 uppercase tracking-wide">
                                                    {device.department}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-700">{device.userName || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                    <span className="w-8 text-slate-400">IP:</span> {device.networkInterfaces?.[0]?.ipAddress || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                    <span className="w-8 text-slate-400">RAM:</span> {device.ram || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`
                                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider
                                                ${device.status === 'active' ? 'bg-emerald-50 text-emerald-600' : ''}
                                                ${device.status === 'failed' ? 'bg-rose-50 text-rose-600' : ''}
                                                ${device.status === 'replaced' ? 'bg-amber-50 text-amber-600' : ''}
                                            `}>
                                                <div className={`w-2 h-2 rounded-full ${
                                                    device.status === 'active' ? 'bg-emerald-500' : 
                                                    device.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'
                                                }`} />
                                                {device.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2.5 text-[#003135] hover:bg-[#003135] hover:text-white rounded-xl transition-all" title="View Details">
                                                    <Eye size={18} />
                                                </button>
                                                <button className="p-2.5 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all" title="Edit Device">
                                                    <Edit size={18} />
                                                </button>
                                                <button className="p-2.5 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all" title="Delete Device">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredDevices.length === 0 && (
                    <div className="py-20 text-center text-slate-400">
                        <div className="mb-4 flex justify-center opacity-20"><Search size={60} /></div>
                        <p className="text-xl font-bold">No devices found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryTable;
