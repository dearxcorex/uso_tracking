'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapServicePoint } from '@/types';
import { getProviderShort, providerColor, filterMapPoints, computeInspectionCounts } from '@/lib/map-utils';
import type { MapFilters } from '@/lib/map-utils';

type FilterType = MapFilters['inspection'];

const defaultFilters: MapFilters = {
  inspection: 'all',
  zone: '',
  serviceName: '',
  district: '',
  provider: '',
};

/* Filter Select */

function MapFilterSelect({
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
        className="text-xs rounded-lg border border-border bg-card text-foreground px-2 py-1.5 max-w-[160px] truncate focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-colors"
      >
        <option value="">ทั้งหมด</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

/* Pin Markers — color-coded by service name */

const SERVICE_PIN_COLORS: Record<string, { top: string; bot: string }> = {
  'Wi-Fi โรงเรียน': { top: '#D946EF', bot: '#C026D3' },
  'Mobile':         { top: '#10B981', bot: '#059669' },
  'อาคาร USO Net':  { top: '#F59E0B', bot: '#D97706' },
  'ห้อง USO Wrap':  { top: '#F43F5E', bot: '#E11D48' },
  'Wi-Fi หมู่บ้าน':  { top: '#3B82F6', bot: '#2563EB' },
  'Wi-Fi รพ.สต.':   { top: '#06B6D4', bot: '#0891B2' },
};

const DEFAULT_PIN_COLOR = { top: '#14B8A6', bot: '#0D9488' };

function getServiceColor(serviceName: string) {
  return SERVICE_PIN_COLORS[serviceName] || DEFAULT_PIN_COLOR;
}

function createServicePinIcon(serviceName: string, inspected: boolean): L.DivIcon {
  const { top, bot } = getServiceColor(serviceName);
  const id = `pin-${serviceName.replace(/\s+/g, '-')}-${inspected ? 'i' : 'n'}`;

  // Inspected: filled circle with white checkmark. Not inspected: white empty dot.
  const innerCircle = inspected
    ? `<circle cx="14" cy="12" r="5" fill="${bot}"/>
       <path d="M10.5 12 L13 14.5 L17.5 9.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="14" cy="12" r="4.5" fill="#fff" opacity="0.95"/>`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${top}"/>
          <stop offset="100%" stop-color="${bot}"/>
        </linearGradient>
      </defs>
      <path d="M14 36 C14 36 3 20 3 12 A11 11 0 1 1 25 12 C25 20 14 36 14 36Z"
            fill="url(#${id})" stroke="${bot}" stroke-width="0.5" opacity="0.9"/>
      ${innerCircle}
    </svg>`;

  return L.divIcon({
    className: 'map-pin-custom',
    html: svg,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

// Pre-cache pin icons for each service name × inspected combination
const pinIconCache: Record<string, L.DivIcon> = {};

function getServicePin(serviceName: string, inspected: boolean): L.DivIcon {
  const key = `${serviceName}:${inspected}`;
  if (!pinIconCache[key]) {
    pinIconCache[key] = createServicePinIcon(serviceName, inspected);
  }
  return pinIconCache[key];
}

/* Legend labels for service name colors */
const SERVICE_LEGEND: { name: string; color: string }[] = [
  { name: 'Wi-Fi โรงเรียน', color: '#D946EF' },
  { name: 'Mobile', color: '#10B981' },
  { name: 'อาคาร USO Net', color: '#F59E0B' },
  { name: 'ห้อง USO Wrap', color: '#F43F5E' },
  { name: 'Wi-Fi หมู่บ้าน', color: '#3B82F6' },
  { name: 'Wi-Fi รพ.สต.', color: '#06B6D4' },
];

/* Location Control — auto-follow with watchPosition */

function LocationControl() {
  const map = useMap();
  const [status, setStatus] = useState<'loading' | 'following' | 'active' | 'error'>('loading');
  const statusRef = useRef(status);
  statusRef.current = status;
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const firstFixRef = useRef(true);

  const updatePosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const latlng = L.latLng(latitude, longitude);

    // Update or create accuracy circle
    if (circleRef.current) {
      circleRef.current.setLatLng(latlng).setRadius(accuracy);
    } else {
      circleRef.current = L.circle(latlng, {
        radius: accuracy,
        className: 'location-accuracy-circle',
        interactive: false,
      }).addTo(map);
    }

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      markerRef.current = L.marker(latlng, {
        icon: L.divIcon({
          className: 'current-location-dot',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
    }

    // First fix: fly to location and start following
    if (firstFixRef.current) {
      firstFixRef.current = false;
      map.flyTo(latlng, 15, { duration: 1 });
      setStatus('following');
    } else if (statusRef.current === 'following') {
      // Keep centering on user while following
      map.panTo(latlng, { animate: true, duration: 0.5 });
    }
  }, [map]);

  // Auto-start watchPosition on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      updatePosition,
      (err) => {
        console.error('Geolocation error:', err);
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (markerRef.current) map.removeLayer(markerRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop following when user drags the map manually
  useEffect(() => {
    const onDragStart = () => {
      if (statusRef.current === 'following') setStatus('active');
    };
    map.on('dragstart', onDragStart);
    return () => { map.off('dragstart', onDragStart); };
  }, [map]);

  const handleClick = useCallback(() => {
    if (status === 'error') {
      // Retry
      firstFixRef.current = true;
      setStatus('loading');
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        updatePosition,
        () => setStatus('error'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
      return;
    }

    if (status === 'active') {
      // Re-center and resume following
      if (markerRef.current) {
        const latlng = markerRef.current.getLatLng();
        map.flyTo(latlng, Math.max(map.getZoom(), 15), { duration: 0.5 });
      }
      setStatus('following');
    } else if (status === 'following') {
      // Stop following (just show dot)
      setStatus('active');
    }
  }, [map, status, updatePosition]);

  // Icon based on state
  const isFollowing = status === 'following';

  return (
    <div
      className="leaflet-bottom leaflet-right"
      style={{ pointerEvents: 'none', marginBottom: '20px', marginRight: '10px' }}
    >
      <div className="leaflet-control" style={{ pointerEvents: 'auto' }}>
        <button
          onClick={handleClick}
          title={isFollowing ? 'หยุดติดตาม' : 'ติดตามตำแหน่งของฉัน'}
          className={`flex items-center justify-center w-10 h-10 rounded-lg border shadow-sm transition-colors ${
            isFollowing
              ? 'bg-primary text-primary-foreground border-primary'
              : status === 'active'
              ? 'bg-card border-primary/40 text-primary'
              : status === 'error'
              ? 'bg-card border-red-400/40 text-red-500'
              : 'bg-card border-border text-muted-foreground'
          }`}
        >
          {status === 'loading' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isFollowing ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="4" />
              <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* Fit Bounds */

function FitBounds({ points }: { points: MapServicePoint[] }) {
  const map = useMap();
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (points.length === 0 || hasFittedRef.current) return;
    hasFittedRef.current = true;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

/* Badges */

function ServiceNameBadge({ name }: { name: string }) {
  const cls =
    name === 'Wi-Fi หมู่บ้าน' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' :
    name === 'Mobile' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
    name === 'Wi-Fi โรงเรียน' ? 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400' :
    name === 'อาคาร USO Net' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
    name === 'ห้อง USO Wrap' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
    'bg-teal-500/10 text-teal-600 dark:text-teal-400';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {name}
    </span>
  );
}

function ZoneBadge({ zone }: { zone: string }) {
  const isPlus = zone.includes('C+');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      isPlus
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    }`}>
      {isPlus ? 'Zone C+' : 'Zone C'}
    </span>
  );
}

