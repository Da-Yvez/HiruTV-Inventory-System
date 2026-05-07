"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { siteConfig } from '@/context/SiteContext';

const PrintQRContent = () => {
    const searchParams = useSearchParams();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [site, setSite] = useState(null);

    const siteId = searchParams.get('site');
    const idsString = searchParams.get('ids');

    useEffect(() => {
        const fetchDevices = async () => {
            if (!siteId || !idsString) {
                setLoading(false);
                return;
            }

            const config = siteConfig[siteId];
            if (!config) {
                setLoading(false);
                return;
            }

            // Fetch the latest site data from Firestore to get the full name etc.
            try {
                const siteDoc = await getDoc(doc(db, 'sites', siteId));
                setSite({ ...config, ...siteDoc.data() });

                const allIds = idsString.split(',');
                const devicesRef = collection(db, config.firebaseCollection);
                
                // Firestore 'in' query supports up to 30 items. 
                // We split into chunks of 30 and fetch in parallel.
                const chunks = [];
                for (let i = 0; i < allIds.length; i += 30) {
                    chunks.push(allIds.slice(i, i + 30));
                }

                const queryPromises = chunks.map(chunk => {
                    const q = query(devicesRef, where('__name__', 'in', chunk));
                    return getDocs(q);
                });

                const snapshots = await Promise.all(queryPromises);
                
                const fetchedDevices = snapshots.flatMap(snapshot => 
                    snapshot.docs.map(doc => ({
                        ...doc.data(),
                        id: doc.id
                    }))
                ).sort((a, b) => a.pcNumber.localeCompare(b.pcNumber, undefined, { numeric: true, sensitivity: 'base' }));

                setDevices(fetchedDevices);
            } catch (error) {
                console.error("Error fetching devices for print:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDevices();
    }, [siteId, idsString]);

    useEffect(() => {
        if (!loading && devices.length > 0) {
            // Trigger print once content is loaded
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading, devices]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen font-sans text-slate-400">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="font-bold uppercase tracking-widest text-xs">Preparing Labels...</p>
                </div>
            </div>
        );
    }

    if (devices.length === 0) {
        return (
            <div className="p-20 text-center font-sans text-slate-400">
                <h1 className="text-xl font-bold text-slate-600">No labels to print</h1>
                <p className="mt-2 text-sm">Please close this tab and try again.</p>
            </div>
        );
    }

    return (
        <div className="p-[10mm] bg-white min-h-screen">
            <div className="print-grid grid grid-cols-2 gap-[5mm]">
                {devices.map(device => {
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
                                    <p className="site-name">{site?.name}</p>
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
                                {site?.fullName}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx global>{`
                @page { size: A4; margin: 0; }
                body { 
                    margin: 0; 
                    padding: 0;
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
                    flex-shrink: 0;
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

                @media print {
                    .no-print { display: none; }
                }
            `}</style>
        </div>
    );
};

export default function PrintQRPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrintQRContent />
        </Suspense>
    );
}
