"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, deleteDoc, setDoc, getDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { useSite } from '@/context/SiteContext';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
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
    MoreHorizontal,
    Plus,
    Database,
    Activity,
    ShieldAlert,
    Archive,
    AlertTriangle,
    QrCode,
    Printer,
    X,
    FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addLog, generateQRKey } from '@/lib/utils';
import DeviceForm from './DeviceForm';
import LabelPrintModal from './LabelPrintModal';
import * as XLSX from 'xlsx';

const getDeviceIP = (device) => {
    // Check standard network interfaces first (for PCs)
    if (device.networkInterfaces && device.networkInterfaces.length > 0) {
        const primaryIP = device.networkInterfaces[0].ipAddress;
        if (primaryIP) return primaryIP;
    }
    
    // Check custom fields for "IP Address" or "IP" (for Other Assets)
    if (device.customFields && device.customFields.length > 0) {
        const ipField = device.customFields.find(f => 
            f.label?.toLowerCase() === 'ip address' || 
            f.label?.toLowerCase() === 'ip' ||
            f.label?.toLowerCase() === 'ip addr'
        );
        if (ipField?.value) return ipField.value;
    }
    
    return null;
};

const InventoryTable = ({ isFormOpen, setIsFormOpen, selectedDevice, setSelectedDevice, initialSearch }) => {
    const { currentSite } = useSite();
    const { user } = useAuth();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [isDeptFilterOpen, setIsDeptFilterOpen] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [deviceToDelete, setDeviceToDelete] = useState(null);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [deviceForLabel, setDeviceForLabel] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    
    // SIO active tracking states
    const [activeOutSios, setActiveOutSios] = useState([]);
    const [selectedSioForView, setSelectedSioForView] = useState(null);

    const storesInOutCollectionName = currentSite?.firebaseCollection
        ? currentSite.firebaseCollection.replace('devices_', 'storesInOut_')
        : null;

    useEffect(() => {
        if (!storesInOutCollectionName) {
            setActiveOutSios([]);
            return;
        }

        const q = query(
            collection(db, storesInOutCollectionName),
            where('status', '==', 'approved-out')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setActiveOutSios(list);
        }, (error) => {
            console.error("Error loading active SIO records for inventory:", error);
        });

        return () => unsubscribe();
    }, [storesInOutCollectionName]);


    useEffect(() => {
        if (!currentSite) return;

        const q = query(
            collection(db, currentSite.firebaseCollection),
            orderBy('pcNumber', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // IMPORTANT: Some legacy docs may contain an `id` field in their data.
            // If we spread data after `id: doc.id`, that legacy field would overwrite the real Firestore document id,
            // causing duplicate React keys and breaking edit/delete (wrong doc targeted).
            const deviceList = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            }));

            // DISABLED DEDUPLICATION TO ALLOW MANUAL CLEANUP
            // const uniqueMap = new Map();
            // ...
            const uniqueList = deviceList;
            const sortedDevices = uniqueList.sort((a, b) =>
                (a.pcNumber || '').localeCompare(b.pcNumber || '', undefined, { numeric: true, sensitivity: 'base' })
            );

            setDevices(sortedDevices);
            setLoading(false);
        }, (error) => {
            console.error("Inventory listener error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentSite]);

    useEffect(() => {
        if (initialSearch && devices.length > 0) {
            setSearchTerm(initialSearch);
            // Auto-open if there's an exact match
            const exactMatch = devices.find(d => d.pcNumber === initialSearch);
            if (exactMatch) {
                handleView(exactMatch);
            }
        }
    }, [initialSearch, devices.length]);

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

    const handleEdit = (device) => {
        setIsViewMode(false);
        setSelectedDevice(device);
        setIsFormOpen(true);
    };

    const handleView = (device) => {
        setIsViewMode(true);
        setSelectedDevice(device);
        setIsFormOpen(true);
    };

    const handleDelete = (device) => {
        setDeviceToDelete(device);
    };

    const handlePrintLabel = (device) => {
        setDeviceForLabel(device);
        setIsLabelModalOpen(true);
    };

    const handlePrintSio = (record) => {
        const printWindow = window.open('', '_blank', 'width=900,height=750');
        
        const itemsRows = record.items.map(item => `
            <tr>
                <td style="border: 1px solid #000; padding: 8px; font-family: monospace; font-weight: bold; font-size: 11px;">${item.pcNumber}</td>
                <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${item.brand || ''} ${item.pcModel || ''}</td>
                <td style="border: 1px solid #000; padding: 8px; font-family: monospace; font-size: 11px;">${item.pcSerial || '---'}</td>
                <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${item.department || '---'}${item.subCategory ? ` / ${item.subCategory}` : ''}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 11px;">${item.quantity}</td>
            </tr>
        `).join('');

        const html = `
            <html>
            <head>
                <title>Stores ${record.type?.toUpperCase()} - ${record.docNo}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 30px;
                        color: #000;
                    }
                    .header-container {
                        text-align: center;
                        border-bottom: 2px double #000;
                        padding-bottom: 12px;
                        margin-bottom: 30px;
                    }
                    .header-title {
                        font-size: 21px;
                        font-weight: 900;
                        text-transform: uppercase;
                        margin: 0;
                        letter-spacing: 0.5px;
                    }
                    .header-subtitle {
                        font-size: 16px;
                        font-weight: bold;
                        margin: 6px 0 3px 0;
                    }
                    .header-address {
                        font-size: 11px;
                        margin: 0;
                        color: #444;
                        line-height: 1.4;
                    }
                    .doc-title {
                        font-size: 18px;
                        font-weight: bold;
                        text-decoration: underline;
                        text-align: center;
                        margin: 20px 0;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .meta-table {
                        width: 100%;
                        margin-bottom: 30px;
                        border-collapse: collapse;
                    }
                    .meta-table td {
                        padding: 7px 5px;
                        font-size: 12px;
                        vertical-align: top;
                    }
                    .meta-label {
                        font-weight: bold;
                        width: 18%;
                        color: #222;
                    }
                    .meta-value {
                        width: 32%;
                        border-bottom: 1px dotted #ccc;
                    }
                    .items-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 50px;
                        font-size: 12px;
                    }
                    .items-table th {
                        border: 1px solid #000;
                        padding: 10px 8px;
                        background-color: #f5f5f5;
                        font-weight: bold;
                        text-align: left;
                        text-transform: uppercase;
                        font-size: 10px;
                        letter-spacing: 0.5px;
                    }
                    .sig-section {
                        margin-top: 80px;
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .sig-section td {
                        width: 25%;
                        text-align: center;
                        font-size: 11px;
                        padding-top: 50px;
                        font-weight: bold;
                    }
                    .sig-line {
                        border-top: 1px solid #000;
                        width: 85%;
                        margin: 0 auto 6px auto;
                    }
                    @media print {
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header-container">
                    <div class="header-title">Asia Broadcasting Corporation (Pvt) Ltd</div>
                    <div class="header-subtitle">Hiru Life Studio</div>
                    <div class="header-address">
                        No. 507-509. Nagahamulla Junction, Pannipitiya Road, Pelawatta<br>
                        Tel: 0112-22221999
                    </div>
                </div>

                <div class="doc-title">Stores ${record.type === 'in' ? 'IN' : 'OUT'}</div>

                <table class="meta-table">
                    <tr>
                        <td class="meta-label">Doc No:</td>
                        <td class="meta-value" style="font-family: monospace; font-weight: bold;">${record.docNo}</td>
                        <td class="meta-label">Date & Time:</td>
                        <td class="meta-value">${record.dateStr}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">From:</td>
                        <td class="meta-value">${record.fromLocation}</td>
                        <td class="meta-label">To:</td>
                        <td class="meta-value">${record.toLocation}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Event Name:</td>
                        <td class="meta-value">${record.eventName}</td>
                        <td class="meta-label">Assigned To:</td>
                        <td class="meta-value">${record.assignedTo}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">EPF Number:</td>
                        <td class="meta-value">${record.epfNumber}</td>
                        <td class="meta-label">Created By:</td>
                        <td class="meta-value">${record.createdBy}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Picked Up By:</td>
                        <td class="meta-value">${record.pickedUpBy}</td>
                        <td class="meta-label">Remarks:</td>
                        <td class="meta-value">${record.remarks || '---'}</td>
                    </tr>
                </table>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Barcode</th>
                            <th>Model</th>
                            <th>Serial</th>
                            <th>Category</th>
                            <th style="text-align: right; width: 80px;">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <table class="sig-section">
                    <tr>
                        <td>
                            <div class="sig-line"></div>
                            Date
                        </td>
                        <td>
                            <div class="sig-line"></div>
                            Security Officer
                        </td>
                        <td>
                            <div class="sig-line"></div>
                            Authorized by
                        </td>
                        <td>
                            <div class="sig-line"></div>
                            Picked up by
                        </td>
                    </tr>
                </table>

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const confirmDelete = async () => {
        if (!deviceToDelete) return;

        try {
            await deleteDoc(doc(db, currentSite.firebaseCollection, deviceToDelete.id));
            await addLog(currentSite, user, 'Device Deleted', `Deleted device ${deviceToDelete.pcNumber} (${deviceToDelete.pcModel})`);
        } catch (error) {
            console.error("Error deleting device:", error);
            alert("Failed to delete device.");
        } finally {
            setDeviceToDelete(null);
        }
    };

    const handleExport = () => {
        const prepareExportData = (dataList) => {
            return dataList.map(device => {
                const data = {
                    'Asset ID': device.pcNumber,
                    'Model/Type': device.pcModel,
                    'Serial Number': device.pcSerial,
                    'Department': device.department,
                    'User': device.userName || 'Unassigned',
                    'Status': device.status?.toUpperCase(),
                    'IP Addresses': [
                        ...(device.networkInterfaces?.map(i => i.ipAddress) || []),
                        ...(device.customFields?.filter(f => 
                            f.label?.toLowerCase() === 'ip address' || 
                            f.label?.toLowerCase() === 'ip'
                        ).map(f => f.value) || [])
                    ].filter(Boolean).join(', ') || 'N/A',
                };

                if (!device.deviceType || device.deviceType === 'pc') {
                    data['CPU'] = device.cpu || '';
                    data['RAM'] = device.ram || '';
                    data['Storage'] = device.storage || '';
                    data['GPU'] = device.gpu || '';
                    data['Monitors'] = device.monitors?.map(m => `${m.model} (${m.serial})`).join(' | ') || '';
                    data['IO Devices'] = device.ioDevices?.map(i => `${i.name}: ${i.model}`).join(' | ') || '';
                    data['Software'] = device.softwareLicenses?.map(s => s.name).join(', ') || '';
                } else {
                    device.customFields?.forEach(field => {
                        if (field.label) data[field.label] = field.value;
                    });
                }

                data['Notes'] = device.inventoryNotes || '';
                data['Added By'] = device.createdBy || 'System';
                data['Created Date'] = device.createdAt ? new Date(device.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';

                return data;
            });
        };

        const workbook = XLSX.utils.book_new();

        // 1. Mixed List (Current Filters)
        const mixedData = prepareExportData(filteredDevices);
        const mixedSheet = XLSX.utils.json_to_sheet(mixedData);
        XLSX.utils.book_append_sheet(workbook, mixedSheet, "Mixed Inventory");

        // 2. Active Assets
        const activeDevices = filteredDevices.filter(d => d.status === 'active');
        if (activeDevices.length > 0) {
            const activeData = prepareExportData(activeDevices);
            const activeSheet = XLSX.utils.json_to_sheet(activeData);
            XLSX.utils.book_append_sheet(workbook, activeSheet, "Active Assets");
        }

        // 3. Department Stores (In-Store)
        const storeDevices = filteredDevices.filter(d => d.status === 'in-store');
        if (storeDevices.length > 0) {
            const storeData = prepareExportData(storeDevices);
            const storeSheet = XLSX.utils.json_to_sheet(storeData);
            XLSX.utils.book_append_sheet(workbook, storeSheet, "Department Stores");
        }

        const fileName = `${currentSite.name}_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        // Log the export
        addLog(currentSite, user, 'Inventory Exported', `Exported ${filteredDevices.length} device(s) to ${fileName}`);
    };

    const handleSave = async (formData) => {
        try {
            // Use PC Number as the Primary Key (Document ID)
            // Sanitize it to replace slashes with dashes for valid Firestore paths
            const sanitizedId = formData.pcNumber.replace(/\//g, '-').trim();
            const deviceRef = doc(db, currentSite.firebaseCollection, sanitizedId);

            // 1. Perform a deep check for uniqueness across the whole collection
            const q = query(
                collection(db, currentSite.firebaseCollection),
                where('pcNumber', '==', formData.pcNumber.trim())
            );
            const querySnapshot = await getDocs(q);

            // If we found a document with this PC Number (or Barcode)
            if (!querySnapshot.empty) {
                const duplicateDoc = querySnapshot.docs[0];

                // CRITICAL FIX: If we are editing, and the "duplicate" we found is actually 
                // the clean ID we are trying to move to, ALLOW IT. This fixes the legacy ID migration issue.
                const isMigratingToCleanId = selectedDevice && duplicateDoc.id === sanitizedId;

                if (!isMigratingToCleanId && (!selectedDevice || duplicateDoc.id !== selectedDevice.id)) {
                    const identifierLabel = currentSite.id === 'hlse' ? 'Barcode' : 'PC Number';
                    alert(`Error: A device with ${identifierLabel} "${formData.pcNumber}" already exists in ${currentSite.name}.`);
                    return;
                }
            }

            // 2. Perform a check for uniqueness of Serial Number (pcSerial) if site is hlse
            if (currentSite.id === 'hlse' && formData.pcSerial) {
                const qSerial = query(
                    collection(db, currentSite.firebaseCollection),
                    where('pcSerial', '==', formData.pcSerial.trim())
                );
                const serialSnapshot = await getDocs(qSerial);
                if (!serialSnapshot.empty) {
                    const duplicateDoc = serialSnapshot.docs[0];
                    if (!selectedDevice || duplicateDoc.id !== selectedDevice.id) {
                        alert(`Error: A device with Serial Number "${formData.pcSerial}" already exists in ${currentSite.name}.`);
                        return;
                    }
                }
            }

            const isRenamingDoc = selectedDevice && selectedDevice.id !== sanitizedId;
            const isChangingPcNumber = selectedDevice && selectedDevice.pcNumber !== formData.pcNumber.trim();

            // Maintain a list of old PC Numbers so printed QR codes never break
            const legacyKeys = selectedDevice?.legacyKeys || [];
            if (isChangingPcNumber && !legacyKeys.includes(selectedDevice.pcNumber)) {
                legacyKeys.push(selectedDevice.pcNumber);
            }

            const dataToSave = {
                ...formData,
                qrKey: formData.qrKey || selectedDevice?.qrKey || generateQRKey(),
                legacyKeys,
                updatedAt: serverTimestamp(),
                updatedBy: user?.displayName || 'System'
            };

            if (!selectedDevice) {
                dataToSave.createdAt = serverTimestamp();
                dataToSave.createdBy = user?.displayName || 'System';
            }

            if (isRenamingDoc) {
                // Make rename atomic: write new doc + delete old doc together.
                const batch = writeBatch(db);
                batch.set(deviceRef, dataToSave, { merge: true });
                batch.delete(doc(db, currentSite.firebaseCollection, selectedDevice.id));
                await batch.commit();
            } else {
                await setDoc(deviceRef, dataToSave, { merge: true });
            }

            if (selectedDevice) {
                const actionText = currentSite.id === 'hlse' ? 'Item Edited' : 'Device Edited';
                const logText = currentSite.id === 'hlse' ? `Updated item ${formData.pcNumber}` : `Updated device ${formData.pcNumber}`;
                await addLog(currentSite, user, actionText, logText);
            } else {
                const actionText = currentSite.id === 'hlse' ? 'Item Added' : 'Device Added';
                const logText = currentSite.id === 'hlse' ? `Added new item ${formData.pcNumber} (${formData.pcModel})` : `Added new device ${formData.pcNumber} (${formData.pcModel})`;
                await addLog(currentSite, user, actionText, logText);
            }

            setIsFormOpen(false);
            setSelectedDevice(null);
        } catch (error) {
            console.error("Error saving device:", error);
            alert("Failed to save device. Check console for details.");
        }
    };


    const filteredDevices = devices.filter(device => {
        const s = searchTerm.toLowerCase();
        const matchesSearch =
            (device.pcNumber?.toLowerCase().includes(s)) ||
            (device.pcModel?.toLowerCase().includes(s)) ||
            (device.pcSerial?.toLowerCase().includes(s)) ||
            (device.userName?.toLowerCase().includes(s)) ||
            (device.brand?.toLowerCase().includes(s)) ||
            // IP Addresses
            device.networkInterfaces?.some(iface => iface.ipAddress?.toLowerCase().includes(s)) ||
            device.customFields?.some(f => 
                (f.label?.toLowerCase() === 'ip address' || f.label?.toLowerCase() === 'ip') && 
                f.value?.toLowerCase().includes(s)
            ) ||
            // Monitor Serials
            device.monitors?.some(mon => mon.serial?.toLowerCase().includes(s)) ||
            // IO Device Serials
            device.ioDevices?.some(io => io.serial?.toLowerCase().includes(s));

        const matchesDept = selectedDepts.length === 0 || selectedDepts.includes(device.department);

        let matchesStatus = true;
        if (statusFilter === 'active') {
            matchesStatus = device.status === 'active';
        } else if (statusFilter === 'in-store') {
            matchesStatus = device.status === 'in-store';
        } else if (statusFilter === 'failed') {
            matchesStatus = ['failed', 'replaced'].includes(device.status);
        }

        return matchesSearch && matchesDept && matchesStatus;
    });

    const canAdd = hasPermission(user, 'canAdd', currentSite);
    const canEdit = hasPermission(user, 'canEdit', currentSite);
    const canDelete = hasPermission(user, 'canDelete', currentSite);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-32 text-slate-400">
                <div className="relative">
                    <RefreshCcw className="animate-spin text-orange-500/20" size={60} />
                    <RefreshCcw className="animate-spin absolute inset-0 text-orange-500 blur-[1px]" size={60} />
                </div>
                <p className="font-black text-orange-600 mt-6 tracking-widest uppercase text-xs">Syncing Digital Assets</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl shadow-[#003135]/5 border border-slate-100">
                <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003135] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder={currentSite?.id === 'hlse' ? "Search items, models, or brands..." : "Search assets, models, or users..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-medium text-[#003135]"
                        />
                    </div>
                    <div className="relative w-full sm:w-72 group">
                        <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003135] transition-colors" size={20} />
                        <button
                            onClick={() => setIsDeptFilterOpen(!isDeptFilterOpen)}
                            className="w-full pl-14 pr-10 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] text-left overflow-hidden whitespace-nowrap"
                        >
                            {selectedDepts.length === 0 ? (currentSite?.id === 'hlse' ? 'All Categories' : 'All Departments') : `${selectedDepts.length} Selected`}
                        </button>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                            <MoreHorizontal size={18} />
                        </div>

                        {/* Multi-select Dropdown */}
                        <AnimatePresence>
                            {isDeptFilterOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setIsDeptFilterOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-40 overflow-hidden"
                                    >
                                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentSite?.id === 'hlse' ? 'Select Categories' : 'Select Departments'}</span>
                                            {selectedDepts.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedDepts([])}
                                                    className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-2">
                                            {currentSite.departments.map(dept => (
                                                <label
                                                    key={dept}
                                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDepts.includes(dept)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedDepts([...selectedDepts, dept]);
                                                            } else {
                                                                setSelectedDepts(selectedDepts.filter(d => d !== dept));
                                                            }
                                                        }}
                                                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-[#003135] focus:ring-[#003135]"
                                                    />
                                                    <span className={`text-sm font-bold ${selectedDepts.includes(dept) ? 'text-[#003135]' : 'text-slate-500'}`}>
                                                        {dept}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {canAdd && (
                        <button
                                onClick={() => { setSelectedDevice(null); setIsViewMode(false); setIsFormOpen(true); }}
                                className="flex items-center gap-3 px-8 py-4 bg-[#003135] text-white rounded-[24px] font-black tracking-wide hover:bg-[#004145] transition-all shadow-xl shadow-[#003135]/20 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus size={22} strokeWidth={3} />
                                {currentSite?.id === 'hlse' ? 'ADD ITEM' : 'ADD DEVICE'}
                            </button>
                    )}
                    <button
                        onClick={handleExport}
                        className="flex items-center justify-center w-[60px] h-[60px] bg-emerald-50 text-emerald-600 rounded-[24px] hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                        title="Export to Excel"
                    >
                        <Download size={22} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { 
                        id: 'all', 
                        label: currentSite?.id === 'hlse' ? 'Total Items' : 'Inventory Size', 
                        value: devices.length, 
                        color: 'text-[#003135]', 
                        bg: 'bg-[#003135]/5', 
                        icon: Database,
                        activeColor: 'text-[#003135]',
                        activeBg: 'bg-[#003135]/10',
                        activeBorder: 'border-[#003135]',
                        activeShadow: 'shadow-lg shadow-[#003135]/10 bg-[#003135]/5',
                        badgeBg: 'bg-[#003135]'
                    },
                    { 
                        id: 'active', 
                        label: currentSite?.id === 'hlse' ? 'Active Items' : 'Active Assets', 
                        value: devices.filter(d => d.status === 'active').length, 
                        color: 'text-emerald-600', 
                        bg: 'bg-emerald-50', 
                        icon: Activity,
                        activeColor: 'text-emerald-600',
                        activeBg: 'bg-emerald-100',
                        activeBorder: 'border-emerald-500',
                        activeShadow: 'shadow-lg shadow-emerald-500/10 bg-emerald-50/50',
                        badgeBg: 'bg-emerald-500'
                    },
                    { 
                        id: 'in-store', 
                        label: currentSite?.id === 'hlse' ? 'Category Stores' : 'Dept. Stores', 
                        value: devices.filter(d => d.status === 'in-store').length, 
                        color: 'text-indigo-600', 
                        bg: 'bg-indigo-50', 
                        icon: Archive,
                        activeColor: 'text-indigo-600',
                        activeBg: 'bg-indigo-100',
                        activeBorder: 'border-indigo-500',
                        activeShadow: 'shadow-lg shadow-indigo-500/10 bg-indigo-50/50',
                        badgeBg: 'bg-indigo-500'
                    },
                    { 
                        id: 'failed', 
                        label: 'Failed/Retired', 
                        value: devices.filter(d => ['failed', 'replaced'].includes(d.status)).length, 
                        color: 'text-rose-600', 
                        bg: 'bg-rose-50', 
                        icon: ShieldAlert,
                        activeColor: 'text-rose-600',
                        activeBg: 'bg-rose-100',
                        activeBorder: 'border-rose-500',
                        activeShadow: 'shadow-lg shadow-rose-500/10 bg-rose-50/50',
                        badgeBg: 'bg-rose-500'
                    },
                ].map((stat) => {
                    const isActive = statusFilter === stat.id;
                    const isAnyActive = statusFilter !== 'all';
                    
                    return (
                        <button
                            key={stat.id}
                            onClick={() => {
                                if (stat.id === 'all') {
                                    setStatusFilter('all');
                                } else {
                                    setStatusFilter(statusFilter === stat.id ? 'all' : stat.id);
                                }
                            }}
                            className={`w-full text-center bg-white p-8 rounded-[40px] flex flex-col items-center group transition-all duration-300 relative border-2 
                                ${isActive 
                                    ? `${stat.activeBorder} ${stat.activeShadow} scale-[1.02]` 
                                    : 'border-transparent shadow-sm hover:shadow-md hover:border-slate-100 hover:scale-[1.01]'
                                }
                                ${isAnyActive && !isActive ? 'opacity-70 hover:opacity-100' : 'opacity-100'}
                            `}
                        >
                            {/* Active Indicator Badge */}
                            {isActive && (
                                <div className={`absolute top-4 right-6 w-2.5 h-2.5 rounded-full ${stat.badgeBg} animate-pulse`} />
                            )}
                            
                            <div className={`w-12 h-12 ${isActive ? stat.activeBg : stat.bg} rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110 duration-300`}>
                                <stat.icon className={isActive ? stat.activeColor : stat.color} size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                            <p className={`text-4xl font-black mt-2 tracking-tighter ${isActive ? stat.activeColor : stat.color}`}>{stat.value}</p>
                        </button>
                    );
                })}
            </div>


            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#D1DDDE] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            {currentSite?.id === 'hlse' ? (
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Barcode</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Serial Number</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Brand</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Model</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            ) : (
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    {/* Tally column hidden per user request */}
                                    {/* {currentSite.name === 'Life Studio' && <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Tally</th>} */}
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">PC Number</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">PC Model</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">IP ADDR</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Department</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Added By</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            )}
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
                                        {currentSite?.id === 'hlse' ? (
                                            <>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-[#003135]/5 rounded-xl flex items-center justify-center text-[#003135] font-black text-sm">
                                                            {device.pcNumber?.slice(-2)}
                                                        </div>
                                                        <span className="text-base font-bold text-[#003135]">{device.pcNumber}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-mono font-bold text-slate-700">{device.pcSerial || 'N/A'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-[#00A3A8] font-bold">{device.brand || '---'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-600 font-semibold">{device.pcModel}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className="inline-flex px-3 py-1 bg-slate-100 text-[#003135] rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                                                            {device.department}
                                                        </span>
                                                        {device.subCategory && (
                                                            <span className="text-[10px] text-slate-400 font-bold tracking-wider pl-1">
                                                                ↳ {device.subCategory}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className="text-sm font-bold text-slate-700">{device.quantity ?? 1}</span>
                                                        {currentSite?.id === 'hlse' && (() => {
                                                            const matchedSios = activeOutSios.filter(sio => sio.items?.some(i => i.id === device.id));
                                                            if (matchedSios.length === 0) return null;
                                                            const totalOut = matchedSios.reduce((acc, sio) => acc + (sio.items?.find(i => i.id === device.id)?.quantity || 0), 0);
                                                            return (
                                                                <button
                                                                    onClick={() => setSelectedSioForView(matchedSios[0])}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black tracking-wide border border-amber-200 transition-colors cursor-pointer mt-1"
                                                                    title={`Click to view SIO: ${matchedSios[0].docNo}`}
                                                                >
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                    {totalOut} Out ({matchedSios[0].eventName})
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-[#003135]/5 rounded-xl flex items-center justify-center text-[#003135] font-black text-sm">
                                                            {device.pcNumber?.slice(-2)}
                                                        </div>
                                                        <span className="text-base font-bold text-[#003135]">{device.pcNumber}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-600 font-semibold">{device.pcModel}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-mono font-bold text-[#00A3A8]">{getDeviceIP(device) || '---'}</span>
                                                        {device.networkInterfaces?.length > 1 && (
                                                            <span className="text-[10px] text-slate-400 font-bold">+{device.networkInterfaces.length - 1} more</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className="inline-flex px-3 py-1 bg-slate-100 text-[#003135] rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                                                            {device.department}
                                                        </span>
                                                        {device.subCategory && (
                                                            <span className="text-[10px] text-slate-400 font-bold tracking-wider pl-1">
                                                                ↳ {device.subCategory}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-[#003135]/20" />
                                                        <span className="text-sm font-bold text-slate-700">{device.userName || 'Unassigned'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-500">{device.createdBy || 'System'}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {device.createdAt ? new Date(device.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`
                                                 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                                 ${device.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''}
                                                 ${device.status === 'in-store' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : ''}
                                                 ${device.status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' : ''}
                                                 ${device.status === 'replaced' ? 'bg-amber-50 text-amber-600 border-amber-100' : ''}
                                             `}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${device.status === 'active' ? 'bg-emerald-500' :
                                                        device.status === 'in-store' ? 'bg-indigo-500' :
                                                            device.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'
                                                    }`} />
                                                {device.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 opacity-85 hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handlePrintLabel(device)}
                                                    className="p-2.5 text-[#003135] bg-slate-50 hover:bg-[#003135] hover:text-white rounded-xl transition-all border border-slate-100" title={currentSite?.id === 'hlse' ? "Print Item Label" : "Print Asset Label"}
                                                >
                                                    <QrCode size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleView(device)}
                                                    className="p-2.5 text-[#003135] bg-slate-50 hover:bg-[#003135] hover:text-white rounded-xl transition-all border border-slate-100" title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleEdit(device)}
                                                        className="p-2.5 text-[#003135] bg-slate-50 hover:bg-[#003135] hover:text-white rounded-xl transition-all border border-slate-100" title={currentSite?.id === 'hlse' ? "Edit Item" : "Edit Device"}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(device)}
                                                        className="p-2.5 text-rose-600 bg-slate-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-slate-100" title={currentSite?.id === 'hlse' ? "Delete Item" : "Delete Device"}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
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
                        <p className="text-xl font-bold">{currentSite?.id === 'hlse' ? 'No items found' : 'No devices found'}</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>

            <DeviceForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedDevice(null);
                }}
                onSave={handleSave}
                initialData={selectedDevice}
                departments={currentSite.departments}
                subcategories={currentSite.subcategories || {}}
                isReadOnly={isViewMode}
                collectionName={currentSite?.firebaseCollection}
            />

            <LabelPrintModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                device={deviceForLabel}
            />

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {deviceToDelete && (
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
                                <h3 className="text-2xl font-black text-[#003135] mb-2">{currentSite?.id === 'hlse' ? 'Delete Item?' : 'Delete Device?'}</h3>
                                <p className="text-slate-500 font-medium mb-8">
                                    Are you sure you want to permanently delete
                                    <span className="font-bold text-[#003135]"> {deviceToDelete.pcNumber} </span>?
                                    This action cannot be undone.
                                </p>

                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => setDeviceToDelete(null)}
                                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-[#003135] rounded-2xl font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Delete Forever
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SIO Details Modal from Inventory Dashboard */}
            <AnimatePresence>
                {selectedSioForView && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto space-y-6 flex flex-col"
                        >
                            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-[#003135]/5 rounded-2xl flex items-center justify-center text-[#003135]">
                                        <FileText size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[#003135]">{selectedSioForView.docNo}</h3>
                                        <p className="text-xs text-slate-400 font-semibold">{selectedSioForView.dateStr}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedSioForView(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm flex-1">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Type</span>
                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100">
                                        OUT (Deduct Stock)
                                    </span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">From</span>
                                    <span className="font-bold text-[#003135]">{selectedSioForView.fromLocation}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">To</span>
                                    <span className="font-bold text-[#003135]">{selectedSioForView.toLocation}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Event Name</span>
                                    <span className="font-bold text-[#003135]">{selectedSioForView.eventName}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Assigned To</span>
                                    <span className="font-bold text-[#003135]">{selectedSioForView.assignedTo}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">EPF Number</span>
                                    <span className="font-bold text-[#003135]">{selectedSioForView.epfNumber}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Created By</span>
                                    <span className="font-bold text-[#003135]">{selectedSioForView.createdBy}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Picked Up By</span>
                                    <span className="font-bold text-[#003135]">{selectedSioForView.pickedUpBy}</span>
                                </div>
                                <div className="space-y-0.5 col-span-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Remarks</span>
                                    <span className="font-bold text-slate-600">{selectedSioForView.remarks || '---'}</span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <h4 className="font-black text-[#003135] text-sm tracking-tight uppercase">SIO Items</h4>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-5 py-3">Barcode</th>
                                                <th className="px-5 py-3">Model</th>
                                                <th className="px-5 py-3">Serial</th>
                                                <th className="px-5 py-3">Category</th>
                                                <th className="px-5 py-3 text-right">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm font-bold">
                                            {selectedSioForView.items?.map((i) => (
                                                <tr key={i.id}>
                                                    <td className="px-5 py-2.5 font-mono text-[#003135]">{i.pcNumber}</td>
                                                    <td className="px-5 py-2.5 text-slate-600">{i.brand} {i.pcModel}</td>
                                                    <td className="px-5 py-2.5 font-mono text-slate-500">{i.pcSerial || '---'}</td>
                                                    <td className="px-5 py-2.5 text-slate-500">{i.department || '---'}{i.subCategory ? ` / ${i.subCategory}` : ''}</td>
                                                    <td className="px-5 py-2.5 text-right text-slate-700">{i.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                                <span>Decision: <span className="uppercase font-black text-emerald-600">{selectedSioForView.status}</span></span>
                                <span>Handled By: <span className="text-slate-600 font-black">{selectedSioForView.approvedBy}</span></span>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-4 -mx-8 -mb-8 rounded-b-[32px]">
                                <button
                                    onClick={() => handlePrintSio(selectedSioForView)}
                                    className="px-5 py-3 bg-slate-100 text-[#003135] hover:bg-slate-200 rounded-2xl font-bold flex items-center gap-1.5 transition-all mr-auto"
                                >
                                    <Printer size={16} />
                                    Print Document
                                </button>
                                <button onClick={() => setSelectedSioForView(null)} className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-[#003135] rounded-2xl font-bold transition-all">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default InventoryTable;
