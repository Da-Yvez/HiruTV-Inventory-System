"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
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
    AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addLog } from '@/lib/utils';
import DeviceForm from './DeviceForm';
import * as XLSX from 'xlsx';

const InventoryTable = ({ isFormOpen, setIsFormOpen, selectedDevice, setSelectedDevice }) => {
    const { currentSite } = useSite();
    const { user } = useAuth();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [isDeptFilterOpen, setIsDeptFilterOpen] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [deviceToDelete, setDeviceToDelete] = useState(null);


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
                    'IP Addresses': device.networkInterfaces?.map(i => i.ipAddress).filter(Boolean).join(', ') || 'N/A',
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
    };

    const handleSave = async (formData) => {
        try {
            const deviceRef = selectedDevice 
                ? doc(db, currentSite.firebaseCollection, selectedDevice.id)
                : doc(collection(db, currentSite.firebaseCollection));
            
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp(),
                updatedBy: user?.displayName || 'System'
            };

            if (!selectedDevice) {
                dataToSave.createdAt = serverTimestamp();
                dataToSave.createdBy = user?.displayName || 'System';
            }

            await setDoc(deviceRef, dataToSave, { merge: true });
            
            if (selectedDevice) {
                await addLog(currentSite, user, 'Device Edited', `Updated device ${formData.pcNumber}`);
            } else {
                await addLog(currentSite, user, 'Device Added', `Added new device ${formData.pcNumber} (${formData.pcModel})`);
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
            // IP Addresses
            device.networkInterfaces?.some(iface => iface.ipAddress?.toLowerCase().includes(s)) ||
            // Monitor Serials
            device.monitors?.some(mon => mon.serial?.toLowerCase().includes(s)) ||
            // IO Device Serials
            device.ioDevices?.some(io => io.serial?.toLowerCase().includes(s));
        
        const matchesDept = selectedDepts.length === 0 || selectedDepts.includes(device.department);

        return matchesSearch && matchesDept;
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
                            placeholder="Search assets, models, or users..."
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
                            {selectedDepts.length === 0 ? 'All Departments' : `${selectedDepts.length} Selected`}
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
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Departments</span>
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
                            ADD DEVICE
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
                    { label: 'Inventory Size', value: devices.length, color: 'text-[#003135]', bg: 'bg-[#003135]/5', icon: Database },
                    { label: 'Active Assets', value: devices.filter(d => d.status === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Activity },
                    { label: 'Dept. Stores', value: devices.filter(d => d.status === 'in-store').length, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Archive },
                    { label: 'Failed/Retired', value: devices.filter(d => ['failed', 'replaced'].includes(d.status)).length, color: 'text-rose-600', bg: 'bg-rose-50', icon: ShieldAlert },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center group hover:shadow-lg transition-all duration-500">
                        <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <stat.icon className={`${stat.color}`} size={20} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                        <p className={`text-4xl font-black mt-2 tracking-tighter ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>


            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#D1DDDE] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                 {/* Tally column hidden per user request */}
                                 {/* {currentSite.name === 'HLS' && <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Tally</th>} */}
                                 <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">PC Number</th>
                                 <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">PC Model</th>
                                 <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">IP ADDR</th>
                                 <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Department</th>
                                 <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                                 <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Added By</th>
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
                                        {/* Tally column hidden per user request */}
                                        {/* {currentSite.name === 'HLS' && (
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => toggleTally(device.id, device.isTallied)}
                                                    className={`p-2 rounded-lg transition-colors ${device.isTallied ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-slate-400'}`}
                                                >
                                                    {device.isTallied ? <CheckSquare size={24} /> : <Square size={24} />}
                                                </button>
                                            </td>
                                        )} */}

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
                                                 <span className="text-sm font-mono font-bold text-[#00A3A8]">{device.networkInterfaces?.[0]?.ipAddress || '---'}</span>
                                                 {device.networkInterfaces?.length > 1 && (
                                                     <span className="text-[10px] text-slate-400 font-bold">+{device.networkInterfaces.length - 1} more</span>
                                                 )}
                                             </div>
                                         </td>
                                         <td className="px-6 py-4">
                                             <span className="inline-flex px-3 py-1 bg-slate-100 text-[#003135] rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                                                 {device.department}
                                             </span>
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
                                         <td className="px-6 py-4">
                                             <span className={`
                                                 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                                 ${device.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''}
                                                 ${device.status === 'in-store' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : ''}
                                                 ${device.status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' : ''}
                                                 ${device.status === 'replaced' ? 'bg-amber-50 text-amber-600 border-amber-100' : ''}
                                             `}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    device.status === 'active' ? 'bg-emerald-500' : 
                                                    device.status === 'in-store' ? 'bg-indigo-500' : 
                                                    device.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'
                                                }`} />
                                                {device.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button 
                                                    onClick={() => handleView(device)}
                                                    className="p-2.5 text-[#003135] bg-slate-50 hover:bg-[#003135] hover:text-white rounded-xl transition-all border border-slate-100" title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => handleEdit(device)}
                                                        className="p-2.5 text-[#003135] bg-slate-50 hover:bg-[#003135] hover:text-white rounded-xl transition-all border border-slate-100" title="Edit Device"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={() => handleDelete(device)}
                                                        className="p-2.5 text-rose-600 bg-slate-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-slate-100" title="Delete Device"
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
                        <p className="text-xl font-bold">No devices found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>

            <DeviceForm 
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
                initialData={selectedDevice}
                departments={currentSite.departments}
                isReadOnly={isViewMode}
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
                                <h3 className="text-2xl font-black text-[#003135] mb-2">Delete Device?</h3>
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
        </div>
    );
};


export default InventoryTable;
