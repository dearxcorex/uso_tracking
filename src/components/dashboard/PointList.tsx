'use client';

import { useMemo, useState } from 'react';
import { VisitSite } from '@/types';
import { EMPTY_FILTERS, filterPoints, formatLocation, getFilterOptions, hasCoords, siteTitle } from '@/lib/points';
import type { PointFilters as Filters } from '@/lib/points';
import DepartmentBadge from './DepartmentBadge';
import PhoneLink from './PhoneLink';
import PointFilters from './PointFilters';
import ServiceBadge from './ServiceBadge';

const PAGE_SIZE = 50;

interface PointListProps {
  points: VisitSite[];
  onSelect: (id: number) => void;
}

function NoCoordsTag() {
  return (
    <span className="text-[10px] text-amber-600 dark:text-amber-400 whitespace-nowrap" title="ไม่มีพิกัด">
      ไม่มีพิกัด
    </span>
  );
}

export default function PointList({ points, onSelect }: PointListProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const options = useMemo(() => getFilterOptions(points), [points]);
  const filtered = useMemo(() => filterPoints(points, filters), [points, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFiltersChange = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="clay-card p-3 lg:p-4">
        <PointFilters filters={filters} options={options} onChange={handleFiltersChange} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          แสดง {filtered.length.toLocaleString()} จาก {points.length.toLocaleString()} จุด
        </span>
        {totalPages > 1 && (
          <span>หน้า {currentPage}/{totalPages}</span>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="space-y-2 md:hidden">
        {visible.map((p) => (
          // div, not button: the card contains a tel: link
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(p.id)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(p.id)}
            className="clay-card w-full text-left p-3 space-y-1.5 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <DepartmentBadge department={p.department} seq={p.deptSeq} />
                <ServiceBadge name={p.serviceName} />
              </div>
              <span className="text-[11px] text-muted-foreground">{p.round}</span>
            </div>
            <div className="text-sm font-medium text-foreground line-clamp-2">{siteTitle(p)}</div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{formatLocation(p) || '—'}</span>
              {!hasCoords(p) && <NoCoordsTag />}
            </div>
            {p.phone && <PhoneLink phone={p.phone} className="text-sm py-1" />}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="clay-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">ครั้ง</th>
                <th className="px-4 py-3 font-medium">หน่วยงาน</th>
                <th className="px-4 py-3 font-medium">บริการ</th>
                <th className="px-4 py-3 font-medium">สถานที่ติดตั้ง</th>
                <th className="px-4 py-3 font-medium">อำเภอ</th>
                <th className="px-4 py-3 font-medium">โทรศัพท์</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="border-b border-border/50 last:border-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{p.round}</td>
                  <td className="px-4 py-2.5"><DepartmentBadge department={p.department} seq={p.deptSeq} /></td>
                  <td className="px-4 py-2.5"><ServiceBadge name={p.serviceName} /></td>
                  <td className="px-4 py-2.5 max-w-md">
                    <div className="text-foreground truncate">{siteTitle(p)}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{[p.village, p.subdistrict].filter(Boolean).join(' / ') || '—'}</span>
                      {!hasCoords(p) && <NoCoordsTag />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-foreground whitespace-nowrap">{p.district ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {p.phone ? <PhoneLink phone={p.phone} /> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="clay-card p-8 text-center text-sm text-muted-foreground">ไม่พบจุดลงพื้นที่ที่ตรงกับตัวกรอง</div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg text-sm bg-secondary text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ก่อนหน้า
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg text-sm bg-secondary text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ถัดไป
          </button>
        </div>
      )}
    </div>
  );
}
