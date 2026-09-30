'use client';

import { useCallback, useState } from 'react';
import { countActiveFilters } from '@/lib/points';
import type { PointFilters as Filters } from '@/lib/points';
import FilterSheet, { type FilterOptions } from './FilterSheet';

const CHIP_KEYS = ['department', 'round', 'serviceName', 'district'] as const;

interface MobileFilterBarProps {
  filters: Filters;
  options: FilterOptions;
  onChange: (filters: Filters) => void;
  resultCount: number;
  className?: string;
  /** Drawn over the map: add shadow and a translucent background */
  floating?: boolean;
}

/** Search + filter button, with removable chips for active filters; opens FilterSheet */
export default function MobileFilterBar({ filters, options, onChange, resultCount, className = '', floating = false }: MobileFilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const activeCount = countActiveFilters(filters);
  const surface = floating ? 'shadow-md backdrop-blur-sm' : '';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          {/* text-base (16px) stops iOS Safari zooming in on focus */}
          <input
            type="search"
            placeholder="ค้นหาโรงเรียน, หมู่บ้าน, ตำบล..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className={`w-full h-11 pl-9 pr-3 rounded-xl ${floating ? 'bg-card/95' : 'bg-card'} ${surface} border border-border text-base text-foreground placeholder:text-muted-foreground placeholder:text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30`}
          />
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className={`relative shrink-0 h-11 px-3.5 flex items-center gap-1.5 rounded-xl border text-sm font-medium transition-colors ${surface} ${
            activeCount > 0 ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-foreground'
          }`}
          aria-label="ตัวกรอง"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          กรอง
          {activeCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-primary-foreground text-primary text-[11px] leading-5 text-center">{activeCount}</span>
          )}
        </button>
      </div>

      {activeCount > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          {CHIP_KEYS.filter((key) => filters[key]).map((key) => (
            <button
              key={key}
              onClick={() => onChange({ ...filters, [key]: '' })}
              className={`shrink-0 h-8 pl-3 pr-2 flex items-center gap-1 rounded-full bg-card border ${surface} border-border text-xs text-foreground`}
              aria-label={`ล้าง ${filters[key]}`}
            >
              {filters[key]}
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={closeSheet}
        filters={filters}
        options={options}
        onChange={onChange}
        resultCount={resultCount}
      />
    </div>
  );
}
