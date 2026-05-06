"use client";

import React, { useState, useEffect } from 'react';
import { 
    X, 
    Plus, 
    Trash2, 
    Monitor as MonitorIcon, 
    Network, 
    Cpu, 
    Keyboard, 
    FileText,
    Save,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DeviceForm = ({ isOpen, onClose, onSave, initialData = null, departments = [], isReadOnly = false }) => {
    const [formData, setFormData] = useState({
        pcNumber: '',
        pcModel: '',
        pcSerial: '',
        department: '',
        userName: '',
        status: 'active',
        deviceType: 'pc',
        customFields: [],
        cpu: '',
        gpu: '',
        ram: '',
        storage: '',
        inventoryNotes: '',
        networkInterfaces: [{ interfaceName: 'Primary', ipAddress: '' }],
        monitors: [],
        ioDevices: [],
        softwareLicenses: []
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...formData,
                ...initialData,
                networkInterfaces: initialData.networkInterfaces || [{ interfaceName: 'Primary', ipAddress: '' }],
                monitors: initialData.monitors || [],
                ioDevices: initialData.ioDevices || [],
                softwareLicenses: initialData.softwareLicenses || []
            });
        } else {
            setFormData({
                pcNumber: '',
                pcModel: '',
                pcSerial: '',
                department: '',
                userName: '',
                status: 'active',
                deviceType: 'pc',
                customFields: [],
                cpu: '',
                gpu: '',
                ram: '',
                storage: '',
                inventoryNotes: '',
                networkInterfaces: [{ interfaceName: 'Primary', ipAddress: '' }],
                monitors: [],
                ioDevices: [],
                softwareLicenses: []
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleListChange = (listName, index, field, value) => {
        const newList = [...formData[listName]];
        newList[index][field] = value;
        setFormData(prev => ({ ...prev, [listName]: newList }));
    };

    const addListItem = (listName, emptyItem) => {
        setFormData(prev => ({ 
            ...prev, 
            [listName]: [...prev[listName], emptyItem] 
        }));
    };

    const removeListItem = (listName, index) => {
        const newList = formData[listName].filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, [listName]: newList }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-[#003135] tracking-tight">
                            {isReadOnly ? 'Device Details' : (initialData ? 'Edit Device' : 'Add New Device')}
                        </h2>
                        <p className="text-slate-500 font-medium">
                            {isReadOnly ? 'Viewing read-only information' : 'Complete the information below'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <form id="device-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Device Type Toggle */}
                    {!isReadOnly && (
                        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit mx-auto mb-4">
                            <button 
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, deviceType: 'pc' }))}
                                className={`px-8 py-2 rounded-xl text-sm font-black transition-all ${formData.deviceType === 'pc' ? 'bg-[#003135] text-white shadow-lg' : 'text-slate-500 hover:text-[#003135]'}`}
                            >
                                COMPUTER / PC
                            </button>
                            <button 
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, deviceType: 'other' }))}
                                className={`px-8 py-2 rounded-xl text-sm font-black transition-all ${formData.deviceType === 'other' ? 'bg-[#003135] text-white shadow-lg' : 'text-slate-500 hover:text-[#003135]'}`}
                            >
                                OTHER ASSET
                            </button>
                        </div>
                    )}
                    
                    {/* Basic Information */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-[#003135] font-bold">
                            <Info size={18} />
                            <h3>{formData.deviceType === 'pc' ? 'Computer' : 'Asset'} Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{formData.deviceType === 'pc' ? 'PC Number' : 'Asset ID'} *</label>
                                <input 
                                    required
                                    name="pcNumber"
                                    value={formData.pcNumber}
                                    onChange={handleChange}
                                    disabled={isReadOnly}
                                    placeholder={formData.deviceType === 'pc' ? "e.g. PC-001" : "e.g. SW-001"}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{formData.deviceType === 'pc' ? 'PC Model' : 'Model/Type'} *</label>
                                <input 
                                    required
                                    name="pcModel"
                                    value={formData.pcModel}
                                    onChange={handleChange}
                                    disabled={isReadOnly}
                                    placeholder={formData.deviceType === 'pc' ? "e.g. Dell OptiPlex" : "e.g. Cisco Switch"}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Serial Number *</label>
                                <input 
                                    required
                                    name="pcSerial"
                                    value={formData.pcSerial}
                                    onChange={handleChange}
                                    disabled={isReadOnly}
                                    placeholder="Enter serial number"
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Department *</label>
                                <select 
                                    required
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    disabled={isReadOnly}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] appearance-none disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">User Name</label>
                                <input 
                                    name="userName"
                                    value={formData.userName}
                                    onChange={handleChange}
                                    disabled={isReadOnly}
                                    placeholder="Enter user's name"
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                <select 
                                    name="status"
                                    value={formData.status}
                                    disabled={isReadOnly}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold appearance-none disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <option value="active" className="text-emerald-600">Active</option>
                                    <option value="failed" className="text-rose-600">Failed</option>
                                    <option value="replaced" className="text-amber-600">Replaced</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {formData.deviceType === 'pc' ? (
                        <>
                            {/* Specifications */}
                            <section className="space-y-4">
                        <div className="flex items-center gap-2 text-[#003135] font-bold">
                            <Cpu size={18} />
                            <h3>System Specifications</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPU</label>
                                <input disabled={isReadOnly} name="cpu" value={formData.cpu} onChange={handleChange} placeholder="i7-10700" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:opacity-70" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GPU</label>
                                <input disabled={isReadOnly} name="gpu" value={formData.gpu} onChange={handleChange} placeholder="GTX 1660" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:opacity-70" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RAM</label>
                                <input disabled={isReadOnly} name="ram" value={formData.ram} onChange={handleChange} placeholder="16GB" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:opacity-70" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Storage</label>
                                <input disabled={isReadOnly} name="storage" value={formData.storage} onChange={handleChange} placeholder="512GB SSD" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:opacity-70" />
                            </div>
                        </div>
                    </section>

                    {/* Network Interfaces */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#003135] font-bold">
                                <div className="w-8 h-8 bg-[#003135]/5 rounded-lg flex items-center justify-center text-[#003135]">
                                    <Network size={18} />
                                </div>
                                <h3>Network Interfaces</h3>
                            </div>
                            {!isReadOnly && (
                                <button 
                                    type="button"
                                    onClick={() => addListItem('networkInterfaces', { 
                                        interfaceName: '', 
                                        ipAddress: '', 
                                        subnetMask: '255.255.255.0', 
                                        gateway: '', 
                                        dns: '', 
                                        macAddress: '', 
                                        type: 'ethernet' 
                                    })}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#003135] hover:text-white text-[#003135] rounded-xl text-xs font-bold transition-all"
                                >
                                    <Plus size={14} /> Add Interface
                                </button>
                            )}
                        </div>
                        <div className="space-y-6">
                            {formData.networkInterfaces.map((iface, idx) => (
                                <div key={idx} className="p-6 bg-slate-50/50 border border-slate-200 rounded-[24px] relative group/item">
                                    {!isReadOnly && (
                                        <button 
                                            type="button"
                                            onClick={() => removeListItem('networkInterfaces', idx)}
                                            className="absolute top-4 right-4 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover/item:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interface Name</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="e.g. LAN, WiFi"
                                                value={iface.interfaceName}
                                                onChange={(e) => handleListChange('networkInterfaces', idx, 'interfaceName', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-bold disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IP Address</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="192.168.1.10"
                                                value={iface.ipAddress}
                                                onChange={(e) => handleListChange('networkInterfaces', idx, 'ipAddress', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-mono text-[#00A3A8] disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subnet Mask</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="255.255.255.0"
                                                value={iface.subnetMask}
                                                onChange={(e) => handleListChange('networkInterfaces', idx, 'subnetMask', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-mono disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Connection Type</label>
                                            <select 
                                                disabled={isReadOnly}
                                                value={iface.type}
                                                onChange={(e) => handleListChange('networkInterfaces', idx, 'type', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-bold appearance-none disabled:bg-slate-50 disabled:opacity-70"
                                            >
                                                <option value="ethernet">Ethernet</option>
                                                <option value="wifi">WiFi</option>
                                                <option value="fiber">Fiber</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gateway</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="192.168.1.1"
                                                value={iface.gateway}
                                                onChange={(e) => handleListChange('networkInterfaces', idx, 'gateway', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-mono disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNS Servers</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="8.8.8.8, 8.8.4.4"
                                                value={iface.dns}
                                                onChange={(e) => handleListChange('networkInterfaces', idx, 'dns', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-mono disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MAC Address</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="00:1A:2B..."
                                                value={iface.macAddress}
                                                onChange={(e) => handleListChange('networkInterfaces', idx, 'macAddress', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-mono disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Software Licenses */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#003135] font-bold">
                                <div className="w-8 h-8 bg-[#003135]/5 rounded-lg flex items-center justify-center text-[#003135]">
                                    <FileText size={18} />
                                </div>
                                <h3>Licensed Software</h3>
                            </div>
                            {!isReadOnly && (
                                <button 
                                    type="button"
                                    onClick={() => addListItem('softwareLicenses', { 
                                        name: '', 
                                        licenseKey: '', 
                                        expiryDate: '', 
                                        licensedTo: '', 
                                        version: '', 
                                        notes: '' 
                                    })}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#003135] hover:text-white text-[#003135] rounded-xl text-xs font-bold transition-all"
                                >
                                    <Plus size={14} /> Add Software
                                </button>
                            )}
                        </div>
                        <div className="space-y-6">
                            {formData.softwareLicenses.map((software, idx) => (
                                <div key={idx} className="p-6 bg-slate-50/50 border border-slate-200 rounded-[24px] relative group/item">
                                    {!isReadOnly && (
                                        <button 
                                            type="button"
                                            onClick={() => removeListItem('softwareLicenses', idx)}
                                            className="absolute top-4 right-4 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover/item:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Software Name</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="e.g. MS Office 2021"
                                                value={software.name}
                                                onChange={(e) => handleListChange('softwareLicenses', idx, 'name', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-bold disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Key</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="XXXXX-XXXXX..."
                                                value={software.licenseKey}
                                                onChange={(e) => handleListChange('softwareLicenses', idx, 'licenseKey', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-mono disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Licensed To</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="Name"
                                                value={software.licensedTo}
                                                onChange={(e) => handleListChange('softwareLicenses', idx, 'licensedTo', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                                            <input 
                                                disabled={isReadOnly}
                                                type="date"
                                                value={software.expiryDate}
                                                onChange={(e) => handleListChange('softwareLicenses', idx, 'expiryDate', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Version</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="v1.0"
                                                value={software.version}
                                                onChange={(e) => handleListChange('softwareLicenses', idx, 'version', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="Additional info"
                                                value={software.notes}
                                                onChange={(e) => handleListChange('softwareLicenses', idx, 'notes', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Monitors */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#003135] font-bold">
                                <div className="w-8 h-8 bg-[#003135]/5 rounded-lg flex items-center justify-center text-[#003135]">
                                    <MonitorIcon size={18} />
                                </div>
                                <h3>Monitors</h3>
                            </div>
                            {!isReadOnly && (
                                <button 
                                    type="button"
                                    onClick={() => addListItem('monitors', { model: '', serial: '' })}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#003135] hover:text-white text-[#003135] rounded-xl text-xs font-bold transition-all"
                                >
                                    <Plus size={14} /> Add Monitor
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {formData.monitors.map((monitor, idx) => (
                                <div key={idx} className="flex gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Model</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="Monitor Model"
                                                value={monitor.model}
                                                onChange={(e) => handleListChange('monitors', idx, 'model', e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-bold disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Serial</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="Monitor Serial"
                                                value={monitor.serial}
                                                onChange={(e) => handleListChange('monitors', idx, 'serial', e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                    </div>
                                    {!isReadOnly && (
                                        <button 
                                            type="button"
                                            onClick={() => removeListItem('monitors', idx)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>


                    {/* IO Devices */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#003135] font-bold">
                                <div className="w-8 h-8 bg-[#003135]/5 rounded-lg flex items-center justify-center text-[#003135]">
                                    <Keyboard size={18} />
                                </div>
                                <h3>IO Devices</h3>
                            </div>
                            {!isReadOnly && (
                                <button 
                                    type="button"
                                    onClick={() => addListItem('ioDevices', { name: '', model: '', serial: '' })}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#003135] hover:text-white text-[#003135] rounded-xl text-xs font-bold transition-all"
                                >
                                    <Plus size={14} /> Add IO Device
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {formData.ioDevices.map((io, idx) => (
                                <div key={idx} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200 flex gap-4 items-end">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Device Name</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="e.g. Keyboard"
                                                value={io.name}
                                                onChange={(e) => handleListChange('ioDevices', idx, 'name', e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm font-bold disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Model</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="Model"
                                                value={io.model}
                                                onChange={(e) => handleListChange('ioDevices', idx, 'model', e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Serial</label>
                                            <input 
                                                disabled={isReadOnly}
                                                placeholder="Serial"
                                                value={io.serial}
                                                onChange={(e) => handleListChange('ioDevices', idx, 'serial', e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] text-sm disabled:bg-slate-50 disabled:opacity-70"
                                            />
                                        </div>
                                    </div>
                                    {!isReadOnly && (
                                        <button 
                                            type="button"
                                            onClick={() => removeListItem('ioDevices', idx)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                        </>
                    ) : (
                        /* Custom Fields for Other Assets */
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#003135] font-bold">
                                    <div className="w-8 h-8 bg-[#003135]/5 rounded-lg flex items-center justify-center text-[#003135]">
                                        <Plus size={18} />
                                    </div>
                                    <h3>Custom Specifications</h3>
                                </div>
                                {!isReadOnly && (
                                    <button 
                                        type="button"
                                        onClick={() => addListItem('customFields', { label: '', value: '' })}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#003135] hover:text-white text-[#003135] rounded-xl text-xs font-bold transition-all"
                                    >
                                        <Plus size={14} /> Add Field
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {formData.customFields.length === 0 && !isReadOnly && (
                                    <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[32px] text-slate-400">
                                        <p className="font-bold">No custom fields added</p>
                                        <p className="text-xs">Add fields like IP Address, Firmware, Port Count, etc.</p>
                                    </div>
                                )}
                                {formData.customFields.map((field, idx) => (
                                    <div key={idx} className="flex gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100 relative group/custom">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Field Name</label>
                                                <input 
                                                    disabled={isReadOnly}
                                                    placeholder="e.g. IP Address"
                                                    value={field.label}
                                                    onChange={(e) => handleListChange('customFields', idx, 'label', e.target.value)}
                                                    className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] font-bold text-[#003135] disabled:opacity-70"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value</label>
                                                <input 
                                                    disabled={isReadOnly}
                                                    placeholder="Enter value"
                                                    value={field.value}
                                                    onChange={(e) => handleListChange('customFields', idx, 'value', e.target.value)}
                                                    className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#003135] disabled:opacity-70"
                                                />
                                            </div>
                                        </div>
                                        {!isReadOnly && (
                                            <button 
                                                type="button"
                                                onClick={() => removeListItem('customFields', idx)}
                                                className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}


                    {/* Inventory Notes */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-[#003135] font-bold">
                            <FileText size={18} />
                            <h3>Inventory Notes</h3>
                        </div>
                        <textarea 
                            disabled={isReadOnly}
                            name="inventoryNotes"
                            value={formData.inventoryNotes}
                            onChange={handleChange}
                            placeholder={isReadOnly ? "No notes available" : "Add any additional notes here..."}
                            rows={3}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[24px] focus:outline-none focus:border-[#003135] focus:bg-white transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                    </section>
                </form>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3 text-slate-500 font-bold hover:text-[#003135] transition-colors"
                    >
                        {isReadOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!isReadOnly && (
                        <button 
                            form="device-form"
                            type="submit"
                            className="px-10 py-4 bg-[#003135] text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#003135]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Save size={20} />
                            {initialData ? 'Update Device' : 'Save Device'}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DeviceForm;
