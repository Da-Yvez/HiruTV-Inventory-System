"use client";

import React, { useState } from 'react';
import { useSite } from '@/context/SiteContext';
import { useAuth } from '@/context/AuthContext';
import { addLog } from '@/lib/utils';
import { 
    Plus, 
    Trash2, 
    LayoutGrid, 
    Save, 
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CategoryCard = ({ dept, subcategories, onAddSub, onDeleteSub, onDeleteDept, isHLSE }) => {
    const [newSub, setNewSub] = useState('');
    const subList = subcategories[dept] || [];

    return (
        <motion.div 
            layout
            className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col justify-between group relative min-h-[220px]"
        >
            <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#003135]/5 rounded-xl flex items-center justify-center text-[#003135] font-black text-sm">
                            <LayoutGrid size={18} />
                        </div>
                        <h4 className="font-black text-[#003135] text-lg tracking-tight">{dept}</h4>
                    </div>
                    <button 
                        onClick={() => onDeleteDept(dept)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title={isHLSE ? "Delete Category" : "Delete Department"}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Subcategories (Tags) */}
                <div className="space-y-2.5 mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        {isHLSE ? 'Subcategories' : 'Subdepartments'} ({subList.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {subList.length === 0 ? (
                            <span className="text-xs text-slate-400 font-medium italic block py-1">No subcategories</span>
                        ) : (
                            subList.map((sub) => (
                                <div 
                                    key={sub} 
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 group/tag cursor-pointer"
                                    onClick={() => onDeleteSub(dept, sub)}
                                    title="Click to remove"
                                >
                                    <span>{sub}</span>
                                    <X size={12} className="text-slate-400 group-hover/tag:text-rose-500 transition-colors" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Inline Add input */}
            <form 
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!newSub.trim()) return;
                    onAddSub(dept, newSub.trim());
                    setNewSub('');
                }}
                className="relative mt-auto border-t border-slate-100 pt-4"
            >
                <input maxLength={100}
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    placeholder={isHLSE ? "+ Add subcategory" : "+ Add subdepartment"}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-200 rounded-2xl text-xs font-bold text-[#003135] focus:outline-none transition-all"
                />
                {newSub.trim() && (
                    <button 
                        type="submit"
                        className="absolute right-2 top-[22px] p-1.5 bg-[#003135] text-white rounded-lg text-xs hover:bg-[#004145] transition-all"
                    >
                        <Plus size={12} />
                    </button>
                )}
            </form>
        </motion.div>
    );
};

