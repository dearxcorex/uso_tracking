'use client';

import { useState } from 'react';
import { INSPECT_LABELS } from '@/lib/inspect';

interface InspectButtonProps {
  siteId: number;
  inspected: boolean;
  inspectedAt: string | null;
  onChange: (id: number, inspected: boolean, inspectedAt: string | null) => void;
}

function formatInspectedAt(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Toggle between ยังไม่ตรวจ and ตรวจแล้ว; saves to PATCH /api/sites/[id]/inspect */
export default function InspectButton({ siteId, inspected, inspectedAt, onChange }: InspectButtonProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const toggle = async () => {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch(`/api/sites/${siteId}/inspect`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspected: !inspected }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { inspected: boolean; inspectedAt: string | null } = await res.json();
      onChange(siteId, data.inspected, data.inspectedAt);
    } catch (err) {
      console.error('Failed to save inspection:', err);
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
            ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white'
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
        {saving ? 'กำลังบันทึก...' : inspected ? INSPECT_LABELS.done : INSPECT_LABELS.pending}
      </button>
      {error && <div className="text-[11px] text-red-500 text-center">บันทึกไม่สำเร็จ ลองอีกครั้ง</div>}
      {inspected && inspectedAt && !error && (
        <div className="text-[11px] text-[var(--muted-foreground)] text-center">ตรวจเมื่อ {formatInspectedAt(inspectedAt)}</div>
      )}
    </div>
  );
}
