"use client";

import React from 'react';
import { 
    Cpu, 
    MemoryStick, 
    HardDrive, 
    Monitor as MonitorIcon, 
    Keyboard,
    ShieldCheck, 
    Info,
    LayoutDashboard,
    ExternalLink,
    Hash,
    Building2,
    Calendar,
    Network,
    User,
    FileText,
    CircleDot
} from 'lucide-react';
import { motion } from 'framer-motion';

const PublicAssetView = ({ device }) => {
    if (!device) return null;

    const isPC = !device.deviceType || device.deviceType === 'pc';

    const specs = isPC ? [
        { label: 'CPU', value: device.cpu, icon: Cpu, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'RAM', value: device.ram, icon: MemoryStick, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'GPU', value: device.gpu, icon: LayoutDashboard, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { label: 'Storage', value: device.storage, icon: HardDrive, color: 'text-amber-500', bg: 'bg-amber-50' },
    ] : [];

    const getCustomFieldIcon = (label) => {
        const l = label?.toLowerCase() || '';
        if (l.includes('ip') || l.includes('address') || l.includes('mac')) return Network;
        if (l.includes('port') || l.includes('slot') || l.includes('rack') || l.includes('vlan') || l.includes('interface')) return Network;
        if (l.includes('serial') || l.includes('no') || l.includes('code') || l.includes('id') || l.includes('key')) return Hash;
        if (l.includes('user') || l.includes('owner') || l.includes('assign') || l.includes('name')) return User;
        if (l.includes('location') || l.includes('room') || l.includes('building') || l.includes('desk') || l.includes('site')) return Building2;
        if (l.includes('date') || l.includes('year') || l.includes('time') || l.includes('purchase') || l.includes('expiry')) return Calendar;
        return CircleDot;
    };

    const hasNetwork = device.networkInterfaces?.some(net => net.ipAddress && net.ipAddress.trim() !== '');

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 md:p-12 flex flex-col items-center">
            {/* Header / Logo Section */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-5xl flex flex-col items-center mb-8"
            >
                <div className="w-14 h-14 bg-[#003135] rounded-2xl flex items-center justify-center shadow-lg shadow-[#003135]/20 mb-4">
                    <ShieldCheck className="text-white" size={28} />
                </div>
                <h1 className="text-2xl font-black text-[#003135] tracking-tight text-center uppercase">Full Asset Profile</h1>
                <p className="text-slate-400 font-bold mt-1 tracking-[0.4em] text-[10px] uppercase">Hiru TV Inventory System</p>
                <div className="mt-3 opacity-40 hover:opacity-100 transition-opacity">
                    <a 
                        href="https://yvexa.dev" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[9px] font-black text-[#003135] uppercase tracking-[0.4em]"
                    >
                        Powered by YVEXA
                    </a>
                </div>
            </motion.div>

            {/* Main Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-5xl bg-white rounded-[32px] sm:rounded-[48px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden"
            >
                {/* Hero Section */}
                <div className="bg-[#003135] p-6 sm:p-10 md:p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full -mr-64 -mt-64 blur-3xl" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 relative z-10">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                                    <Building2 size={14} className="text-emerald-400" />
                                    <span className="text-[11px] font-black tracking-widest uppercase text-emerald-400">
                                        {device.department}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                                    <CircleDot size={14} className="text-white animate-pulse" />
                                    <span className="text-[11px] font-black tracking-widest uppercase text-white">
                                        {device.status}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-white/50 text-xs sm:text-sm font-bold tracking-[0.2em] uppercase ml-1">
                                    {device.pcNumber}
                                </p>
                                <h2 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-none">
                                    {device.pcModel}
                                </h2>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-6 w-full md:w-auto">
                            <div className="w-full md:w-auto bg-white/10 p-6 rounded-[32px] border-2 border-white/20 shadow-2xl backdrop-blur-md">
                                <div className="flex items-start gap-5">
                                    <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                                        <Hash size={28} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] leading-none mb-2">Primary Serial</p>
                                        <div className="max-w-full overflow-x-auto">
                                            <p className="text-3xl sm:text-4xl font-mono font-black text-white tracking-tight leading-none whitespace-nowrap">
                                                {device.pcSerial || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 sm:p-10 md:p-12 space-y-16 sm:space-y-20">
                    
                    {/* Grid: Specs or Custom Fields & Network */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                        {/* Specifications/Custom Fields */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-6 bg-[#003135] rounded-full" />
                                <h3 className="text-xl font-black text-[#003135] uppercase tracking-tight">
                                    {isPC ? 'System Core' : 'Asset Specifications'}
                                </h3>
                            </div>
                            
                            {isPC ? (
                                <div className="grid grid-cols-2 gap-6">
                                    {specs.map((spec, i) => (
                                        <div key={i} className="flex items-center gap-6 p-6 rounded-[32px] bg-slate-50 border border-slate-100 hover:border-[#003135]/20 hover:bg-white hover:shadow-xl transition-all duration-300 group">
                                            <div className={`w-14 h-14 ${spec.bg} ${spec.color} rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                <spec.icon size={28} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{spec.label}</p>
                                                <p className="text-lg font-black text-[#003135] leading-tight">
                                                    {spec.value || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {device.customFields && device.customFields.length > 0 ? (
                                        device.customFields.map((field, i) => {
                                            const Icon = getCustomFieldIcon(field.label);
                                            return (
                                                <div key={i} className="flex items-center gap-6 p-6 rounded-[32px] bg-slate-50 border border-slate-100 hover:border-[#003135]/20 hover:bg-white hover:shadow-xl transition-all duration-300 group">
                                                    <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                                        <Icon size={28} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">{field.label}</p>
                                                        <p className="text-lg font-black text-[#003135] leading-tight break-words">
                                                            {field.value || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-2 p-10 border-2 border-dashed border-slate-100 rounded-[32px] text-center">
                                            <p className="text-slate-300 font-bold text-sm uppercase tracking-widest">No custom specification fields added</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Network Info */}
                        {(isPC || hasNetwork) && (
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                                    <h3 className="text-xl font-black text-[#003135] uppercase tracking-tight">Network Info</h3>
                                </div>
                                <div className="space-y-4">
                                    {device.networkInterfaces && device.networkInterfaces.length > 0 ? (
                                        device.networkInterfaces.map((net, i) => (
                                            <div key={i} className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
                                                <Network className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-white/10 transition-colors" size={100} />
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">{net.interfaceName || 'Interface'}</p>
                                                <p className="text-2xl font-mono font-black text-emerald-400 tracking-tight mb-1">{net.ipAddress || '---.---.---.---'}</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                    <span className="text-[10px] font-bold text-white/40 uppercase">
                                                        {net.type ? `${net.type} connection` : 'Static IP Assigned'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 border-2 border-dashed border-slate-100 rounded-[32px] text-center bg-slate-950">
                                            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">No interface configured</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Monitors & Peripherals */}
                    {(isPC || (device.monitors?.length > 0 || device.ioDevices?.length > 0)) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                            {/* Monitors */}
                            {(isPC || device.monitors?.length > 0) && (
                                <section className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                                            <MonitorIcon size={24} />
                                        </div>
                                        <h3 className="text-xl font-black text-[#003135] uppercase tracking-tight">Display Configuration</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {device.monitors?.length > 0 ? device.monitors.map((mon, i) => (
                                            <div key={i} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:text-blue-500 transition-colors">
                                                        <MonitorIcon size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Display {i + 1}</p>
                                                        <p className="text-md font-black text-[#003135] leading-none">{mon.model}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Serial</p>
                                                    <p className="text-xs font-mono font-black text-[#003135]">{mon.serial || '---'}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-10 border-2 border-dashed border-slate-100 rounded-[32px] text-center">
                                                <p className="text-slate-300 font-bold text-sm uppercase tracking-widest">No Display Data</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* IO Devices */}
                            {(isPC || device.ioDevices?.length > 0) && (
                                <section className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl">
                                            <Keyboard size={24} />
                                        </div>
                                        <h3 className="text-xl font-black text-[#003135] uppercase tracking-tight">Peripherals & I/O</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {device.ioDevices?.length > 0 ? device.ioDevices.map((io, i) => (
                                            <div key={i} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:text-purple-500 transition-colors">
                                                        <Keyboard size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{io.name}</p>
                                                        <p className="text-md font-black text-[#003135] leading-none">{io.model}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Serial</p>
                                                    <p className="text-xs font-mono font-black text-[#003135]">{io.serial || '---'}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-10 border-2 border-dashed border-slate-100 rounded-[32px] text-center">
                                                <p className="text-slate-300 font-bold text-sm uppercase tracking-widest">No Peripheral Data</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {/* Technical Notes & Remarks */}
                    {device.inventoryNotes && device.inventoryNotes.trim() !== '' && (
                        <section className="space-y-8 pt-8 border-t border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-xl font-black text-[#003135] uppercase tracking-tight">Technical Notes & Remarks</h3>
                            </div>
                            <div className="p-8 bg-amber-50/40 border border-amber-100 rounded-[32px] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.02] rounded-full -mr-8 -mt-8" />
                                <p className="text-sm font-semibold text-amber-950 leading-relaxed whitespace-pre-wrap">
                                    {device.inventoryNotes}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Footer Info */}
                    <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none mb-2">Database Integrity Checked</p>
                                <p className="text-[#003135] font-black text-xl tracking-tight">
                                    {device.updatedAt ? (
                                        (() => {
                                            const secs = device.updatedAt._seconds !== undefined ? device.updatedAt._seconds : device.updatedAt.seconds;
                                            return new Date(secs * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                                        })()
                                    ) : 'Initial Record'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Branding Footer (Simplified) */}
            <div className="mt-12 text-center h-8" />
        </div>
    );
};

export default PublicAssetView;
