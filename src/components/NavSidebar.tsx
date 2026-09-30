'use client';

import { useState } from 'react';
import { ActiveTab } from '@/types';
import { navItems } from './navItems';

interface NavSidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export default function NavSidebar({ activeTab, onTabChange }: NavSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <nav
      className="hidden lg:flex flex-col h-full nav-sidebar"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      style={{
        width: isExpanded ? '200px' : '64px',
        transition: 'width 0.2s ease-in-out',
      }}
    >
      {/* Logo Section */}
      <div className="p-3 border-b border-border">
        <div className={`flex items-center gap-3 ${isExpanded ? '' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {isExpanded && (
            <span className="font-semibold text-foreground whitespace-nowrap overflow-hidden text-sm tracking-tight">
              USONet
            </span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150
                ${isExpanded ? '' : 'justify-center'}
                ${isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }
              `}
              title={!isExpanded ? item.label : undefined}
            >
              <span className="flex-shrink-0">
                {item.icon}
              </span>
              {isExpanded && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-border">
        <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isExpanded ? '' : 'justify-center'}`}>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          {isExpanded && <span className="whitespace-nowrap">Collapse</span>}
        </div>
      </div>
    </nav>
  );
}
