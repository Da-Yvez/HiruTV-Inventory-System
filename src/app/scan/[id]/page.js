"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import PublicAssetView from '@/components/inventory/PublicAssetView';
import QRViewerLogin from '@/components/auth/QRViewerLogin';
import { RefreshCcw, ShieldAlert, Home, Lock } from 'lucide-react';

export default function ScanPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading, refreshUserProfile } = useAuth();
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const id = params.id;

    useEffect(() => {
        const fetchDevice = async () => {
            if (!id) return;
            
            // We fetch the device first. The API is public but secure (using qrKey/normalized logic).
            // We only show it if the user has the right site permission.
            setLoading(true);
            try {
                const response = await fetch(`/api/public/asset/${id}`);
                
                if (response.ok) {
                    const data = await response.json();
                    setDevice(data);
                } else {
                    const errData = await response.json();
                    setError(errData.error || "Asset not found.");
                }
            } catch (err) {
                console.error("Error fetching device:", err);
                setError("Failed to retrieve asset information.");
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchDevice();
        }
    }, [id, authLoading]);

    // Check if the current user has permission to view THIS specific asset's site
    const hasSitePermission = (device) => {
        if (!user || !device) return false;
        // Map site IDs to permission keys
        const siteKey = device.site?.toLowerCase() === 'wtc' ? 'canAccessWTC' : 'canAccessHLS';
        return hasPermission(user, siteKey);
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <RefreshCcw className="animate-spin text-[#003135] mb-4" size={48} />
                <p className="text-[#003135] font-black tracking-widest text-xs uppercase">Fetching Asset Details...</p>
            </div>
        );
    }

    // Access Control: If not logged in OR doesn't have site permission, show login
    if (!user || !hasSitePermission(device)) {
        return <QRViewerLogin onSuccess={refreshUserProfile} />;
    }

    if (error || !device) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
                    <ShieldAlert size={40} />
                </div>
                <h1 className="text-2xl font-black text-[#003135] mb-2">Asset Not Found</h1>
                <p className="text-slate-500 font-medium mb-8 max-w-sm">
                    {error || "The asset ID you scanned does not exist in our database."}
                </p>
                <button 
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 px-8 py-4 bg-[#003135] text-white rounded-2xl font-bold"
                >
                    <Home size={18} />
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* If logged in, show a sticky button to go to dashboard */}
            {user && (
                <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-auto sm:top-6 z-[100] print:hidden">
                    <button 
                        onClick={() => router.push(`/?search=${encodeURIComponent(device.pcNumber)}`)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 sm:py-3 bg-[#003135] text-white rounded-2xl font-black text-xs shadow-2xl hover:scale-[1.02] transition-all"
                    >
                        <LayoutDashboard size={16} />
                        OPEN IN DASHBOARD
                    </button>
                </div>
            )}
            
            <PublicAssetView device={device} />
        </div>
    );
}

function LayoutDashboard({ size }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
    );
}
