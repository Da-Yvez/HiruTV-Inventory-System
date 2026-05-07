"use client";

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSite } from '@/context/SiteContext';

const AssetLabel = ({ device }) => {
    const { currentSite } = useSite();
    
    // Fallback if currentSite is not available
    const siteName = currentSite?.name || "Hiru TV";
    const siteFullName = currentSite?.fullName || "Hiru TV Inventory System";
    
    // Generate the scanning URL
    // Use the secure random qrKey instead of the predictable pcNumber
    const publicId = device.qrKey || device.pcNumber.replace(/\//g, '-').trim();
    const scanUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/scan/${encodeURIComponent(publicId)}`
        : `https://inventory.hirutv.lk/scan/${encodeURIComponent(publicId)}`;

    return (
        <div className="asset-label-container p-4 bg-white border-2 border-slate-200 rounded-xl w-[400px] h-[200px] flex items-center gap-6 shadow-sm relative overflow-hidden print:shadow-none print:border-slate-300">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 z-0" />
            
            {/* QR Code Section */}
            <div className="relative z-10 flex flex-col items-center gap-2">
                <a 
                    href={scanUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-white border border-slate-100 rounded-lg shadow-sm hover:scale-105 transition-transform cursor-pointer block"
                    title="Open Public Asset Page"
                >
                    <QRCodeSVG 
                        value={scanUrl} 
                        size={120}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                            src: "/logo.jpg",
                            x: undefined,
                            y: undefined,
                            height: 24,
                            width: 24,
                            excavate: true,
                        }}
                    />
                </a>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Scan or Click to View</span>
            </div>

            {/* Info Section */}
            <div className="flex-1 relative z-10">
                <div className="mb-4">
                    <p className="text-[10px] font-black text-[#003135] uppercase tracking-[0.2em] opacity-60">{siteName}</p>
                    <h2 className="text-xl font-black text-[#003135] leading-none mt-1">IT ASSET</h2>
                </div>

                <div className="space-y-3">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset ID / PC Number</p>
                        <p className="text-lg font-black text-[#003135] leading-tight break-all">
                            {device.pcNumber}
                        </p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                            <p className="text-[11px] font-bold text-slate-600 uppercase">{device.department}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                            <p className="text-[11px] font-bold text-emerald-600 uppercase">{device.status}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Side Vertical Text */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 origin-center pointer-events-none opacity-10">
                <span className="text-[10px] font-black whitespace-nowrap text-[#003135] tracking-[0.5em] uppercase">
                    {siteFullName}
                </span>
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .asset-label-container, .asset-label-container * {
                        visibility: visible;
                    }
                    .asset-label-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        margin: 0;
                        border: 1px solid #ddd;
                    }
                }
            `}</style>
        </div>
    );
};

export default AssetLabel;
