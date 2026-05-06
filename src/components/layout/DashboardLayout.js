"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSite } from '@/context/SiteContext';
import { 
    LayoutDashboard, 
    PlusCircle, 
    History, 
    Settings, 
    LogOut, 
    ChevronLeft, 
    ChevronRight,
    Monitor,
    ShieldCheck,
    Cpu,
    Download,
    FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardLayout = ({ children, activeSection, onSectionChange }) => {
    const { user, logout } = useAuth();
    const { currentSite, clearSite } = useSite();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const menuItems = [
        { id: 'inventory', label: 'Device Inventory', icon: <LayoutDashboard size={20} /> },
        { id: 'addDevice', label: 'Add New Device', icon: <PlusCircle size={20} /> },
        { id: 'logs', label: 'Activity Logs', icon: <History size={20} /> },
    ];

    return (
        <div className="flex h-screen bg-[#F0F5F5] overflow-hidden">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 80 }}
                className="bg-white border-r border-[#D1DDDE] shadow-sm relative z-20 flex flex-col"
            >
                {/* Site Brand */}
                <div className="h-20 flex items-center px-6 border-b border-[#D1DDDE] overflow-hidden">
                    <div className="min-w-[40px] w-10 h-10 bg-[#003135] rounded-xl flex items-center justify-center text-white mr-4">
                        <Monitor size={24} />
                    </div>
                    {isSidebarOpen && (
                        <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-bold text-xl text-[#003135] whitespace-nowrap"
                        >
                            {currentSite?.name} <span className="text-[#00A3A8]">IT</span>
                        </motion.span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6">
                    <ul className="space-y-2 px-3">
                        {menuItems.map((item) => (
                            <li key={item.id}>
                                <button 
                                    onClick={() => onSectionChange(item.id)}
                                    className={`
                                        w-full flex items-center p-3 rounded-xl transition-all duration-200
                                        ${activeSection === item.id 
                                            ? 'bg-[#003135] text-white shadow-lg shadow-[#003135]/20' 
                                            : 'text-[#5A6C6D] hover:bg-slate-50 hover:text-[#003135]'}
                                    `}
                                >
                                    <span className="min-w-[40px] flex justify-center">{item.icon}</span>
                                    {isSidebarOpen && <span className="ml-2 font-semibold">{item.label}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>

                    {/* Information Section */}
                    <div className="mt-8 px-6 mb-2">
                        {isSidebarOpen ? (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[10px] font-bold text-[#5A6C6D] uppercase tracking-wider"
                            >
                                Information
                            </motion.p>
                        ) : (
                            <div className="h-px bg-[#D1DDDE] w-full" />
                        )}
                    </div>
                    <ul className="space-y-2 px-3">
                        <li>
                            <a 
                                href="/downloads/advisorinstaller.exe"
                                download
                                className="w-full flex items-center p-3 text-[#5A6C6D] hover:bg-slate-50 hover:text-[#003135] rounded-xl transition-all"
                            >
                                <span className="min-w-[40px] flex justify-center"><Download size={20} /></span>
                                {isSidebarOpen && <span className="ml-2 font-semibold">Download App</span>}
                            </a>
                        </li>
                        <li>
                            <a 
                                href={process.env.NEXT_PUBLIC_NAME_LIST_URL || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center p-3 text-[#5A6C6D] hover:bg-slate-50 hover:text-[#003135] rounded-xl transition-all"
                            >
                                <span className="min-w-[40px] flex justify-center"><FileSpreadsheet size={20} /></span>
                                {isSidebarOpen && <span className="ml-2 font-semibold">Name List</span>}
                            </a>
                        </li>
                    </ul>

                    {/* Settings Section */}
                    <div className="mt-8 px-6 mb-2">
                        {isSidebarOpen ? (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[10px] font-bold text-[#5A6C6D] uppercase tracking-wider"
                            >
                                Settings
                            </motion.p>
                        ) : (
                            <div className="h-px bg-[#D1DDDE] w-full" />
                        )}
                    </div>
                    <ul className="space-y-2 px-3">
                        <li>
                            <button 
                                onClick={() => onSectionChange('departments')}
                                className={`
                                    w-full flex items-center p-3 rounded-xl transition-all duration-200
                                    ${activeSection === 'departments' 
                                        ? 'bg-[#003135] text-white shadow-lg shadow-[#003135]/20' 
                                        : 'text-[#5A6C6D] hover:bg-slate-50 hover:text-[#003135]'}
                                `}
                            >
                                <span className="min-w-[40px] flex justify-center"><Settings size={20} /></span>
                                {isSidebarOpen && <span className="ml-2 font-semibold">Departments</span>}
                            </button>
                        </li>
                    </ul>
                </nav>


                {/* Sidebar Footer */}
                <div className="p-3 border-t border-[#D1DDDE]">
                    <button 
                        onClick={clearSite}
                        className="w-full flex items-center p-3 text-[#5A6C6D] hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                    >
                        <span className="min-w-[40px] flex justify-center"><Settings size={20} /></span>
                        {isSidebarOpen && <span className="ml-2 font-semibold">Switch Site</span>}
                    </button>
                    <button 
                        onClick={logout}
                        className="w-full flex items-center p-3 text-[#5A6C6D] hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                    >
                        <span className="min-w-[40px] flex justify-center"><LogOut size={20} /></span>
                        {isSidebarOpen && <span className="ml-2 font-semibold">Sign Out</span>}
                    </button>
                </div>

                {/* Toggle Button */}
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute -right-4 top-24 w-8 h-8 bg-white border border-[#D1DDDE] rounded-full flex items-center justify-center text-[#003135] shadow-md hover:bg-[#F0F5F5] transition-colors"
                >
                    {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </motion.aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-white border-b border-[#D1DDDE] flex items-center justify-between px-8 relative z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="text-[#5A6C6D] text-sm font-medium bg-slate-100 px-4 py-2 rounded-full flex items-center gap-2">
                             <ShieldCheck size={16} className="text-[#00A3A8]" />
                             {currentSite?.fullName}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-[#003135] leading-none">{user?.displayName}</p>
                            <p className="text-xs text-[#5A6C6D] mt-1 uppercase tracking-wider font-semibold">System Operator</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-[#003135] to-[#00A3A8] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#003135]/10">
                            {user?.displayName?.[0]?.toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-[#F8FAFA]">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
