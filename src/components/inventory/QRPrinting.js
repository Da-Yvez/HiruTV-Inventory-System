"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useSite } from '@/context/SiteContext';
import { useAuth } from '@/context/AuthContext';
import { addLog } from '@/lib/utils';
import { 
    Printer, 
    Filter, 
    CheckSquare, 
    Square, 
    ChevronRight, 
    AlertCircle,
    Loader2,
    FileText,
    Grid,
    Layout,
    ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const QRPrinting = () => {
    const { currentSite } = useSite();
    const { user } = useAuth();
    const printRef = React.useRef(null);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('All');
    const [devices, setDevices] = useState([]);
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);

    // Fetch unique departments from current site's inventory
    useEffect(() => {
        const fetchData = async () => {
            if (!currentSite) return;
            setLoading(true);
            try {
                const q = query(collection(db, currentSite.firebaseCollection), orderBy('pcNumber', 'asc'));
                const snapshot = await getDocs(q);
                // Keep the real Firestore document id even if legacy docs store an `id` field.
                const allDevices = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
                    .sort((a, b) => a.pcNumber.localeCompare(b.pcNumber, undefined, { numeric: true, sensitivity: 'base' }));
                
                const depts = ['All', ...new Set(allDevices.map(d => d.department))].filter(Boolean);
                setDepartments(depts);
                setDevices(allDevices);
            } catch (error) {
                console.error("Error fetching devices for printing:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentSite]);

    const filteredDevices = selectedDept === 'All' 
        ? devices 
        : devices.filter(d => d.department === selectedDept);

    const toggleDevice = (id) => {
        setSelectedDevices(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedDevices.length === filteredDevices.length) {
            setSelectedDevices([]);
        } else {
            setSelectedDevices(filteredDevices.map(d => d.id));
        }
    };

    const handlePrint = () => {
        if (!printRef.current) return;
        
        const printWindow = window.open('', '_blank', 'width=800,height=1000');
        const content = printRef.current.innerHTML;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print QR Labels - ${currentSite?.name}</title>
                    <style>
                        @page { size: A4; margin: 0; }
                        body { 
                            margin: 0; 
                            padding: 10mm; 
                            font-family: system-ui, -apple-system, sans-serif;
                            background: white;
                        }
                        .print-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            column-gap: 5mm;
                            row-gap: 8mm;
                        }
                        .asset-label-print {
                            break-inside: avoid;
                            page-break-inside: avoid;
                            border: 1px solid #e2e8f0;
                            display: flex;
                            width: 95mm;
                            height: 52mm;
                            padding: 6mm;
                            box-sizing: border-box;
                            align-items: center;
                            gap: 6mm;
                            position: relative;
                            overflow: hidden;
                            border-radius: 12px;
                            background: white;
                            color: #003135;
                        }
                        .bg-accent {
                            position: absolute;
                            top: 0;
                            right: 0;
                            width: 120px;
                            height: 120px;
                            background: #f8fafc;
                            border-radius: 50%;
                            margin-right: -60px;
                            margin-top: -60px;
                            z-index: 0;
                        }
                        .qr-section {
                            position: relative;
                            z-index: 10;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 8px;
                        }
                        .info-section {
                            flex: 1;
                            position: relative;
                            z-index: 10;
                            min-width: 0;
                        }
                        .side-text {
                            position: absolute;
                            right: -28px;
                            top: 50%;
                            transform: translateY(-50%) rotate(90deg);
                            font-size: 8px;
                            font-weight: 900;
                            text-transform: uppercase;
                            letter-spacing: 0.4em;
                            opacity: 0.1;
                            white-space: nowrap;
                        }
                        .label-title-group { margin-bottom: 8px; }
                        .site-name { font-size: 9px; font-weight: 900; opacity: 0.5; letter-spacing: 0.2em; text-transform: uppercase; margin: 0; }
                        .main-title { font-size: 18px; font-weight: 900; margin: 2px 0 0 0; }
                        .field-group { margin-bottom: 8px; }
                        .field-label { font-size: 7px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
                        .field-value { font-size: 13px; font-weight: 900; margin: 0; word-break: break-all; }
                        .row { display: flex; gap: 16px; }
                        .status-active { color: #10b981; }
                        .scan-hint { font-size: 6px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; }
                        svg { width: 110px; height: 110px; }
                    </style>
                </head>
                <body>
                    <div class="print-grid">
                        ${content}
                    </div>
                    <script>
                        // Auto-trigger print
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                // Optional: window.close();
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        // Log the QR print batch
        const printedDeviceIds = selectedDevices
            .map(id => filteredDevices.find(d => d.id === id)?.pcNumber)
            .filter(Boolean)
            .join(', ');
        addLog(currentSite, user, 'QR Labels Printed', `Printed ${selectedDevices.length} label(s): ${printedDeviceIds}`);
    };

    const PrintPreview = () => (
        <div className="print-area hidden print:block bg-white">
            <div className="print-grid grid grid-cols-2 gap-[5mm]">
                {filteredDevices.filter(d => selectedDevices.includes(d.id)).map(device => {
                    const publicId = device.qrKey || device.pcNumber.replace(/\//g, '-').trim();
                    const scanUrl = `${window.location.origin}/scan/${encodeURIComponent(publicId)}`;
                    
                    return (
                        <div key={device.id} className="asset-label-print w-[95mm] h-[50mm] border border-slate-300 rounded-lg p-4 flex items-center gap-4 bg-white overflow-hidden relative">
                             {/* QR Code */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <QRCodeSVG 
                                    value={scanUrl} 
                                    size={100}
                                    level="H"
                                    includeMargin={false}
                                />
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-tight">Scan for Details</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                    <p className="text-[8px] font-black text-[#003135] uppercase tracking-widest opacity-50">{currentSite?.name}</p>
                                    <h2 className="text-sm font-black text-[#003135] leading-none uppercase">IT Asset Label</h2>
                                </div>
                                <div className="space-y-1">
                                    <div>
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Asset ID</p>
                                        <p className="text-sm font-black text-[#003135] truncate leading-tight">{device.pcNumber}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Dept</p>
                                            <p className="text-[9px] font-bold text-slate-600 truncate uppercase">{device.department}</p>
                                        </div>
                                        <div>
                                            <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                                            <p className="text-[9px] font-bold text-slate-600 truncate uppercase">{device.deviceType}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Side Text */}
                            <div className="absolute -right-6 top-1/2 -translate-y-1/2 rotate-90 opacity-10">
                                <span className="text-[8px] font-black whitespace-nowrap tracking-widest uppercase">
                                    {currentSite?.fullName}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <style jsx global>{`
                .print-hidden-container {
                    position: absolute;
                    left: -9999px;
                    top: -9999px;
                    visibility: hidden;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );

    return (
        <div className="space-y-8 no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Printer size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#003135]">QR Batch Printing</h2>
                        <p className="text-xs text-slate-500 font-medium">Generate and print standardized asset labels in bulk</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <Filter size={14} className="text-slate-400" />
                        <select 
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-transparent text-xs font-bold text-[#003135] focus:outline-none min-w-[120px]"
                        >
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handlePrint}
                        disabled={selectedDevices.length === 0}
                        className="px-6 py-2 bg-[#003135] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-[#003135]/10"
                    >
                        <Printer size={16} />
                        Print Selected ({selectedDevices.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                    <p className="text-slate-500 font-bold animate-pulse">Loading Inventory...</p>
                </div>
            ) : (
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                            <FileText size={14} />
                            Select Assets to Finalize
                        </div>
                        <button 
                            onClick={toggleAll}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            {selectedDevices.length === filteredDevices.length ? <CheckSquare size={16} /> : <Square size={16} />}
                            {selectedDevices.length === filteredDevices.length ? 'Deselect All' : 'Select All Filtered'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {filteredDevices.map((device) => {
                            const isSelected = selectedDevices.includes(device.id);
                            return (
                                <motion.div 
                                    key={device.id}
                                    whileHover={{ y: -2 }}
                                    onClick={() => toggleDevice(device.id)}
                                    className={`
                                        cursor-pointer p-4 rounded-2xl border-2 transition-all group
                                        ${isSelected 
                                            ? 'border-[#00A3A8] bg-[#F0FDFD] shadow-md' 
                                            : 'border-slate-100 bg-white hover:border-slate-200'}
                                    `}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`
                                            w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                            ${isSelected ? 'bg-[#00A3A8] text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'}
                                        `}>
                                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </div>
                                        <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                            {device.department}
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-black text-[#003135] leading-tight mb-1">{device.pcNumber}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold truncate">{device.user}</p>
                                </motion.div>
                            );
                        })}
                    </div>

                    {filteredDevices.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <AlertCircle size={40} className="mb-4 opacity-20" />
                            <p className="font-bold">No devices found in this department.</p>
                        </div>
                    )}
                </div>
            )}


            {/* Hidden container to generate HTML for the print window */}
            <div className="print-hidden-container">
                <div ref={printRef}>
                    {filteredDevices.filter(d => selectedDevices.includes(d.id)).map(device => {
                        const publicId = device.qrKey || device.pcNumber.replace(/\//g, '-').trim();
                        const scanUrl = `${window.location.origin}/scan/${encodeURIComponent(publicId)}`;
                        
                        return (
                            <div key={device.id} className="asset-label-print">
                                <div className="bg-accent"></div>
                                
                                <div className="qr-section">
                                    <QRCodeSVG 
                                        value={scanUrl} 
                                        size={110} 
                                        level="H"
                                        includeMargin={false}
                                    />
                                    <span className="scan-hint">Scan or Click to View</span>
                                </div>

                                <div className="info-section">
                                    <div className="label-title-group">
                                        <p className="site-name">{currentSite?.name}</p>
                                        <h2 className="main-title">IT ASSET</h2>
                                    </div>

                                    <div className="field-group">
                                        <p className="field-label">Asset ID / PC Number</p>
                                        <p className="field-value">{device.pcNumber}</p>
                                    </div>

                                    <div className="row">
                                        <div className="field-group">
                                            <p className="field-label">Department</p>
                                            <p className="field-value" style={{ fontSize: '10px' }}>{device.department}</p>
                                        </div>
                                        <div className="field-group">
                                            <p className="field-label">Status</p>
                                            <p className="field-value status-active" style={{ fontSize: '10px' }}>{device.status || 'ACTIVE'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="side-text">
                                    {currentSite?.fullName}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default QRPrinting;
