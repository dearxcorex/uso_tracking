'use client';

import { useState } from 'react';
import { INSPECT_LABELS } from '@/lib/inspect';
import type { InspectionUpdate } from '@/types';

interface InspectButtonProps {
  site: InspectionUpdate;
  onChange: (update: InspectionUpdate) => void;
}

function formatInspectedAt(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Toggle between ยังไม่ตรวจ and ตรวจแล้ว; saves to PATCH /api/sites/[id]/inspect.
 * Shows the new status right away (field signal can be slow) and rolls back if the save fails.
 */
export default function InspectButton({ site, onChange }: InspectButtonProps) {
  const { inspected, inspectedAt } = site;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const toggle = async () => {
    setSaving(true);
    setError(false);
    onChange({ id: site.id, inspected: !inspected, inspectedAt: inspected ? null : new Date().toISOString() });
    try {
      const res = await fetch(`/api/sites/${site.id}/inspect`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspected: !inspected }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved: InspectionUpdate = await res.json();
      onChange(saved);
    } catch (err) {
      console.error('Failed to save inspection:', err);
      onChange({ id: site.id, inspected, inspectedAt });
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={toggle}
        disabled={saving}
        aria-pressed={inspected}
        className={`w-full flex items-center justify-center gap-1.5 px-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
          inspected
            ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
            : 'bg-transparent hover:bg-secondary border-border text-[var(--card-foreground)]'
        }`}
        style={{ minHeight: '44px' }}
      >
        {inspected ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-60" />
        )}
        {inspected ? INSPECT_LABELS.done : INSPECT_LABELS.pending}
      </button>
      {error && (
        <div role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400 text-center">
          บันทึกไม่สำเร็จ — แตะเพื่อลองอีกครั้ง
        </div>
      )}
      {saving && <div className="text-[11px] text-[var(--muted-foreground)] text-center">กำลังบันทึก...</div>}
      {inspected && inspectedAt && !error && !saving && (
        <div className="text-[11px] text-[var(--muted-foreground)] text-center">ตรวจเมื่อ {formatInspectedAt(inspectedAt)}</div>
      )}
    </div>
  );
}
