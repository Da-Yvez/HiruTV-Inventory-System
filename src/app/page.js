"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSite } from '@/context/SiteContext';
import LoginPage from '@/components/auth/LoginPage';
import SiteSelection from '@/components/auth/SiteSelection';
import DashboardLayout from '@/components/layout/DashboardLayout';
import InventoryTable from '@/components/inventory/InventoryTable';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { currentSite, loading: siteLoading } = useSite();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#003135]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
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
    <DashboardLayout>
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-black text-[#003135] tracking-tight">Inventory Dashboard</h1>
            <p className="text-slate-500 font-medium">Manage and track your IT assets across {currentSite.fullName}</p>
        </div>
        
        <InventoryTable />
      </div>
    </DashboardLayout>
  );
}
