"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSite } from '@/context/SiteContext';
import LoginPage from '@/components/auth/LoginPage';
import SiteSelection from '@/components/auth/SiteSelection';
import DashboardLayout from '@/components/layout/DashboardLayout';
import InventoryTable from '@/components/inventory/InventoryTable';
import ActivityLogs from '@/components/inventory/ActivityLogs';
import DepartmentManagement from '@/components/settings/DepartmentManagement';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { currentSite, loading: siteLoading } = useSite();
  const [activeSection, setActiveSection] = useState('inventory');
  
  // Shared form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const handleSectionChange = (section) => {
    if (section === 'addDevice') {
      setSelectedDevice(null);
      setIsFormOpen(true);
      setActiveSection('inventory');
    } else {
      setActiveSection(section);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!currentSite) {
    return <SiteSelection />;
  }

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={handleSectionChange}>
      <div className="p-8 max-w-[1600px] mx-auto">
        {activeSection === 'inventory' ? (
          <>
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#003135] tracking-tight">Inventory Dashboard</h1>
                <p className="text-slate-500 font-medium">Manage and track your IT assets across {currentSite.fullName}</p>
            </div>
            <InventoryTable 
              isFormOpen={isFormOpen} 
              setIsFormOpen={setIsFormOpen}
              selectedDevice={selectedDevice}
              setSelectedDevice={setSelectedDevice}
            />
          </>
        ) : activeSection === 'logs' ? (
          <ActivityLogs />
        ) : activeSection === 'departments' ? (
          <DepartmentManagement />
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
             <h1 className="text-2xl font-bold">Coming Soon</h1>
             <p>This section is currently under development.</p>
             <button 
              onClick={() => handleSectionChange('inventory')}
              className="mt-4 px-6 py-2 bg-[#003135] text-white rounded-xl font-bold"
             >
               Go back to Inventory
             </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


