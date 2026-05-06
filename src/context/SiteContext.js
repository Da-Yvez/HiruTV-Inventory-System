"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const SiteContext = createContext({});

export const siteConfig = {
    wtc: {
        id: 'wtc',
        name: "WTC",
        fullName: "World Trade Center",
        icon: "Building2",
        technicians: ["Adithya", "Minosh", "Niluksha", "Gayan"],
        departments: ["Engineering", "NEWS", "Scheduling", "MCR", "PCR 1", "PCR 2", "Marketing A/B", "Marketing C", "Research", "Political", "GFX", "Transmission", "Library", "Maintenance"],
        networkDiagram: "https://www.canva.com/design/DAG-MlkG1Bs/fTfu6FEhnj8pTLDKAXJZcQ/view",
        firebaseCollection: "devices_wtc",
        logsCollection: "activityLogs_wtc",
        repairCollection: "repairHistory_wtc"
    },
    hls: {
        id: 'hls',
        name: "HLS",
        fullName: "Hiru Life Studio",
        icon: "Globe",
        technicians: ["Navendra"],
        departments: ["Programming", "Camera", "Managers", "Edit", "Graphic", "Secatry", "Dubbing", "Engineering", "IT", "HR"],
        networkDiagram: "https://www.canva.com/design/DAG-e1F-ViA/nsJaRxmGmBmsY19qmF0SCg/view",
        firebaseCollection: "devices_hls",
        logsCollection: "activityLogs_hls",
        repairCollection: "repairHistory_hls"
    }
};

export const SiteProvider = ({ children }) => {
    const [currentSite, setCurrentSite] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedSiteId = localStorage.getItem('selectedSite');
        
        // Use auth state listener to ensure we don't call Firestore before login
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user && savedSiteId && siteConfig[savedSiteId]) {
                const unsubscribeSite = onSnapshot(doc(db, 'sites', savedSiteId), async (snapshot) => {
                    if (snapshot.exists()) {
                        setCurrentSite({ ...siteConfig[savedSiteId], ...snapshot.data() });
                        setLoading(false);
                    } else {
                        // Seed if missing
                        const initialData = siteConfig[savedSiteId];
                        try {
                            await setDoc(doc(db, 'sites', savedSiteId), {
                                fullName: initialData.fullName,
                                departments: initialData.departments,
                                technicians: initialData.technicians,
                                networkDiagram: initialData.networkDiagram
                            });
                        } catch (e) {
                            console.error("Error seeding site:", e);
                        }
                        setCurrentSite(initialData);
                        setLoading(false);
                    }
                }, (error) => {
                    console.error("Site listener error:", error);
                    // If permissions fail, we still want to stop loading
                    setLoading(false);
                });

                return () => unsubscribeSite();
            } else {
                // If no user or no site, just stop loading
                if (!user) setCurrentSite(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const selectSite = async (siteKey) => {
        const site = siteConfig[siteKey];
        if (site) {
            localStorage.setItem('selectedSite', siteKey);
            // The useEffect will handle the listener setup
            window.location.reload(); // Refresh to re-initialize with new site listener
        }
    };

    const clearSite = () => {
        setCurrentSite(null);
        localStorage.removeItem('selectedSite');
    };

    const updateSiteConfig = async (updates) => {
        if (!currentSite) return;
        try {
            const siteRef = doc(db, 'sites', currentSite.id);
            await updateDoc(siteRef, updates);
        } catch (error) {
            console.error("Error updating site config:", error);
            throw error;
        }
    };

    return (
        <SiteContext.Provider value={{ currentSite, selectSite, clearSite, siteConfig, updateSiteConfig, loading }}>
            {children}
        </SiteContext.Provider>
    );
};

export const useSite = () => useContext(SiteContext);
