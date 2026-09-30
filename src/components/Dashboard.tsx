'use client';

import { useState, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ActiveTab, InspectionUpdate, VisitSite } from '@/types';
import { computeStats } from '@/lib/points';
import NavSidebar from './NavSidebar';
import AppHeader from './client/AppHeader';
import MobileNav from './client/MobileNav';
import { navItems } from './navItems';

const StatsCards = dynamic(() => import('./dashboard/StatsCards'));
const DistrictBreakdown = dynamic(() => import('./dashboard/DistrictBreakdown'));
const ProviderChart = dynamic(() => import('./dashboard/ProviderChart'));
const PointDetail = dynamic(() => import('./dashboard/PointDetail'));
const ServicePointMap = dynamic(() => import('./dashboard/ServicePointMap'), { ssr: false });

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-muted/50 rounded-xl ${className}`} />;
}

interface DashboardProps {
  points: VisitSite[];
}

export default function Dashboard({ points: initialPoints }: DashboardProps) {
  const [points, setPoints] = useState(initialPoints);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedPointId(null);
  }, []);

  /** Apply a saved inspection status to the in-memory site list */
  const handleInspected = useCallback((update: InspectionUpdate) => {
    setPoints((prev) => prev.map((p) => (p.id === update.id ? { ...p, ...update } : p)));
  }, []);

  const stats = useMemo(() => computeStats(points), [points]);
  const selectedPoint = points.find((p) => p.id === selectedPointId) ?? null;

  const subtitle = navItems.find((item) => item.id === activeTab)?.subtitle;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <NavSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          title="USONet"
          subtitle={subtitle}
          onMenuToggle={toggleMobileMenu}
        />

        <div
          className={
            activeTab === 'map'
              ? 'flex-1 flex flex-col min-h-0 p-2 lg:p-6'
              : 'flex-1 overflow-y-auto scrollbar-stable p-4 lg:p-6 pb-20 lg:pb-6 space-y-4 lg:space-y-6'
          }
        >
          {activeTab === 'dashboard' && (
            <>
              <StatsCards stats={stats} />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                <div className="xl:col-span-2">
                  <DistrictBreakdown byDistrict={stats.byDistrict} />
                </div>
                <div>
                  <ProviderChart byProvider={stats.byProvider} total={stats.total} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'map' && (
            <Suspense fallback={<Skeleton className="h-[500px]" />}>
              <ServicePointMap points={points} onSelect={setSelectedPointId} onInspected={handleInspected} />
            </Suspense>
          )}
        </div>
      </main>

      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />

      {selectedPoint && (
        <PointDetail point={selectedPoint} onClose={closeDetail} onInspected={handleInspected} />
      )}
    </div>
  );
}
