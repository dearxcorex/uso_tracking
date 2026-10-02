'use client';

import { createPortal } from 'react-dom';
import { EMPTY_FILTERS, filterLabel, hasActiveFilters } from '@/lib/points';
import type { FilterOptions, PointFilters as Filters } from '@/lib/points';
import { getDepartmentStyle, getServiceStyle } from '@/lib/services';
import type { ColorStyle } from '@/lib/services';
import { useDialog } from '@/hooks/useDialog';

const DEFAULT_ACTIVE = 'bg-primary text-primary-foreground border-primary';

/** Selected chip in a filter's own color (same as its badge and map pin); the ทั้งหมด chip stays primary */
const colorActive = (style: (opt: string) => Pick<ColorStyle, 'bar'>) => (opt: string) =>
  opt ? `${style(opt).bar} text-white border-transparent` : DEFAULT_ACTIVE;

const departmentActive = colorActive(getDepartmentStyle);
const serviceActive = colorActive(getServiceStyle);
const inspectionActive = (opt: string) => (opt === 'done' ? 'bg-emerald-600 text-white border-transparent' : DEFAULT_ACTIVE);

function ChipGroup<V extends string>({
  label,
  value,
  options,
  onChange,
  format = (opt) => opt,
  activeClass = () => DEFAULT_ACTIVE,
}: {
  label: string;
  value: V;
  options: V[];
  onChange: (v: V | '') => void;
  format?: (opt: V) => string;
  activeClass?: (opt: string) => string;
}) {
  const chip = (opt: V | '', text: string) => {
    const active = value === opt;
    return (
      <button
        key={opt || 'all'}
        type="button"
        onClick={() => onChange(opt)}
        aria-pressed={active}
        className={`min-h-10 px-3.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
          active ? activeClass(opt) : 'bg-card border-border text-muted-foreground active:bg-secondary'
        }`}
      >
        {text}
      </button>
    );
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {chip('', 'ทั้งหมด')}
        {options.map((opt) => chip(opt, format(opt)))}
      </div>
    </fieldset>
  );
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  options: FilterOptions;
  onChange: (filters: Filters) => void;
  resultCount: number;
}

/** Mobile bottom sheet: tap-friendly chips instead of native selects */
export default function FilterSheet({ open, onClose, filters, options, onChange, resultCount }: FilterSheetProps) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const dialogRef = useDialog<HTMLDivElement>(open, onClose);

  if (!open) return null;

  // Portal to <body>: when opened from the map overlay, Leaflet's controls would otherwise stack above the sheet
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-end lg:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="ตัวกรอง"
        className="relative w-full max-h-[85dvh] flex flex-col bg-background border-t border-border rounded-t-2xl shadow-xl animate-sheet-up"
      >
        <div className="flex justify-center pt-2.5">
          <span className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          <h2 className="text-base font-semibold text-foreground">ตัวกรอง</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="ปิด"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          <ChipGroup label="ส่วนงาน" value={filters.department} options={options.departments} onChange={(v) => update('department', v)} activeClass={departmentActive} />
          <ChipGroup label="สถานะตรวจ" value={filters.inspection} options={options.inspection} onChange={(v) => update('inspection', v)} format={(v) => filterLabel('inspection', v)} activeClass={inspectionActive} />
          <ChipGroup label="ครั้ง" value={filters.round} options={options.rounds} onChange={(v) => update('round', v)} />
          <ChipGroup label="บริการ" value={filters.serviceName} options={options.serviceNames} onChange={(v) => update('serviceName', v)} activeClass={serviceActive} />
          <div className="space-y-2">
            <label htmlFor="filter-district" className="block text-xs font-medium text-muted-foreground">อำเภอ</label>
            <select
              id="filter-district"
              value={filters.district}
              onChange={(e) => update('district', e.target.value)}
              className="w-full min-h-11 rounded-xl border border-border bg-card text-foreground text-base px-3 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30"
            >
              <option value="">ทั้งหมด</option>
              {options.districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => onChange({ ...EMPTY_FILTERS, search: filters.search })}
            disabled={!hasActiveFilters({ ...filters, search: '' })}
            className="min-h-12 px-4 rounded-xl text-sm font-medium text-muted-foreground bg-secondary disabled:opacity-40 transition-colors"
          >
            ล้าง
          </button>
          <button
            onClick={onClose}
            className="flex-1 min-h-12 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:bg-primary/80 transition-colors"
          >
            ดูผลลัพธ์ {resultCount.toLocaleString()} จุด
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
