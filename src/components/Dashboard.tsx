'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ActiveTab, USOStats, MapServicePoint } from '@/types';
import NavSidebar from './NavSidebar';
import AppHeader from './client/AppHeader';
import MobileNav from './client/MobileNav';

const StatsCards = dynamic(() => import('./dashboard/StatsCards'));
const DistrictBreakdown = dynamic(() => import('./dashboard/DistrictBreakdown'));
const ProviderChart = dynamic(() => import('./dashboard/ProviderChart'));
const ServicePointMap = dynamic(() => import('./dashboard/ServicePointMap'), { ssr: false });

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-muted/50 rounded-xl ${className}`} />;
}

function MapSkeleton() {
  return <Skeleton className="h-[500px]" />;
}

interface DashboardProps {
  stats: USOStats;
  initialMapPoints: MapServicePoint[];
}

export default function Dashboard({ stats, initialMapPoints }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const subtitleMap: Record<ActiveTab, string> = {
    dashboard: 'ภาพรวมจุดบริการ USO จังหวัดชัยภูมิ',
    map: 'แผนที่จุดบริการ USO',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          title="USONet"
          subtitle={subtitleMap[activeTab]}
        />

        <div className="flex-1 overflow-y-auto scrollbar-stable p-4 lg:p-6 pb-20 lg:pb-6 space-y-4 lg:space-y-6">
          {activeTab === 'dashboard' && (
            <>
              <StatsCards stats={stats} />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                <div className="xl:col-span-2">
                  <DistrictBreakdown byDistrict={stats.byDistrict} byDistrictInspected={stats.byDistrictInspected} total={stats.totalPoints} />
                </div>
                <div>
                  <ProviderChart byProvider={stats.byProvider} total={stats.totalPoints} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'map' && (
            <Suspense fallback={<MapSkeleton />}>
              <ServicePointMap initialPoints={initialMapPoints} />
            </Suspense>
          )}
        </div>
      </main>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
