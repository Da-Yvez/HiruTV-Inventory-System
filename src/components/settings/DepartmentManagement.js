"use client";

import React, { useState } from 'react';
import { useSite } from '@/context/SiteContext';
import { 
    Plus, 
    Trash2, 
    LayoutGrid, 
    Save, 
    AlertCircle,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DepartmentManagement = () => {
    const { currentSite, updateSiteConfig } = useSite();
    const [newDept, setNewDept] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [deptToDeleteModal, setDeptToDeleteModal] = useState(null);

    const departments = currentSite?.departments || [];

    const handleAddDept = (e) => {
        e.preventDefault();
        if (!newDept.trim()) return;
        
        if (departments.some(d => d.toLowerCase() === newDept.trim().toLowerCase())) {
            showMessage('Department already exists', 'error');
            return;
        }

        const updatedDepts = [...departments, newDept.trim()];
        saveDepartments(updatedDepts);
        setNewDept('');
    };

    const handleDeleteDept = (deptToDelete) => {
        setDeptToDeleteModal(deptToDelete);
    };

    const confirmDeleteDept = () => {
        if (!deptToDeleteModal) return;
        const updatedDepts = departments.filter(d => d !== deptToDeleteModal);
        saveDepartments(updatedDepts);
        setDeptToDeleteModal(null);
    };

    const saveDepartments = async (updatedDepts) => {
        setSaving(true);
        try {
            await updateSiteConfig({ departments: updatedDepts });
            showMessage('Departments updated successfully', 'success');
        } catch (error) {
            showMessage('Failed to update departments', 'error');
        } finally {
            setSaving(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#003135] tracking-tight">Department Management</h1>
                <p className="text-slate-500 font-medium">Manage the departments available for {currentSite?.fullName}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left side: Add form */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-[32px] shadow-xl shadow-[#003135]/5 border border-slate-100 sticky top-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-[#003135]/5 rounded-lg flex items-center justify-center text-[#003135]">
                                <Plus size={18} />
                            </div>
                            <h3 className="font-bold text-[#003135]">Add Department</h3>
                        </div>

                        <form onSubmit={handleAddDept} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department Name</label>
                                <input maxLength={100} 
                                    value={newDept}
                                    onChange={(e) => setNewDept(e.target.value)}
                                    placeholder="e.g. Production"
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135]"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={saving || !newDept.trim()}
                                className="w-full py-4 bg-[#003135] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#003135]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Plus size={20} />
                                Add
                            </button>
                        </form>

                        <AnimatePresence>
                            {message && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                                        message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}
                                >
                                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <span className="text-xs font-bold">{message.text}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right side: List */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-[32px] shadow-xl shadow-[#003135]/5 border border-slate-100 overflow-hidden">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutGrid size={18} className="text-[#003135]" />
                                <h3 className="font-bold text-[#003135]">Current Departments</h3>
                            </div>
                            <span className="bg-[#003135] text-white px-3 py-1 rounded-full text-[10px] font-black">
                                {departments.length} TOTAL
                            </span>
                        </div>

                        <div className="p-2 grid grid-cols-1 gap-1">
                            {departments.length === 0 ? (
                                <div className="py-20 text-center text-slate-400">
                                    <p className="font-bold">No departments added yet</p>
                                    <p className="text-xs">Add your first department using the form on the left</p>
                                </div>
                            ) : (
                                departments.map((dept, idx) => (
                                    <motion.div 
                                        key={dept}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-[20px] group transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-[#003135]/5 rounded-xl flex items-center justify-center text-[#003135] font-black text-xs">
                                                {idx + 1}
                                            </div>
                                            <span className="font-bold text-[#003135]">{dept}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteDept(dept)}
                                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {deptToDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-[#003135] mb-2">Delete Department?</h3>
                                <p className="text-slate-500 font-medium mb-8">
                                    Are you sure you want to remove the 
                                    <span className="font-bold text-[#003135]"> "{deptToDeleteModal}" </span> 
                                    department? 
                                </p>
                                
                                <div className="flex gap-4 w-full">
                                    <button 
                                        onClick={() => setDeptToDeleteModal(null)}
                                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-[#003135] rounded-2xl font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={confirmDeleteDept}
                                        className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DepartmentManagement;
