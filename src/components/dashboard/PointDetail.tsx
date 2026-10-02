'use client';

import { InspectionUpdate, VisitSite } from '@/types';
import { useDialog } from '@/hooks/useDialog';
import { googleMapsUrl, hasCoords, siteTitle, telHref } from '@/lib/points';
import { getProviderShort } from '@/lib/services';
import DepartmentBadge from './DepartmentBadge';
import InspectButton from './InspectButton';
import ServiceBadge from './ServiceBadge';

interface PointDetailProps {
  point: VisitSite;
  onClose: () => void;
  onInspected: (update: InspectionUpdate) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-muted-foreground shrink-0 w-24">{label}</span>
      <span className="text-foreground min-w-0 break-words">{value || '—'}</span>
    </div>
  );
}

export default function PointDetail({ point, onClose, onInspected }: PointDetailProps) {
  const dialogRef = useDialog<HTMLElement>(true, onClose);

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <aside
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="รายละเอียดจุดลงพื้นที่"
        className="relative w-full sm:max-w-xl h-full bg-background border-l border-border shadow-xl flex flex-col animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-border">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <DepartmentBadge department={point.department} />
              <ServiceBadge name={point.serviceName} />
              <span className="text-xs text-muted-foreground">{point.round}</span>
            </div>
            <h2 className="text-base font-semibold text-foreground leading-snug">{siteTitle(point)}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
            aria-label="ปิด"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4">
          <InspectButton site={point} onChange={onInspected} />

          {/* Contact */}
          {point.phone && (
            <section className="clay-card p-4 space-y-2">
              <a
                href={telHref(point.phone)}
                className="flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                style={{ minHeight: '44px' }}
              >
                โทร {point.phone}
              </a>
              {point.phoneSource && (
                <a
                  href={point.phoneSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[11px] text-muted-foreground hover:text-foreground truncate"
                  title={point.phoneSource}
                >
                  แหล่งที่มา: {point.phoneSource}
                </a>
              )}
            </section>
          )}

          {/* Location */}
          <section className="clay-card p-4 space-y-2">
            <InfoRow label="สถานที่ติดตั้ง" value={point.installLocation} />
            <InfoRow label="หมู่บ้าน" value={point.village} />
            <InfoRow label="ตำบล" value={point.subdistrict} />
            <InfoRow label="อำเภอ" value={point.district} />
            <InfoRow label="จังหวัด" value={point.province} />
            <InfoRow label="ลำดับ" value={point.villageCode && <span className="font-mono">{point.villageCode}</span>} />
            <InfoRow
              label="พิกัด"
              value={
                hasCoords(point)
                  ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
                  : <span className="text-amber-700 dark:text-amber-400">ไม่มีพิกัด</span>
              }
            />
            {hasCoords(point) && (
              <a
                href={googleMapsUrl(point.latitude, point.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold border border-primary/40 bg-primary/10 hover:bg-primary/20 text-foreground transition-colors"
                style={{ minHeight: '44px' }}
              >
                นำทางด้วย Google Maps
              </a>
            )}
          </section>

          {/* Plan */}
          <section className="clay-card p-4 space-y-2">
            <InfoRow label="ครั้งที่" value={point.round} />
            <InfoRow label="ส่วนงาน" value={point.department} />
            <InfoRow label="บริการ" value={`${point.serviceName}${point.serviceType ? ` (ประเภท ${point.serviceType})` : ''}`} />
            <InfoRow label="ผู้ให้บริการ" value={point.provider && <span title={point.provider}>{getProviderShort(point.provider)}</span>} />
            <InfoRow label="โครงการ" value={point.project} />
          </section>
        </div>
      </aside>
    </div>
  );
}