/* Popup Content — manages its own inspection state */

function PopupContent({
  point,
  onToggle,
}: {
  point: MapServicePoint;
  onToggle: (id: number) => Promise<boolean>;
}) {
  const [inspected, setInspected] = useState(point.inspected);
  const [toggling, setToggling] = useState(false);

  const handleClick = async () => {
    setToggling(true);
    try {
      const newInspected = await onToggle(point.id);
      setInspected(newInspected);
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  // Condensed location: village / subdistrict / district
  const locationParts = [point.village, point.subdistrict, point.district].filter(Boolean);
  const locationLine = locationParts.join(' / ');

  return (
    <div className="min-w-[250px] max-w-[320px] max-h-[65vh] overflow-y-auto space-y-2.5">
      {/* Header: badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <ServiceNameBadge name={point.serviceName} />
        {point.zone && <ZoneBadge zone={point.zone} />}
      </div>

      {/* Status banner */}
      <div className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors ${
        inspected
          ? 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300 border border-emerald-500/30'
          : 'bg-orange-500/20 text-orange-700 dark:bg-orange-500/25 dark:text-orange-300 border border-orange-500/30'
      }`}>
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${inspected ? 'bg-emerald-500' : 'bg-orange-500'}`} />
        {inspected ? 'ตรวจแล้ว' : 'ยังไม่ตรวจ'}
      </div>

      {/* Detail fields */}
      <div className="text-[13px] space-y-1.5 text-[var(--card-foreground)]">
        {point.assetId && (
          <div className="flex gap-2">
            <span className="text-[var(--muted-foreground)] shrink-0">🏷 Asset ID:</span>
            <span className="font-mono font-medium text-xs bg-[var(--muted)]/30 px-1.5 py-0.5 rounded">{point.assetId}</span>
          </div>
        )}
        {point.oAssetId && (
          <div className="flex gap-2">
            <span className="text-[var(--muted-foreground)] shrink-0">🔖 O Asset ID:</span>
            <span className="font-mono font-medium text-xs bg-[var(--muted)]/30 px-1.5 py-0.5 rounded">{point.oAssetId}</span>
          </div>
        )}
        {point.installLocation && (
          <div className="flex gap-2">
            <span className="text-[var(--muted-foreground)] shrink-0">📍 สถานที่:</span>
            <span className="font-medium">{point.installLocation}</span>
          </div>
        )}
        {locationLine && (
          <div className="flex gap-2">
            <span className="text-[var(--muted-foreground)] shrink-0">🏘</span>
            <span className="font-medium">{locationLine}</span>
          </div>
        )}
        <div className="flex gap-2">
          <span className="text-[var(--muted-foreground)] shrink-0">🏢 ผู้ให้บริการ:</span>
          <span className={`font-semibold ${providerColor(point.provider)}`}>{getProviderShort(point.provider)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleClick}
          disabled={toggling}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 rounded-xl text-sm font-semibold text-white transition-colors ${
            inspected
              ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700'
              : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'
          } ${toggling ? 'opacity-50' : ''}`}
          style={{ minHeight: '48px' }}
        >
          {toggling ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : inspected ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              ยกเลิกตรวจ
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              ตรวจแล้ว
            </>
          )}
        </button>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-4 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground transition-colors"
          style={{ minHeight: '48px' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          นำทาง
        </a>
      </div>
    </div>
  );
}

/* Memoized cluster layer — only re-renders when points or toggle function change */

const ClusterLayer = React.memo(function ClusterLayer({
  points,
  onToggle,
  markersRef,
}: {
  points: MapServicePoint[];
  onToggle: (id: number) => Promise<boolean>;
  markersRef: React.MutableRefObject<Record<number, L.Marker>>;
}) {
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={50}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
    >
      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.latitude, point.longitude]}
          icon={getServicePin(point.serviceName, point.inspected)}
          ref={(el) => { if (el) markersRef.current[point.id] = el; }}
        >
          <Popup maxWidth={320} minWidth={260} autoPanPadding={L.point(20, 20)}>
            <PopupContent point={point} onToggle={onToggle} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
});

/* Collapsible Legend */

function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'none', marginBottom: '8px', marginLeft: '8px' }}>
      <div className="leaflet-control" style={{ pointerEvents: 'auto' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 shadow-sm text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          ประเภทบริการ
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {open && (
          <div className="mt-1 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-2 shadow-sm">
            <div className="space-y-1">
              {SERVICE_LEGEND.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-foreground whitespace-nowrap">{item.name}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-1.5 pt-1.5 flex items-center gap-1.5">
              <svg className="w-2.5 h-2.5 text-emerald-600 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 5 L4.5 7.5 L8 3" />
              </svg>
              <span className="text-[10px] text-muted-foreground">= ตรวจแล้ว</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Main Map Component */

interface ServicePointMapProps {
  initialPoints: MapServicePoint[];
}

export default function ServicePointMap({ initialPoints }: ServicePointMapProps) {
  // Data ref — mutable, does NOT trigger cluster re-render on toggle
  const allPointsRef = useRef<MapServicePoint[]>(initialPoints);
  const markersRef = useRef<Record<number, L.Marker>>({});

  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Separate counts state — re-renders filter pills only, not markers
  const [counts, setCounts] = useState(() => computeInspectionCounts(initialPoints));

  // Derive unique filter options from all points (computed once)
  const filterOptions = useMemo(() => {
    const pts = allPointsRef.current;
    return {
      zones: [...new Set(pts.map((p) => p.zone).filter(Boolean))].sort() as string[],
      serviceNames: [...new Set(pts.map((p) => p.serviceName).filter(Boolean))].sort() as string[],
      districts: [...new Set(pts.map((p) => p.district).filter(Boolean))].sort() as string[],
      providers: [...new Set(pts.map((p) => p.provider).filter(Boolean))].sort() as string[],
    };
  }, []);

  const updateFilter = useCallback(<K extends keyof MapFilters>(key: K, value: MapFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const hasAdvancedFilters = filters.zone !== '' || filters.serviceName !== '' || filters.district !== '' || filters.provider !== '';

  const filteredPoints = useMemo(() => filterMapPoints(allPointsRef.current, filters), [filters]);

  const handleToggle = useCallback(async (id: number): Promise<boolean> => {
    const res = await fetch(`/api/service-points/${id}/inspect`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Toggle failed');
    const updated = await res.json();

    // Update data ref (no cluster re-render)
    allPointsRef.current = allPointsRef.current.map((p) =>
      p.id === id ? { ...p, inspected: updated.inspected } : p
    );

    // Update filter counts (re-renders pills only)
    setCounts((prev) => ({
      all: prev.all,
      inspected: prev.inspected + (updated.inspected ? 1 : -1),
      notInspected: prev.notInspected + (updated.inspected ? -1 : 1),
    }));

    // Update marker icon imperatively — no re-render, popup stays open
    const marker = markersRef.current[id];
    if (marker) {
      const point = allPointsRef.current.find((p) => p.id === id);
      if (point) marker.setIcon(getServicePin(point.serviceName, updated.inspected));
    }

    return updated.inspected;
  }, []);

  const inspectionButtons: { key: FilterType; label: string; count: number; activeClass: string }[] = [
    {
      key: 'all',
      label: 'ทั้งหมด',
      count: counts.all,
      activeClass: 'bg-[var(--foreground)]/10 text-[var(--foreground)]',
    },
    {
      key: 'inspected',
      label: 'ตรวจแล้ว',
      count: counts.inspected,
      activeClass: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
    },
    {
      key: 'not-inspected',
      label: 'ยังไม่ตรวจ',
      count: counts.notInspected,
      activeClass: 'bg-orange-600/15 text-orange-700 dark:text-orange-400',
    },
  ];

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: 'calc(100dvh - 140px)', minHeight: '400px' }}>
      {/* Filter bar */}
      <div className="clay-card p-2 shrink-0">
        {/* Row 1: Inspection pills + filter toggle */}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5 bg-[var(--muted)]/20 rounded-md p-0.5 flex-1 min-w-0">
            {inspectionButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => updateFilter('inspection', btn.key)}
                className={`flex-1 inline-flex items-center justify-center gap-1 px-1.5 py-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filters.inspection === btn.key
                    ? btn.activeClass
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {btn.label}
                <span className="font-mono text-[10px] opacity-70">
                  {btn.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowAdvancedFilters((v) => !v)}
            className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0 ${
              showAdvancedFilters
                ? 'bg-[var(--foreground)]/10 text-[var(--foreground)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="ตัวกรองขั้นสูง"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {hasAdvancedFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-500 rounded-full border border-card" />
            )}
          </button>
        </div>

        {/* Row 2: Advanced filters (collapsible) */}
        <div className={`overflow-hidden transition-all duration-200 ${showAdvancedFilters ? 'max-h-40 opacity-100 mt-2.5' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-border">
            <MapFilterSelect label="โซน" value={filters.zone} options={filterOptions.zones} onChange={(v) => updateFilter('zone', v)} />
            <MapFilterSelect label="บริการ" value={filters.serviceName} options={filterOptions.serviceNames} onChange={(v) => updateFilter('serviceName', v)} />
            <MapFilterSelect label="อำเภอ" value={filters.district} options={filterOptions.districts} onChange={(v) => updateFilter('district', v)} />
            <MapFilterSelect label="ผู้ให้บริการ" value={filters.provider} options={filterOptions.providers} onChange={(v) => updateFilter('provider', v)} />
            {hasAdvancedFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-secondary"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="clay-card overflow-hidden mt-2.5 flex-1">
        <MapContainer
          center={[15.8, 102.0]}
          zoom={10}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={filteredPoints} />
          <ClusterLayer points={filteredPoints} onToggle={handleToggle} markersRef={markersRef} />
          <LocationControl />
          {/* Legend — collapsible, hidden by default */}
          <MapLegend />
        </MapContainer>
      </div>
    </div>
  );
}
