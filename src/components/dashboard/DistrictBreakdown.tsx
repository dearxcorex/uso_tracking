'use client';

import { useState } from 'react';

interface DistrictBreakdownProps {
  byDistrict: Record<string, number>;
  byDistrictInspected: Record<string, number>;
  total: number;
}

const INITIAL_SHOW = 8;

export default function DistrictBreakdown({ byDistrict, byDistrictInspected, total }: DistrictBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  const sorted = Object.entries(byDistrict).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_SHOW);
  const hiddenCount = sorted.length - INITIAL_SHOW;

  const totalInspected = Object.values(byDistrictInspected).reduce((a, b) => a + b, 0);

  return (
    <div className="clay-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          จุดบริการตามอำเภอ
        </h3>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ตรวจแล้ว {totalInspected}/{total}
          </span>
          <span className="text-xs text-muted-foreground">
            {sorted.length} อำเภอ
          </span>
        </div>
      </div>

      {/* District rows */}
      <div className="space-y-2.5">
        {visible.map(([name, count], i) => {
          const inspected = byDistrictInspected[name] ?? 0;
          const barWidth = (count / maxCount * 100);
          const inspectedWidth = count > 0 ? (inspected / count * 100) : 0;

          return (
            <div key={name} className="group">
              <div className="flex items-center gap-2.5 text-xs mb-1">
                <span className="w-5 text-right text-muted-foreground/60 font-mono text-[10px] tabular-nums">
                  {i + 1}
                </span>
                <span className="text-foreground truncate flex-1 min-w-0">{name}</span>
                <span className="text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{inspected}</span>
                  <span className="opacity-40 mx-0.5">/</span>
                  {count}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5" />
                <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-primary/15">
                  {/* Gray bar = district size relative to max */}
                  <div className="h-full rounded-full bg-primary/25 relative" style={{ width: `${barWidth}%` }}>
                    {/* Green fill = inspected portion of this district */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${inspectedWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand toggle */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          {expanded ? (
            <>
              ย่อ
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              แสดงทั้งหมด (+{hiddenCount})
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}
