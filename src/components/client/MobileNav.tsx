'use client';

import { ActiveTab } from '@/types';
import { useDialog } from '@/hooks/useDialog';
import { navItems } from '../navItems';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ activeTab, onTabChange, isOpen, onClose }: MobileNavProps) {
  const dialogRef = useDialog<HTMLElement>(isOpen, onClose);

  return (
    <div className={`lg:hidden ${isOpen ? '' : 'pointer-events-none'}`}>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <nav
        ref={dialogRef}
        inert={!isOpen}
        className={`fixed top-0 left-0 bottom-0 w-64 z-[1001] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-xl transition-transform duration-200 ease-out flex flex-col ${
          isOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="เมนูนำทาง"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">USONet</span>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="ปิดเมนู"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-3 px-3 space-y-1">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <span className="flex-shrink-0">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            USO Net Phase 2 — Visit Plan
          </p>
        </div>
      </nav>
    </div>
  );
}
