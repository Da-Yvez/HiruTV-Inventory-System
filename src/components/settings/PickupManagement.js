"use client";

import React, { useState } from 'react';
import { useSite } from '@/context/SiteContext';
import { useAuth } from '@/context/AuthContext';
import { addLog } from '@/lib/utils';
import { 
    Plus, 
    Trash2, 
    User, 
    Save, 
    AlertCircle,
    CheckCircle2,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PickupManagement() {
    const { currentSite, updateSiteConfig } = useSite();
    const { user } = useAuth();
    
    // Form States
    const [name, setName] = useState('');
    const [epf, setEpf] = useState('');
    const [nic, setNic] = useState('');
    
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const pickupUsers = currentSite?.pickupUsers || [];

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleAddPickup = async (e) => {
        e.preventDefault();
        
        const trimmedName = name.trim();
        const trimmedEpf = epf.trim();
        const trimmedNic = nic.trim();

        if (!trimmedName) {
            showMessage("User Name is required.", "error");
            return;
        }

        if (!trimmedEpf && !trimmedNic) {
            showMessage("Either EPF or NIC must be provided.", "error");
            return;
        }

        // Check for duplicates
        if (pickupUsers.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
            showMessage("A pickup user with this name already exists.", "error");
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            name: trimmedName,
            epf: trimmedEpf,
            nic: trimmedNic
        };

        const updatedUsers = [...pickupUsers, newUser];

        setSaving(true);
        try {
            await updateSiteConfig({ pickupUsers: updatedUsers });
            showMessage("Pickup user added successfully.", "success");
            addLog(
                currentSite, 
                user, 
                'Pickup User Added', 
                `Added pickup user "${trimmedName}" (EPF: ${trimmedEpf || 'N/A'}, NIC: ${trimmedNic || 'N/A'})`
            );
            
            // Reset Form
            setName('');
            setEpf('');
            setNic('');
        } catch (error) {
            showMessage("Failed to save pickup user.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePickup = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete pickup user "${userName}"?`)) return;

        const updatedUsers = pickupUsers.filter(p => p.id !== userId);

        setSaving(true);
        try {
            await updateSiteConfig({ pickupUsers: updatedUsers });
            showMessage("Pickup user removed successfully.", "success");
            addLog(
                currentSite, 
                user, 
                'Pickup User Removed', 
                `Removed pickup user "${userName}" from predefined list`
            );
        } catch (error) {
            showMessage("Failed to delete pickup user.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#003135] tracking-tight">
                    Pickup Users Management
                </h1>
                <p className="text-slate-500 font-medium">
                    Configure predefined persons available for picking up items on SIO documents
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left side: Add Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-[32px] shadow-xl shadow-[#003135]/5 border border-slate-100 sticky top-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-[#003135]/5 rounded-lg flex items-center justify-center text-[#003135]">
                                <User size={16} />
                            </div>
                            <h3 className="font-black text-[#003135] text-sm uppercase tracking-wider">Add Pickup User</h3>
                        </div>

                        <form onSubmit={handleAddPickup} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    User Name *
                                </label>
                                <input 
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Navindra Niyomal"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#003135] focus:bg-white rounded-2xl text-xs font-bold text-[#003135] focus:outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    EPF Number
                                </label>
                                <input 
                                    type="text"
                                    value={epf}
                                    onChange={(e) => setEpf(e.target.value)}
                                    placeholder="e.g. 1234 (Either EPF or NIC req.)"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#003135] focus:bg-white rounded-2xl text-xs font-bold text-[#003135] focus:outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    NIC Number
                                </label>
                                <input 
                                    type="text"
                                    value={nic}
                                    onChange={(e) => setNic(e.target.value)}
                                    placeholder="e.g. 951234567V"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#003135] focus:bg-white rounded-2xl text-xs font-bold text-[#003135] focus:outline-none transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 bg-[#003135] text-white hover:bg-[#004145] rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#003135]/10 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                <Plus size={14} strokeWidth={2.5} />
                                Add User
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right side: List */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Status/Notification messages */}
                    <AnimatePresence>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-xs font-bold ${
                                    message.type === 'success' 
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                        : 'bg-rose-50 border-rose-100 text-rose-700'
                                }`}
                            >
                                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                <span>{message.text}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {pickupUsers.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center text-slate-400 font-bold shadow-sm">
                            No predefined pickup users configured yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pickupUsers.map((p) => (
                                <motion.div
                                    key={p.id}
                                    layout
                                    className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                                >
                                    <div className="space-y-1">
                                        <h4 className="font-black text-[#003135] text-sm">{p.name}</h4>
                                        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                                            {p.epf && (
                                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                                                    EPF: {p.epf}
                                                </span>
                                            )}
                                            {p.nic && (
                                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                                                    NIC: {p.nic}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeletePickup(p.id, p.name)}
                                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                        title="Delete Pickup User"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
