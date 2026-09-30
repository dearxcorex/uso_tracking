'use client';

import { PointFilters as Filters, hasActiveFilters, EMPTY_FILTERS } from '@/lib/points';

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs rounded-lg border border-border bg-card text-foreground px-2 py-2 w-full truncate focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-colors"
      >
        <option value="">ทั้งหมด</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

interface PointFiltersProps {
  filters: Filters;
  options: { rounds: string[]; departments: string[]; serviceNames: string[]; districts: string[] };
  onChange: (filters: Filters) => void;
  showSearch?: boolean;
}

export default function PointFilters({ filters, options, onChange, showSearch = true }: PointFiltersProps) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-2.5">
      {showSearch && (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            placeholder="ค้นหา โรงเรียน, หมู่บ้าน, ตำบล, รหัสหมู่บ้าน, เบอร์โทร..."
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30"
          />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
        <FilterSelect label="ครั้ง" value={filters.round} options={options.rounds} onChange={(v) => update('round', v)} />
        <FilterSelect label="หน่วยงาน" value={filters.department} options={options.departments} onChange={(v) => update('department', v)} />
        <FilterSelect label="บริการ" value={filters.serviceName} options={options.serviceNames} onChange={(v) => update('serviceName', v)} />
        <FilterSelect label="อำเภอ" value={filters.district} options={options.districts} onChange={(v) => update('district', v)} />
        {hasActiveFilters(filters) && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-secondary"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>
    </div>
  );
}