const DepartmentManagement = () => {
    const { currentSite, updateSiteConfig } = useSite();
    const { user } = useAuth();
    const [newDept, setNewDept] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [deptToDeleteModal, setDeptToDeleteModal] = useState(null);

    const isHLSE = currentSite?.id === 'hlse';
    const departments = currentSite?.departments || [];
    const subcategories = currentSite?.subcategories || {};

    const handleAddDept = (e) => {
        e.preventDefault();
        if (!newDept.trim()) return;
        
        if (departments.some(d => d.toLowerCase() === newDept.trim().toLowerCase())) {
            showMessage(isHLSE ? 'Category already exists' : 'Department already exists', 'error');
            return;
        }

        const updatedDepts = [...departments, newDept.trim()];
        saveDepartments(updatedDepts, 'add', newDept.trim());
        setNewDept('');
    };

    const handleDeleteDept = (deptToDelete) => {
        setDeptToDeleteModal(deptToDelete);
    };

    const confirmDeleteDept = async () => {
        if (!deptToDeleteModal) return;
        const updatedDepts = departments.filter(d => d !== deptToDeleteModal);
        
        const updatedSubs = { ...subcategories };
        delete updatedSubs[deptToDeleteModal];

        setSaving(true);
        try {
            await updateSiteConfig({ 
                departments: updatedDepts,
                subcategories: updatedSubs
            });
            showMessage(isHLSE ? 'Category and subcategories removed successfully' : 'Department and subdepartments removed successfully', 'success');
            addLog(
                currentSite, 
                user, 
                isHLSE ? 'Category Removed' : 'Department Removed', 
                isHLSE ? `Removed category "${deptToDeleteModal}" and its subcategories from ${currentSite?.fullName}` : `Removed department "${deptToDeleteModal}" and its subdepartments from ${currentSite?.fullName}`
            );
        } catch (error) {
            showMessage(isHLSE ? 'Failed to delete category' : 'Failed to delete department', 'error');
        } finally {
            setSaving(false);
            setDeptToDeleteModal(null);
        }
    };

    const saveDepartments = async (updatedDepts, action, deptName) => {
        setSaving(true);
        try {
            await updateSiteConfig({ departments: updatedDepts });
            showMessage(isHLSE ? 'Categories updated successfully' : 'Departments updated successfully', 'success');
            if (action === 'add') {
                const actionType = isHLSE ? 'Category Added' : 'Department Added';
                const logText = isHLSE ? `Added category "${deptName}" to ${currentSite?.fullName}` : `Added department "${deptName}" to ${currentSite?.fullName}`;
                addLog(currentSite, user, actionType, logText);
            }
        } catch (error) {
            showMessage(isHLSE ? 'Failed to update categories' : 'Failed to update departments', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAddSub = async (dept, subName) => {
        const deptSubs = subcategories[dept] || [];
        
        if (deptSubs.some(s => s.toLowerCase() === subName.toLowerCase())) {
            showMessage(isHLSE ? 'Subcategory already exists' : 'Subdepartment already exists', 'error');
            return;
        }

        const updatedSubs = {
            ...subcategories,
            [dept]: [...deptSubs, subName]
        };

        setSaving(true);
        try {
            await updateSiteConfig({ subcategories: updatedSubs });
            showMessage(isHLSE ? 'Subcategory added successfully' : 'Subdepartment added successfully', 'success');
            addLog(
                currentSite, 
                user, 
                isHLSE ? 'Subcategory Added' : 'Subdepartment Added', 
                isHLSE ? `Added subcategory "${subName}" under "${dept}" to ${currentSite?.fullName}` : `Added subdepartment "${subName}" under "${dept}" to ${currentSite?.fullName}`
            );
        } catch (error) {
            showMessage('Failed to add subcategory', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSub = async (dept, subName) => {
        const deptSubs = subcategories[dept] || [];
        const updatedSubs = {
            ...subcategories,
            [dept]: deptSubs.filter(s => s !== subName)
        };

        setSaving(true);
        try {
            await updateSiteConfig({ subcategories: updatedSubs });
            showMessage(isHLSE ? 'Subcategory removed successfully' : 'Subdepartment removed successfully', 'success');
            addLog(
                currentSite, 
                user, 
                isHLSE ? 'Subcategory Removed' : 'Subdepartment Removed', 
                isHLSE ? `Removed subcategory "${subName}" from "${dept}" in ${currentSite?.fullName}` : `Removed subdepartment "${subName}" from "${dept}" in ${currentSite?.fullName}`
            );
        } catch (error) {
            showMessage('Failed to remove subcategory', 'error');
        } finally {
            setSaving(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#003135] tracking-tight">
                    {isHLSE ? 'Category Management' : 'Department Management'}
                </h1>
                <p className="text-slate-500 font-medium">
                    {isHLSE ? `Manage the categories available for ${currentSite?.fullName}` : `Manage the departments available for ${currentSite?.fullName}`}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left side: Add form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-[32px] shadow-xl shadow-[#003135]/5 border border-slate-100 sticky top-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-[#003135]/5 rounded-lg flex items-center justify-center text-[#003135]">
                                <Plus size={18} />
                            </div>
                            <h3 className="font-bold text-[#003135]">{isHLSE ? 'Add Category' : 'Add Department'}</h3>
                        </div>

                        <form onSubmit={handleAddDept} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {isHLSE ? 'Category Name' : 'Department Name'}
                                </label>
                                <input maxLength={100} 
                                    value={newDept}
                                    onChange={(e) => setNewDept(e.target.value)}
                                    placeholder={isHLSE ? "e.g. Cameras" : "e.g. Production"}
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

                {/* Right side: Grid list */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-50/40 border border-slate-100 rounded-[40px] p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <LayoutGrid size={22} className="text-[#003135]" />
                                <h3 className="font-black text-[#003135] text-xl">{isHLSE ? 'Current Categories' : 'Current Departments'}</h3>
                            </div>
                            <span className="bg-[#003135] text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider">
                                {departments.length} TOTAL
                            </span>
                        </div>

                        {departments.length === 0 ? (
                            <div className="py-24 text-center text-slate-400">
                                <p className="font-bold text-lg">{isHLSE ? 'No categories added yet' : 'No departments added yet'}</p>
                                <p className="text-sm mt-1">{isHLSE ? 'Add your first category using the form on the left' : 'Add your first department using the form on the left'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {departments.map((dept) => (
                                    <CategoryCard 
                                        key={dept}
                                        dept={dept}
                                        subcategories={subcategories}
                                        onAddSub={handleAddSub}
                                        onDeleteSub={handleDeleteSub}
                                        onDeleteDept={handleDeleteDept}
                                        isHLSE={isHLSE}
                                    />
                                ))}
                            </div>
                        )}
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
                                <h3 className="text-2xl font-black text-[#003135] mb-2">
                                    {isHLSE ? 'Delete Category?' : 'Delete Department?'}
                                </h3>
                                <p className="text-slate-500 font-medium mb-8">
                                    {isHLSE 
                                        ? `Are you sure you want to remove the "${deptToDeleteModal}" category and all of its subcategories?`
                                        : `Are you sure you want to remove the "${deptToDeleteModal}" department and all of its subdepartments?`}
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
