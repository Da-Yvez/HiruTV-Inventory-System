"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSite } from '@/context/SiteContext';
import { hasPermission } from '@/lib/permissions';
import LoginPage from '@/components/auth/LoginPage';
import SiteSelection from '@/components/auth/SiteSelection';
import DashboardLayout from '@/components/layout/DashboardLayout';
import InventoryTable from '@/components/inventory/InventoryTable';
import ActivityLogs from '@/components/inventory/ActivityLogs';
import DepartmentManagement from '@/components/settings/DepartmentManagement';
import UserManagement from '@/components/users/UserManagement';
import QRSecurity from '@/components/settings/QRSecurity';
import SystemLogs from '@/components/settings/SystemLogs';
import QRPrinting from '@/components/inventory/QRPrinting';
import ForcePasswordChange from '@/components/auth/ForcePasswordChange';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { currentSite, loading: siteLoading } = useSite();
  const [activeSection, setActiveSection] = useState('inventory');
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);
  
  // Shared form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const searchId = searchParams.get('search');
    if (searchId) {
      setActiveSection('inventory');
      // The actual device data will be loaded in the InventoryTable
      // We just need to pass the ID down if we want to auto-open it
    }
  }, [searchParams]);

  const handleSectionChange = (section) => {
    if (section === 'addDevice') {
      if (!hasPermission(user, 'canAdd')) return; // guard
      setSelectedDevice(null);
      setIsFormOpen(true);
      setActiveSection('inventory');
    } else {
      setActiveSection(section);
    }
  };

  const handleOpenSystemSettings = () => {
    setIsSystemSettingsOpen(true);
    setActiveSection('users');
  };

  const handleCloseSystemSettings = () => {
    setIsSystemSettingsOpen(false);
    setActiveSection('inventory');
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

  if (user.forcePasswordChange) {
    return <ForcePasswordChange />;
  }

  // System Settings Mode (Global)
  if (isSystemSettingsOpen && (user?.isAdmin || user?.isSuperAdmin)) {
    return (
      <DashboardLayout 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        isSystemMode={true}
        onCloseSystemMode={handleCloseSystemSettings}
      >
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="mb-8">
              <h1 className="text-3xl font-black text-[#003135] tracking-tight">System Settings</h1>
              <p className="text-slate-500 font-medium">Manage global configuration and user permissions</p>
          </div>
          {activeSection === 'users' ? (
            <UserManagement />
          ) : activeSection === 'qrSecurity' ? (
            <QRSecurity />
          ) : activeSection === 'systemLogs' ? (
            <SystemLogs />
          ) : (
            <ComingSoon onBack={() => setActiveSection('users')} />
          )}
        </div>
      </DashboardLayout>
    );
  }

  if (!currentSite) {
    return <SiteSelection onOpenSettings={handleOpenSystemSettings} />;
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
              initialSearch={searchParams.get('search')}
            />
          </>
        ) : activeSection === 'qrPrint' ? (
          <QRPrinting />
        ) : activeSection === 'logs' ? (
          <ActivityLogs />
        ) : activeSection === 'departments' ? (
          hasPermission(user, 'canManageDepartments') ? (
            <DepartmentManagement />
          ) : <AccessDenied />
        ) : (
          <ComingSoon onBack={() => handleSectionChange('inventory')} />
        )}
      </div>
    </DashboardLayout>
  );
}

function ComingSoon({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
       <h1 className="text-2xl font-bold">Coming Soon</h1>
       <p>This section is currently under development.</p>
       <button 
        onClick={onBack}
        className="mt-4 px-6 py-2 bg-[#003135] text-white rounded-xl font-bold"
       >
         Go back
       </button>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-red-400">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-600">Access Denied</h1>
      <p className="text-sm mt-1">You don't have permission to view this section.</p>
    </div>
  );
}
