"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { useSite } from '@/context/SiteContext';
import { useAuth } from '@/context/AuthContext';
import { addLog } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    addDoc,
    setDoc,
    getDoc,
    getDocs, 
    updateDoc, 
    deleteDoc,
    serverTimestamp 
} from 'firebase/firestore';
import { 
    Plus, 
    Search, 
    Trash2, 
    Check, 
    X, 
    ArrowLeftRight, 
    Calendar, 
    FileText, 
    User, 
    ClipboardList,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Eye,
    Edit2,
    ChevronRight,
    ArrowDownLeft,
    ArrowUpRight,
    Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StoresInOut = ({ activeSection = 'storesInOut_active' }) => {
    const { currentSite } = useSite();
    const { user } = useAuth();
    
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    
    // Verification states inside approvals modal
    const [checkedItems, setCheckedItems] = useState({});
    const [statementChecked, setStatementChecked] = useState(false);
    
    // Create IN specific states
    const [selectedOutRecord, setSelectedOutRecord] = useState(null);
    const [returnItemsChecked, setReturnItemsChecked] = useState({});
    
    // Form states
    const [docNo, setDocNo] = useState('');
    const [dateStr, setDateStr] = useState('');
    const [type, setType] = useState('out'); // 'in' or 'out'
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [eventName, setEventName] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [epfNumber, setEpfNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [pickedUpBy, setPickedUpBy] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    
    // Inventory picker states
    const [inventory, setInventory] = useState([]);
    const [searchItemTerm, setSearchItemTerm] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [formSaving, setFormSaving] = useState(false);
    
    // Modal state for two-sided item selection
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [tempSelectedItems, setTempSelectedItems] = useState([]);
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const [modalAddQuantities, setModalAddQuantities] = useState({});
    
    const storesInOutCollectionName = currentSite?.firebaseCollection
        ? currentSite.firebaseCollection.replace('devices_', 'storesInOut_')
        : null;

    // Load SIO Records
    useEffect(() => {
        if (!storesInOutCollectionName) return;

        setLoading(true);
        const q = query(
            collection(db, storesInOutCollectionName),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRecords(list);
            setLoading(false);
        }, (error) => {
            console.error("Error loading SIO records:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [storesInOutCollectionName]);

    // Load Site Inventory
    const loadInventory = async () => {
        if (!currentSite?.firebaseCollection) return;
        try {
            const invQ = query(collection(db, currentSite.firebaseCollection), orderBy('pcNumber', 'asc'));
            const invSnap = await getDocs(invQ);
            const items = invSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const siteId = currentSite?.id;
            const allowedDeptsForSite = user?.allowedDepartments?.[siteId] || [];
            const hasDeptRestriction = !user?.isSuperAdmin && allowedDeptsForSite.length > 0;
            const filteredItems = hasDeptRestriction
                ? items.filter(d => allowedDeptsForSite.includes(d.department))
                : items;

            setInventory(filteredItems);
        } catch (error) {
            console.error("Error loading inventory:", error);
        }
    };

    // Helper to generate a new unique Doc No for OUT SIO
    const generateDocNo = async () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const datePrefix = `${yyyy}${mm}${dd}`;
        const docPrefix = `SIO${datePrefix}`;
        
        try {
            const q = query(
                collection(db, storesInOutCollectionName),
                where('docNo', '>=', docPrefix),
                where('docNo', '<=', docPrefix + '\uf8ff')
            );
            const snap = await getDocs(q);
            const todayOutCount = snap.docs.filter(doc => doc.data().type === 'out').length;
            return `${docPrefix}-${todayOutCount + 1}-O`;
        } catch (error) {
            console.error("Error getting today count:", error);
            return `${docPrefix}-1-O`;
        }
    };

    // Open Create OUT Modal
    const handleOpenCreateOut = async () => {
        if (!storesInOutCollectionName) return;
        
        setIsEditMode(false);
        setEditingId(null);
        setType('out');
        setSelectedOutRecord(null);
        
        setFromLocation('');
        setToLocation('');
        setEventName('');
        setAssignedTo('');
        setEpfNumber('');
        setRemarks('');
        setPickedUpBy('');
        setSelectedItems([]);
        setSearchItemTerm('');
        
        const now = new Date();
        const dateOptions = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: true 
        };
        setDateStr(now.toLocaleString('en-US', dateOptions));

        const newDocNo = await generateDocNo();
        setDocNo(newDocNo);

        await loadInventory();
        setIsCreateOpen(true);
    };

    // Open Create IN Modal
    const handleOpenCreateIn = async () => {
        if (!storesInOutCollectionName) return;
        
        setIsEditMode(false);
        setEditingId(null);
        setType('in');
        setSelectedOutRecord(null);
        setReturnItemsChecked({});
        
        setFromLocation('');
        setToLocation('');
        setEventName('');
        setAssignedTo('');
        setEpfNumber('');
        setRemarks('');
        setPickedUpBy('');
        setSelectedItems([]);
        
        const now = new Date();
        const dateOptions = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: true 
        };
        setDateStr(now.toLocaleString('en-US', dateOptions));

        setDocNo('Pending SIO Selection...');

        setIsCreateOpen(true);
    };

    // Select approved-out record to autofill IN SIO
    const handleSelectOutRecord = (record) => {
        setSelectedOutRecord(record);
        
        // Auto-fill metadata from the OUT SIO
        setFromLocation(record.toLocation); // Inverting locations
        setToLocation(record.fromLocation);
        setEventName(record.eventName);
        setAssignedTo(record.assignedTo);
        setEpfNumber(record.epfNumber);
        setRemarks(`Returning items from SIO: ${record.docNo}`);
        setPickedUpBy(record.pickedUpBy);

        const outDocNo = record.docNo;
        const derivedInDocNo = outDocNo.endsWith('-O') 
            ? outDocNo.slice(0, -2) + '-I' 
            : outDocNo.endsWith('-OUT') 
                ? outDocNo.slice(0, -4) + '-IN' 
                : outDocNo + '-I';
        setDocNo(derivedInDocNo);
        
        // Populate items with checkmarks defaulted to false
        const initialChecks = {};
        record.items.forEach(item => {
            initialChecks[item.id] = false;
        });
        setReturnItemsChecked(initialChecks);
    };

    // Toggle return verification check for IN items
    const handleReturnItemCheckToggle = (itemId) => {
        setReturnItemsChecked(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Open Edit Modal (only for pending documents)
    const handleOpenEdit = async (record) => {
        if (record.status !== 'pending') {
            alert("Only SIO forms with PENDING status can be edited.");
            return;
        }

        setIsEditMode(true);
        setEditingId(record.id);
        
        setDocNo(record.docNo);
        setDateStr(record.dateStr);
        setType(record.type || 'out');
        setFromLocation(record.fromLocation);
        setToLocation(record.toLocation);
        setEventName(record.eventName);
        setAssignedTo(record.assignedTo);
        setEpfNumber(record.epfNumber);
        setRemarks(record.remarks || '');
        setPickedUpBy(record.pickedUpBy);
        
        await loadInventory();
        
        const mappedItems = record.items.map(item => {
            const invItem = inventory.find(inv => inv.id === item.id);
            return {
                id: item.id,
                pcNumber: item.pcNumber,
                pcModel: item.pcModel,
                brand: item.brand || '---',
                quantity: item.quantity,
                maxQty: invItem ? (invItem.quantity ?? 1) : item.quantity,
                pcSerial: item.pcSerial || '---',
                department: item.department || '---',
                subCategory: item.subCategory || ''
            };
        });
        setSelectedItems(mappedItems);
        setIsCreateOpen(true);
    };

    // Delete Record (only for pending documents, unless user is Super Admin)
    const handleDeleteRecord = async (record) => {
        const isSuperAdminUser = user?.isSuperAdmin === true;
        
        if (record.status !== 'pending' && !isSuperAdminUser) {
            alert("Only Super Administrators can delete non-pending SIO forms.");
            return;
        }

        const confirmMsg = `Are you sure you want to delete SIO Form ${record.docNo}? Warning: This will permanently remove the transaction record.`;
        if (!window.confirm(confirmMsg)) return;

        try {
            const docRef = doc(db, storesInOutCollectionName, record.id);
            await deleteDoc(docRef);
            
            addLog(
                currentSite, 
                user, 
                'SIO Deleted', 
                `Deleted SIO Form: ${record.docNo} (Status: ${record.status})`
            );
        } catch (error) {
            console.error("Error deleting SIO record:", error);
            alert("Failed to delete SIO Form.");
        }
    };

    const handleAddItem = (item) => {
        if (selectedItems.some(i => i.id === item.id)) return;
        
        setSelectedItems([...selectedItems, {
            id: item.id,
            pcNumber: item.pcNumber,
            pcModel: item.pcModel,
            brand: item.brand || '---',
            quantity: 1,
            maxQty: item.quantity ?? 1,
            pcSerial: item.pcSerial || '---',
            department: item.department || '---',
            subCategory: item.subCategory || ''
        }]);
        setSearchItemTerm('');
        setShowItemDropdown(false);
    };

    const handleRemoveItem = (itemId) => {
        setSelectedItems(selectedItems.filter(i => i.id !== itemId));
    };

    const handleQtyChange = (itemId, newQty) => {
        const qty = parseInt(newQty) || 1;
        setSelectedItems(selectedItems.map(item => {
            if (item.id === itemId) {
                const max = type === 'out' ? item.maxQty : 999999;
                return { ...item, quantity: Math.min(Math.max(1, qty), max) };
            }
            return item;
        }));
    };

    const handleOpenItemModal = () => {
        setTempSelectedItems([...selectedItems]);
        setModalSearchTerm('');
        
        // Initialize add quantities for each inventory item to 1
        const initialAddQtys = {};
        inventory.forEach(item => {
            initialAddQtys[item.id] = 1;
        });
        setModalAddQuantities(initialAddQtys);
        setIsItemModalOpen(true);
    };

    const handleConfirmItemModal = () => {
        setSelectedItems(tempSelectedItems);
        setIsItemModalOpen(false);
    };

    const handleAddTempItem = (item, qtyToAdd) => {
        if (tempSelectedItems.some(i => i.id === item.id)) return;
        
        const quantity = Math.min(Math.max(1, parseInt(qtyToAdd) || 1), item.quantity ?? 1);
        
        setTempSelectedItems([...tempSelectedItems, {
            id: item.id,
            pcNumber: item.pcNumber,
            pcModel: item.pcModel,
            brand: item.brand || '---',
            quantity: quantity,
            maxQty: item.quantity ?? 1,
            pcSerial: item.pcSerial || '---',
            department: item.department || '---',
            subCategory: item.subCategory || ''
        }]);
    };

    const handleRemoveTempItem = (itemId) => {
        setTempSelectedItems(tempSelectedItems.filter(i => i.id !== itemId));
    };

    const handleTempQtyChange = (itemId, newQty) => {
        const qty = parseInt(newQty) || 1;
        setTempSelectedItems(tempSelectedItems.map(item => {
            if (item.id === itemId) {
                return { ...item, quantity: Math.min(Math.max(1, qty), item.maxQty) };
            }
            return item;
        }));
    };

    const handleModalAddQtyChange = (itemId, val, maxQty) => {
        const parsed = parseInt(val) || 1;
        const qty = Math.min(Math.max(1, parsed), maxQty);
        setModalAddQuantities(prev => ({
            ...prev,
            [itemId]: qty
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Items check for IN vs OUT
        let finalItems = [];
        if (type === 'out') {
            if (selectedItems.length === 0) {
                alert("Please add at least one item.");
                return;
            }
            const hasOverdrawn = selectedItems.some(i => i.quantity > i.maxQty);
            if (hasOverdrawn) {
                alert("One or more items exceed current in-stock quantity!");
                return;
            }
            finalItems = selectedItems.map(i => ({
                id: i.id,
                pcNumber: i.pcNumber,
                pcModel: i.pcModel,
                brand: i.brand,
                quantity: i.quantity,
                pcSerial: i.pcSerial || '---',
                department: i.department || '---',
                subCategory: i.subCategory || ''
            }));
        } else {
            // IN: Must check/verify returned items
            const returned = selectedOutRecord.items.filter(item => returnItemsChecked[item.id]);
            if (returned.length === 0) {
                alert("Please check/select at least one item you are returning.");
                return;
            }
            finalItems = returned.map(i => ({
                id: i.id,
                pcNumber: i.pcNumber,
                pcModel: i.pcModel,
                brand: i.brand || '---',
                quantity: i.quantity,
                pcSerial: i.pcSerial || '---',
                department: i.department || '---',
                subCategory: i.subCategory || ''
            }));
        }

        setFormSaving(true);
        try {
            const payload = {
                docNo,
                dateStr,
                type,
                fromLocation,
                toLocation,
                eventName,
                assignedTo,
                epfNumber,
                remarks,
                pickedUpBy,
                createdBy: user?.displayName || user?.email || 'Unknown User',
                items: finalItems,
                status: 'pending',
                createdAt: serverTimestamp()
            };

            if (type === 'in' && selectedOutRecord) {
                payload.linkedOutDocId = selectedOutRecord.id;
                payload.linkedOutDocNo = selectedOutRecord.docNo;
            }

            if (isEditMode && editingId) {
                const docRef = doc(db, storesInOutCollectionName, editingId);
                await setDoc(docRef, payload, { merge: true });
                addLog(
                    currentSite, 
                    user, 
                    'SIO Updated', 
                    `Updated pending SIO Form: ${docNo}`
                );
            } else {
                await addDoc(collection(db, storesInOutCollectionName), payload);
                addLog(
                    currentSite, 
                    user, 
                    'SIO Created', 
                    `Created pending SIO ${type.toUpperCase()} Form: ${docNo}`
                );
            }

            setIsCreateOpen(false);
        } catch (error) {
            console.error("Error saving SIO record:", error);
            alert("Failed to save SIO Form.");
        } finally {
            setFormSaving(false);
        }
    };

    const handleOpenDetails = (record) => {
        setSelectedRecord(record);
        setCheckedItems({});
        setStatementChecked(false);
        setIsDetailsOpen(true);
    };

    const handleItemCheckToggle = (itemId) => {
        setCheckedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const handleUpdateStatus = async (recordId, newStatus) => {
        if (!storesInOutCollectionName) return;

        try {
            const docRef = doc(db, storesInOutCollectionName, recordId);
            const targetRecord = records.find(r => r.id === recordId);
            
            let finalStatus = newStatus;
            
            if (newStatus === 'approved') {
                // Determine approved status code
                finalStatus = targetRecord.type === 'in' ? 'completed' : 'approved-out';
                
                const inventoryUpdates = [];
                for (const item of targetRecord.items) {
                    const devRef = doc(db, currentSite.firebaseCollection, item.id);
                    const devSnap = await getDoc(devRef);
                    
                    if (!devSnap.exists()) {
                        throw new Error(`Item ${item.pcNumber} does not exist in inventory.`);
                    }
                    
                    const currentQty = devSnap.data().quantity ?? 0;
                    let newQty = currentQty;
                    
                    if (targetRecord.type === 'out') {
                        newQty = currentQty - item.quantity;
                        if (newQty < 0) {
                            throw new Error(`Insufficient stock for ${item.pcNumber}. Available: ${currentQty}, Requested: ${item.quantity}`);
                        }
                    } else if (targetRecord.type === 'in') {
                        newQty = currentQty + item.quantity;
                    }
                    
                    inventoryUpdates.push({ ref: devRef, qty: newQty });
                }
                
                // Write updates to Firestore
                for (const update of inventoryUpdates) {
                    await updateDoc(update.ref, { quantity: update.qty });
                }

                // If this was an IN approval, mark the linked OUT record as completed too!
                if (targetRecord.type === 'in' && targetRecord.linkedOutDocId) {
                    const outRef = doc(db, storesInOutCollectionName, targetRecord.linkedOutDocId);
                    await updateDoc(outRef, { status: 'completed' });
                }
            }

            await updateDoc(docRef, {
                status: finalStatus,
                approvedBy: user?.displayName ? (user.epfNumber ? `${user.displayName} (${user.epfNumber})` : user.displayName) : (user?.email || 'Unknown User'),
                approvedAt: serverTimestamp()
            });

            addLog(
                currentSite, 
                user, 
                newStatus === 'approved' ? 'SIO Approved' : 'SIO Rejected', 
                `${newStatus === 'approved' ? 'Approved' : 'Rejected'} SIO ${targetRecord.type?.toUpperCase()} Form: ${targetRecord?.docNo}`
            );
        } catch (error) {
            console.error("Error updating SIO status:", error);
            alert(error.message || "Failed to update status.");
        }
    };

    // Print Document layout
    const handlePrint = (record) => {
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
                    <div class="header-subtitle">Hiru Life Studios</div>
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
                    ${record.approvedBy ? `
                    <tr>
                        <td class="meta-label">Approved By:</td>
                        <td class="meta-value" colspan="3" style="font-weight: bold;">${record.approvedBy}</td>
                    </tr>
                    ` : ''}
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
                            <div style="height: 20px;"></div>
                            <div class="sig-line"></div>
                            Date
                        </td>
                        <td>
                            <div style="height: 20px;"></div>
                            <div class="sig-line"></div>
                            Security Officer
                        </td>
                        <td>
                            <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; margin-bottom: 3px; height: 17px; text-transform: capitalize;">
                                ${record.approvedBy ? record.approvedBy.split(' ')[0].split('(')[0] : ''}
                            </div>
                            <div class="sig-line"></div>
                            Authorized by
                        </td>
                        <td>
                            <div style="height: 20px;"></div>
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

    // Filter list records based on activeSection
    const getFilteredRecords = () => {
        if (activeSection === 'storesInOut_approvals') {
            return records.filter(r => r.status === 'pending');
        } else if (activeSection === 'storesInOut_outside') {
            return records.filter(r => r.status === 'approved-out');
        } else if (activeSection === 'storesInOut_completed') {
            return records.filter(r => r.status === 'completed');
        } else {
            return records.filter(r => r.status === 'pending' || r.status === 'rejected');
        }
    };

    const filteredRecords = getFilteredRecords();

    const getPageTitle = () => {
        if (activeSection === 'storesInOut_approvals') return 'SIO Approvals';
        if (activeSection === 'storesInOut_outside') return 'Outside SIO';
        if (activeSection === 'storesInOut_completed') return 'Completed SIO';
        return 'Item In and Out';
    };

    const getPageDesc = () => {
        if (activeSection === 'storesInOut_approvals') return 'Approve or reject pending Item In and Out forms';
        if (activeSection === 'storesInOut_outside') return 'View items currently dispatched and outside';
        if (activeSection === 'storesInOut_completed') return 'View transaction history of fully completed SIO logs';
        return 'Create and manage item movements across departments and events';
    };

    // Get list of currently outside records to select for returns
    const outsideRecords = records.filter(r => r.status === 'approved-out');

    const isApprovalAllowed = selectedRecord && 
        selectedRecord.items?.every(item => checkedItems[item.id]) && 
        statementChecked;

    const filteredInventory = inventory.filter(item => {
        const query = searchItemTerm.toLowerCase();
        return (
            item.pcNumber?.toLowerCase().includes(query) ||
            item.pcModel?.toLowerCase().includes(query) ||
            item.brand?.toLowerCase().includes(query)
        );
    });

    const modalFilteredInventory = inventory.filter(item => {
        if (!modalSearchTerm) return true;
        const query = modalSearchTerm.toLowerCase();
        return (
            item.pcNumber?.toLowerCase().includes(query) ||
            item.pcModel?.toLowerCase().includes(query) ||
            item.brand?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#003135] tracking-tight">{getPageTitle()}</h1>
                    <p className="text-slate-500 font-medium">{getPageDesc()}</p>
                </div>

                {activeSection === 'storesInOut_active' && hasPermission(user, 'canCreateSIO', currentSite) && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleOpenCreateOut}
                            className="flex items-center gap-2 px-5 py-3 bg-[#003135] text-white rounded-2xl font-black text-sm tracking-wide hover:bg-[#004145] transition-all shadow-xl shadow-[#003135]/10 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <ArrowUpRight size={18} strokeWidth={2.5} />
                            Create OUT SIO
                        </button>
                        <button
                            onClick={handleOpenCreateIn}
                            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm tracking-wide hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/10 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <ArrowDownLeft size={18} strokeWidth={2.5} />
                            Create IN SIO
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-[#D1DDDE] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Doc No</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Event Name</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">From</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">To</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Created By</th>
                                {(activeSection === 'storesInOut_outside' || activeSection === 'storesInOut_completed') && (
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Approved By</th>
                                )}
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={(activeSection === 'storesInOut_outside' || activeSection === 'storesInOut_completed') ? 10 : 9} className="py-20 text-center text-slate-400 font-bold">
                                        No records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-[#003135] text-sm">{r.docNo}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border
                                                ${r.type === 'in' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}
                                            `}>
                                                {r.type === 'in' ? 'IN' : 'OUT'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">{r.dateStr}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{r.eventName}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{r.fromLocation}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{r.toLocation}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{r.createdBy}</td>
                                        {(activeSection === 'storesInOut_outside' || activeSection === 'storesInOut_completed') && (
                                            <td className="px-6 py-4 text-sm font-bold text-slate-600">{r.approvedBy || '---'}</td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                                ${r.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''}
                                                ${r.status === 'approved-out' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : ''}
                                                ${r.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : ''}
                                                ${r.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : ''}
                                            `}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${r.status === 'completed' ? 'bg-emerald-500' : r.status === 'approved-out' ? 'bg-indigo-500' : r.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handlePrint(r)}
                                                    className="p-2 bg-slate-50 text-[#003135] hover:bg-slate-100 rounded-xl transition-all"
                                                    title="Print SIO Document"
                                                >
                                                    <Printer size={15} />
                                                </button>

                                                {activeSection === 'storesInOut_approvals' ? (
                                                    <button
                                                        onClick={() => handleOpenDetails(r)}
                                                        className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all text-xs font-black inline-flex items-center gap-1 shadow-sm"
                                                    >
                                                        <Check size={14} strokeWidth={2.5} />
                                                        Approve
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenDetails(r)}
                                                        className="p-2 bg-slate-50 text-[#003135] hover:bg-slate-100 rounded-xl transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                )}

                                                {/* Only allow edit if status is pending, in active view, and has create permissions */}
                                                {activeSection === 'storesInOut_active' && r.status === 'pending' && hasPermission(user, 'canCreateSIO', currentSite) && (
                                                    <button
                                                        onClick={() => handleOpenEdit(r)}
                                                        className="p-2 bg-slate-50 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                                        title="Edit Form"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                )}

                                                {/* Allow delete if it's pending (for operators), OR if the user is a Super Administrator (for any status) */}
                                                {((activeSection === 'storesInOut_active' && r.status === 'pending' && hasPermission(user, 'canCreateSIO', currentSite)) ||
                                                  user?.isSuperAdmin === true
                                                 ) && (
                                                    <button
                                                        onClick={() => handleDeleteRecord(r)}
                                                        className="p-2 bg-slate-50 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                        title="Delete Form"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Creation/Edit Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h2 className="text-2xl font-black text-[#003135] tracking-tight">
                                        {isEditMode ? 'Edit SIO Form' : (type === 'out' ? 'Create OUT SIO Form' : 'Create IN SIO Form')}
                                    </h2>
                                    <p className="text-slate-500 font-medium">Complete the document configuration below</p>
                                </div>
                                <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Doc No (Autogenerated)</label>
                                        <div className="w-full px-5 py-3 bg-slate-100 border-2 border-slate-100 rounded-2xl font-mono font-bold text-slate-500 select-none">
                                            {docNo}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date & Time (Autogenerated)</label>
                                        <div className="w-full px-5 py-3 bg-slate-100 border-2 border-slate-100 rounded-2xl font-bold text-slate-500 select-none">
                                            {dateStr}
                                        </div>
                                    </div>
                                </div>

                                {/* IF IN TYPE: SELECT AN APPROVED OUT RECORD FIRST */}
                                {type === 'in' && !isEditMode && (
                                    <div className="space-y-2 p-5 bg-blue-50/40 border-2 border-dashed border-blue-150 rounded-2xl">
                                        <label className="text-xs font-black text-blue-700 uppercase tracking-wider block">1. Select Approved OUT SIO Record</label>
                                        <select 
                                            value={selectedOutRecord ? selectedOutRecord.id : ''} 
                                            onChange={(e) => {
                                                const rec = outsideRecords.find(o => o.id === e.target.value);
                                                if (rec) handleSelectOutRecord(rec);
                                            }}
                                            className="w-full px-5 py-3 bg-white border-2 border-blue-100 rounded-2xl focus:outline-none focus:border-blue-600 transition-all font-bold text-[#003135] appearance-none"
                                        >
                                            <option value="">-- Choose Dispatched SIO --</option>
                                            {outsideRecords.map(o => (
                                                <option key={o.id} value={o.id}>{o.docNo} - {o.eventName} (Assigned: {o.assignedTo})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Metadata fields (Disabled/Read-Only if IN is selected) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From Location *</label>
                                        <input 
                                            required 
                                            disabled={type === 'in'}
                                            value={fromLocation} 
                                            onChange={(e) => setFromLocation(e.target.value)} 
                                            placeholder="e.g. Main Stores" 
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] disabled:bg-slate-100 disabled:text-slate-500" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To Location *</label>
                                        <input 
                                            required 
                                            disabled={type === 'in'}
                                            value={toLocation} 
                                            onChange={(e) => setToLocation(e.target.value)} 
                                            placeholder="e.g. Studio 02" 
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] disabled:bg-slate-100 disabled:text-slate-500" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Name *</label>
                                        <input 
                                            required 
                                            disabled={type === 'in'}
                                            value={eventName} 
                                            onChange={(e) => setEventName(e.target.value)} 
                                            placeholder="e.g. Live Music Show" 
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] disabled:bg-slate-100 disabled:text-slate-500" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned To *</label>
                                        <input 
                                            required 
                                            disabled={type === 'in'}
                                            value={assignedTo} 
                                            onChange={(e) => setAssignedTo(e.target.value)} 
                                            placeholder="e.g. Navendra" 
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] disabled:bg-slate-100 disabled:text-slate-500" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">EPF Number *</label>
                                        <input 
                                            required 
                                            disabled={type === 'in'}
                                            value={epfNumber} 
                                            onChange={(e) => setEpfNumber(e.target.value)} 
                                            placeholder="e.g. EPF-9281" 
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] disabled:bg-slate-100 disabled:text-slate-500" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Created By</label>
                                        <div className="w-full px-5 py-3 bg-slate-100 border-2 border-slate-100 rounded-2xl font-bold text-slate-500 select-none">
                                            {user?.displayName || user?.email}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Picked Up By *</label>
                                        {currentSite?.pickupUsers && currentSite.pickupUsers.length > 0 ? (
                                            <select
                                                required
                                                disabled={type === 'in'}
                                                value={pickedUpBy}
                                                onChange={(e) => setPickedUpBy(e.target.value)}
                                                className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] disabled:bg-slate-100 disabled:text-slate-500"
                                            >
                                                <option value="">-- Select Pickup Person --</option>
                                                {currentSite.pickupUsers.map(p => {
                                                    const formatted = `${p.name} (${p.epf ? p.epf : p.nic})`;
                                                    return (
                                                        <option key={p.id} value={formatted}>{formatted}</option>
                                                    );
                                                })}
                                            </select>
                                        ) : (
                                            <input 
                                                required 
                                                disabled={type === 'in'}
                                                value={pickedUpBy} 
                                                onChange={(e) => setPickedUpBy(e.target.value)} 
                                                placeholder="e.g. Gayan" 
                                                className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135] disabled:bg-slate-100 disabled:text-slate-500" 
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                                        <input 
                                            value={remarks} 
                                            onChange={(e) => setRemarks(e.target.value)} 
                                            placeholder="e.g. Return in 3 days" 
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#003135] focus:bg-white transition-all font-bold text-[#003135]" 
                                        />
                                    </div>
                                </div>

                                {/* Items segment (OUT vs IN layout) */}
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    {type === 'out' ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-black text-[#003135]">Dispatched Items *</h4>
                                                
                                                <button
                                                    type="button"
                                                    onClick={handleOpenItemModal}
                                                    className="flex items-center gap-2 px-4 py-2 bg-[#003135] text-white rounded-xl font-bold text-xs hover:bg-[#004a50] transition-colors shadow-md shadow-[#003135]/10"
                                                >
                                                    <Plus size={14} />
                                                    Add / Manage Items
                                                </button>
                                            </div>

                                            {/* Selected Items Grid List */}
                                            {selectedItems.length === 0 ? (
                                                <div className="py-8 text-center bg-slate-50/50 border-2 border-dashed border-slate-150 rounded-2xl text-slate-400 text-sm font-bold">
                                                    No items added yet. Search and select items above.
                                                </div>
                                            ) : (
                                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-5 py-3.5">Barcode / ID</th>
                                                                <th className="px-5 py-3.5">Brand & Model</th>
                                                                <th className="px-5 py-3.5 w-40">Qty (Adjustable)</th>
                                                                <th className="px-5 py-3.5 text-right w-20">Remove</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 text-sm font-bold">
                                                            {selectedItems.map((i) => (
                                                                <tr key={i.id}>
                                                                    <td className="px-5 py-3 font-mono text-[#003135]">{i.pcNumber}</td>
                                                                    <td className="px-5 py-3 text-slate-600">{i.brand} {i.pcModel}</td>
                                                                    <td className="px-5 py-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <input 
                                                                                type="number"
                                                                                min="1"
                                                                                max={i.maxQty}
                                                                                value={i.quantity}
                                                                                onChange={(e) => handleQtyChange(i.id, e.target.value)}
                                                                                className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center focus:outline-none focus:border-[#003135]"
                                                                            />
                                                                            <span className="text-[10px] text-slate-400">/ Max {i.maxQty}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3 text-right">
                                                                        <button type="button" onClick={() => handleRemoveItem(i.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        // IN (Return) Items listing: must confirm return of items
                                        <div className="space-y-3">
                                            <h4 className="font-black text-[#003135] text-sm">2. Check items you are returning back to stores *</h4>
                                            
                                            {!selectedOutRecord ? (
                                                <div className="py-8 text-center bg-slate-50/50 border-2 border-dashed border-slate-150 rounded-2xl text-slate-400 text-sm font-bold">
                                                    Please select an approved OUT SIO form first to load items.
                                                </div>
                                            ) : (
                                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-5 py-3.5 w-16 text-center">Return</th>
                                                                <th className="px-5 py-3.5">Barcode / ID</th>
                                                                <th className="px-5 py-3.5">Brand & Model</th>
                                                                <th className="px-5 py-3.5 text-right w-24">Out Qty</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 text-sm font-bold">
                                                            {selectedOutRecord.items.map((i) => (
                                                                <tr key={i.id} className={returnItemsChecked[i.id] ? 'bg-blue-50/20' : ''}>
                                                                    <td className="px-5 py-3 text-center">
                                                                        <input 
                                                                            type="checkbox"
                                                                            checked={!!returnItemsChecked[i.id]}
                                                                            onChange={() => handleReturnItemCheckToggle(i.id)}
                                                                            className="w-4.5 h-4.5 accent-blue-600 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-5 py-3 font-mono text-[#003135]">{i.pcNumber}</td>
                                                                    <td className="px-5 py-3 text-slate-600">{i.brand} {i.pcModel}</td>
                                                                    <td className="px-5 py-3 text-right text-slate-700">{i.quantity}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setIsCreateOpen(false)} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-[#003135] rounded-2xl font-bold transition-all">
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={formSaving || (type === 'out' ? selectedItems.length === 0 : !selectedOutRecord)} 
                                        className="px-8 py-3.5 bg-[#003135] hover:bg-[#004145] text-white rounded-2xl font-black tracking-wide shadow-lg shadow-[#003135]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {formSaving ? 'Saving...' : 'Save & Submit SIO'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Detailed Verification/Review Modal */}
            <AnimatePresence>
                {isDetailsOpen && selectedRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                                        <h3 className="text-xl font-black text-[#003135]">{selectedRecord.docNo}</h3>
                                        <p className="text-xs text-slate-400 font-semibold">{selectedRecord.dateStr}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm flex-1">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Type</span>
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                                        ${selectedRecord.type === 'in' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}
                                    `}>
                                        {selectedRecord.type === 'in' ? 'IN (Add Stock)' : 'OUT (Deduct Stock)'}
                                    </span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">From</span>
                                    <span className="font-bold text-[#003135]">{selectedRecord.fromLocation}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">To</span>
                                    <span className="font-bold text-[#003135]">{selectedRecord.toLocation}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Event Name</span>
                                    <span className="font-bold text-[#003135]">{selectedRecord.eventName}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Assigned To</span>
                                    <span className="font-bold text-[#003135]">{selectedRecord.assignedTo}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">EPF Number</span>
                                    <span className="font-bold text-[#003135]">{selectedRecord.epfNumber}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Created By</span>
                                    <span className="font-bold text-[#003135]">{selectedRecord.createdBy}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Picked Up By</span>
                                    <span className="font-bold text-[#003135]">{selectedRecord.pickedUpBy}</span>
                                </div>
                                {selectedRecord.approvedBy && (
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Approved By</span>
                                        <span className="font-bold text-emerald-600">{selectedRecord.approvedBy}</span>
                                    </div>
                                )}
                                {selectedRecord.type === 'in' && selectedRecord.linkedOutDocNo && (
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Linked OUT SIO</span>
                                        <span className="font-bold text-blue-600 font-mono">{selectedRecord.linkedOutDocNo}</span>
                                    </div>
                                )}
                                <div className="space-y-0.5 col-span-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Remarks</span>
                                    <span className="font-bold text-slate-600">{selectedRecord.remarks || '---'}</span>
                                </div>
                            </div>

                            {/* Item dispatch lists with verify checkboxes if pending */}
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <h4 className="font-black text-[#003135] text-sm tracking-tight uppercase flex items-center gap-1.5">
                                    <span>SIO Items</span>
                                    {activeSection === 'storesInOut_approvals' && (
                                        <span className="text-[10px] font-medium text-rose-500 capitalize tracking-normal font-sans">(Verify each item below)</span>
                                    )}
                                </h4>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                            <tr>
                                                {activeSection === 'storesInOut_approvals' && (
                                                    <th className="px-5 py-3 w-16 text-center">Verify</th>
                                                )}
                                                <th className="px-5 py-3">Barcode</th>
                                                <th className="px-5 py-3">Model</th>
                                                <th className="px-5 py-3">Serial</th>
                                                <th className="px-5 py-3">Category</th>
                                                <th className="px-5 py-3 text-right">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm font-bold">
                                            {selectedRecord.items?.map((i) => (
                                                <tr key={i.id} className={activeSection === 'storesInOut_approvals' && !checkedItems[i.id] ? 'bg-rose-50/20' : ''}>
                                                    {activeSection === 'storesInOut_approvals' && (
                                                        <td className="px-5 py-2.5 text-center">
                                                            <input 
                                                                type="checkbox"
                                                                checked={!!checkedItems[i.id]}
                                                                onChange={() => handleItemCheckToggle(i.id)}
                                                                className="w-4.5 h-4.5 accent-[#003135] cursor-pointer"
                                                            />
                                                        </td>
                                                    )}
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

                            {/* Declaration confirmation for approvals */}
                            {activeSection === 'storesInOut_approvals' && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                                    <input 
                                        type="checkbox"
                                        id="declaration-statement"
                                        checked={statementChecked}
                                        onChange={(e) => setStatementChecked(e.target.checked)}
                                        className="w-5 h-5 accent-[#003135] mt-0.5 cursor-pointer flex-shrink-0"
                                    />
                                    <label htmlFor="declaration-statement" className="text-xs font-bold text-slate-600 cursor-pointer select-none leading-relaxed">
                                        I have read and checked the items listed in this document and confirm they are correct and in accordance with current stock records.
                                    </label>
                                </div>
                            )}

                            {/* Decision & Handle details for approved/rejected records */}
                            {selectedRecord.status !== 'pending' && (
                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                                    <span>Decision: <span className="uppercase font-black text-emerald-600">{selectedRecord.status}</span></span>
                                    <span>Handled By: <span className="text-slate-600 font-black">{selectedRecord.approvedBy}</span></span>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-4 -mx-8 -mb-8 rounded-b-[32px]">
                                <button
                                    onClick={() => handlePrint(selectedRecord)}
                                    className="px-5 py-3 bg-slate-100 text-[#003135] hover:bg-slate-200 rounded-2xl font-bold flex items-center gap-1.5 transition-all mr-auto"
                                >
                                    <Printer size={16} />
                                    Print Document
                                </button>
                                
                                {activeSection === 'storesInOut_approvals' && selectedRecord.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => { handleUpdateStatus(selectedRecord.id, 'rejected'); setIsDetailsOpen(false); }}
                                            className="px-5 py-3 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl font-bold transition-all"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            disabled={!isApprovalAllowed}
                                            onClick={() => { handleUpdateStatus(selectedRecord.id, 'approved'); setIsDetailsOpen(false); }}
                                            className="px-6 py-3 bg-[#003135] text-white hover:bg-[#004145] disabled:opacity-40 disabled:hover:bg-[#003135] rounded-2xl font-bold shadow-lg shadow-[#003135]/15 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 flex items-center gap-1.5"
                                        >
                                            <Check size={16} strokeWidth={2.5} />
                                            Confirm & Approve
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setIsDetailsOpen(false)} className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-[#003135] rounded-2xl font-bold transition-all">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Two-Sided Item Selection Modal */}
            <AnimatePresence>
                {isItemModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-5xl h-[85vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h2 className="text-xl font-black text-[#003135] tracking-tight">Add & Manage Items</h2>
                                    <p className="text-xs text-slate-500 font-medium">Select items from inventory and assign quantities</p>
                                </div>
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content - Split Layout */}
                            <div className="flex-1 flex overflow-hidden min-h-0">
                                {/* Left Side: Selected Items List */}
                                <div className="w-1/2 border-r border-slate-100 flex flex-col bg-slate-50/30">
                                    <div className="p-5 border-b border-slate-100 bg-white">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-black text-sm text-[#003135] uppercase tracking-wider">Selected Items</h3>
                                            <span className="bg-teal-50 text-[#003135] border border-teal-100 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                {tempSelectedItems.length} Device(s)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Scrollable Selection List */}
                                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                        {tempSelectedItems.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                                <ClipboardList size={40} strokeWidth={1.5} className="mb-2 text-slate-350" />
                                                <p className="text-xs font-bold">No items added yet</p>
                                                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Search and add items from the right panel</p>
                                            </div>
                                        ) : (
                                            tempSelectedItems.map((item) => (
                                                <div 
                                                    key={item.id}
                                                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="font-mono font-bold text-xs text-[#003135] bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                                                            {item.pcNumber}
                                                        </div>
                                                        <div className="text-xs font-bold text-slate-700">{item.brand} {item.pcModel}</div>
                                                        <div className="text-[10px] text-slate-400">Serial: {item.pcSerial || '---'}</div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {/* Quantity Changer */}
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={item.maxQty}
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleTempQtyChange(item.id, e.target.value)}
                                                                    className="w-14 px-1.5 py-1 text-xs text-center font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#003135]"
                                                                />
                                                                <span className="text-[10px] text-slate-400 font-medium">/ {item.maxQty}</span>
                                                            </div>
                                                        </div>

                                                        {/* Trash Button */}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveTempItem(item.id)}
                                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Left Panel Footer / Summary */}
                                    <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-between text-xs font-bold text-slate-600 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                                        <span>Total Quantity:</span>
                                        <span className="text-sm font-black text-[#003135]">
                                            {tempSelectedItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0)}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side: Search Panel */}
                                <div className="w-1/2 flex flex-col bg-white">
                                    {/* Search Bar */}
                                    <div className="p-5 border-b border-slate-100 space-y-3">
                                        <h3 className="font-black text-sm text-[#003135] uppercase tracking-wider">Search Inventory</h3>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:bg-white focus-within:border-[#003135] transition-all">
                                            <Search size={18} className="text-slate-400 mr-2" />
                                            <input 
                                                value={modalSearchTerm}
                                                onChange={(e) => setModalSearchTerm(e.target.value)}
                                                placeholder="Type pc number, model, brand..."
                                                className="w-full bg-transparent text-xs font-bold text-[#003135] focus:outline-none"
                                            />
                                            {modalSearchTerm && (
                                                <button type="button" onClick={() => setModalSearchTerm('')}>
                                                    <X size={16} className="text-slate-400" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inventory List */}
                                    <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                                        {modalFilteredInventory.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                                <Search size={32} strokeWidth={1.5} className="mb-2 text-slate-350" />
                                                <p className="text-xs font-bold">No matching items found</p>
                                            </div>
                                        ) : (
                                            modalFilteredInventory.map((item) => {
                                                const isAdded = tempSelectedItems.some(i => i.id === item.id);
                                                const addQty = modalAddQuantities[item.id] || 1;
                                                const maxQty = item.quantity ?? 1;
                                                
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        className={`border rounded-2xl p-4 transition-all flex items-center justify-between 
                                                            ${isAdded 
                                                                ? 'border-emerald-100 bg-emerald-50/20' 
                                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
                                                            }
                                                        `}
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-xs text-[#003135] bg-slate-100 px-2 py-0.5 rounded-md">
                                                                    {item.pcNumber}
                                                                </span>
                                                                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                                                                    In Stock: {maxQty}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs font-bold text-slate-700">{item.brand} {item.pcModel}</div>
                                                            <div className="text-[10px] text-slate-405">Serial: {item.pcSerial || '---'}</div>
                                                        </div>

                                                        <div>
                                                            {isAdded ? (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-black">
                                                                    <Check size={14} strokeWidth={2.5} />
                                                                    Added
                                                                </span>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <input 
                                                                        type="number"
                                                                        min="1"
                                                                        max={maxQty}
                                                                        value={addQty}
                                                                        onChange={(e) => handleModalAddQtyChange(item.id, e.target.value, maxQty)}
                                                                        className="w-14 px-1.5 py-1 text-xs text-center font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#003135]"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddTempItem(item, addQty)}
                                                                        className="px-3.5 py-1.5 bg-[#003135] hover:bg-[#004a50] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                                                                    >
                                                                        Add
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-[32px]">
                                <button 
                                    type="button" 
                                    onClick={() => setIsItemModalOpen(false)}
                                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-[#003135] rounded-xl font-bold text-xs transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleConfirmItemModal}
                                    className="px-5 py-2.5 bg-[#003135] hover:bg-[#004a50] text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-[#003135]/10"
                                >
                                    Confirm & Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StoresInOut;
