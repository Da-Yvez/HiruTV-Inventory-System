"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const SiteContext = createContext({});

export const siteConfig = {
    wtc: {
        id: 'wtc',
        name: "WTC",
        fullName: "Wijeya Television Corporation",
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
        fullName: "Hiru Live Streaming",
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

    useEffect(() => {
        const savedSite = localStorage.getItem('selectedSite');
        if (savedSite && siteConfig[savedSite]) {
            setCurrentSite(siteConfig[savedSite]);
        }
    }, []);

    const selectSite = (siteKey) => {
        const site = siteConfig[siteKey];
        if (site) {
            setCurrentSite(site);
            localStorage.setItem('selectedSite', siteKey);
        }
    };

    const clearSite = () => {
        setCurrentSite(null);
        localStorage.removeItem('selectedSite');
    };

    return (
        <SiteContext.Provider value={{ currentSite, selectSite, clearSite, siteConfig }}>
            {children}
        </SiteContext.Provider>
    );
};

export const useSite = () => useContext(SiteContext);
