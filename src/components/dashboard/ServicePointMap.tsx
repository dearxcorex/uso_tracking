'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { VisitSite } from '@/types';
import { EMPTY_FILTERS, filterPoints, formatLocation, getFilterOptions, googleMapsUrl, hasActiveFilters, hasCoords, siteTitle } from '@/lib/points';
import type { PointFilters as Filters } from '@/lib/points';
import { DEPARTMENT_STYLES, getDepartmentStyle, getProviderShort } from '@/lib/services';
import DepartmentBadge from './DepartmentBadge';
import InspectButton from './InspectButton';
import { INSPECT_LABELS } from '@/lib/inspect';
import PhoneLink from './PhoneLink';
import PointFilters from './PointFilters';
import ServiceBadge from './ServiceBadge';

type MappedPoint = VisitSite & { latitude: number; longitude: number };

/* Pin Markers — color-coded by department; inspected sites show a check mark */

function createDepartmentPinIcon(department: string, inspected: boolean): L.DivIcon {
  const { hex: top, hexDark: bot } = getDepartmentStyle(department);
  const center = inspected
    ? `<circle cx="14" cy="12" r="6.5" fill="#fff"/><path d="M10.8 12.2l2.2 2.2 4.2-4.6" fill="none" stroke="${bot}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="14" cy="12" r="4.5" fill="#fff" opacity="0.95"/>`;
  const id = `pin-${top.slice(1)}`;

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
      ${center}
    </svg>`;

  return L.divIcon({
    className: 'map-pin-custom',
    html: svg,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

// Pre-cache one pin icon per department x inspection status
const pinIconCache: Record<string, L.DivIcon> = {};

function getDepartmentPin(department: string, inspected: boolean): L.DivIcon {
  const key = `${department}-${inspected}`;
  if (!pinIconCache[key]) {
    pinIconCache[key] = createDepartmentPinIcon(department, inspected);
  }
  return pinIconCache[key];
}

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
        // Expected when permission is denied or no fix is available; warn so the dev overlay stays quiet
        console.warn(`Geolocation unavailable (code ${err.code}): ${err.message}`);
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

/* Fit Bounds — refits when the filtered set of sites changes (not on status edits) */

function FitBounds({ points }: { points: MappedPoint[] }) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const idKey = points.map((p) => p.id).join(',');
  useEffect(() => {
    const current = pointsRef.current;
    if (current.length === 0) return;
    const bounds = L.latLngBounds(current.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }, [map, idKey]);
  return null;
}

/* Popup Content */

type InspectedHandler = (id: number, inspected: boolean, inspectedAt: string | null) => void;

function PopupContent({ point, onSelect, onInspected }: { point: MappedPoint; onSelect: (id: number) => void; onInspected: InspectedHandler }) {
  const locationLine = formatLocation(point);

  return (
    <div className="min-w-[250px] max-w-[320px] max-h-[65vh] overflow-y-auto space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <DepartmentBadge department={point.department} seq={point.deptSeq} />
        <ServiceBadge name={point.serviceName} />
        <span className="text-[11px] text-[var(--muted-foreground)]">{point.round}</span>
      </div>

      <div className="text-[13px] space-y-1.5 text-[var(--card-foreground)]">
        <div className="font-semibold">{siteTitle(point)}</div>
        {locationLine && (
          <div className="flex gap-2">
            <span className="text-[var(--muted-foreground)] shrink-0">🏘</span>
            <span>{locationLine}</span>
          </div>
        )}
        {point.provider && (
          <div className="flex gap-2">
            <span className="text-[var(--muted-foreground)] shrink-0">🏢 ผู้ให้บริการ:</span>
            <span className="font-medium">{getProviderShort(point.provider)}</span>
          </div>
        )}
        {point.phone && (
          <div className="flex gap-2">
            <span className="text-[var(--muted-foreground)] shrink-0">📞</span>
            <PhoneLink phone={point.phone} />
          </div>
        )}
      </div>

      <InspectButton siteId={point.id} inspected={point.inspected} inspectedAt={point.inspectedAt} onChange={onInspected} />

      <div className="flex gap-2">
        <button
          onClick={() => onSelect(point.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-muted transition-colors"
          style={{ minHeight: '48px' }}
        >
          รายละเอียด
        </button>
        <a
          href={googleMapsUrl(point.latitude, point.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-4 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground transition-colors"
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

/* Memoized cluster layer — only re-renders when the filtered points change */

const ClusterLayer = React.memo(function ClusterLayer({
  points,
  onSelect,
  onInspected,
}: {
  points: MappedPoint[];
  onSelect: (id: number) => void;
  onInspected: InspectedHandler;
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
          icon={getDepartmentPin(point.department, point.inspected)}
        >
          <Popup maxWidth={320} minWidth={260} autoPanPadding={L.point(20, 20)}>
            <PopupContent point={point} onSelect={onSelect} onInspected={onInspected} />
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
          หน่วยงาน
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {open && (
          <div className="mt-1 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-2 shadow-sm space-y-1">
            {Object.entries(DEPARTMENT_STYLES).map(([name, style]) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: style.hex }} />
                <span className="text-[11px] text-foreground whitespace-nowrap">{name}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-border">
              <span className="w-2.5 text-center text-[11px] leading-none text-emerald-500 font-bold">✓</span>
              <span className="text-[11px] text-foreground whitespace-nowrap">{INSPECT_LABELS.done}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Main Map Component */

interface ServicePointMapProps {
  points: VisitSite[];
  onSelect: (id: number) => void;
  onInspected: InspectedHandler;
}

export default function ServicePointMap({ points, onSelect, onInspected }: ServicePointMapProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const mappable = useMemo(() => points.filter(hasCoords), [points]);
  const options = useMemo(() => getFilterOptions(points), [points]);
  const filteredPoints = useMemo(() => filterPoints(mappable, filters) as MappedPoint[], [mappable, filters]);
  const hiddenCount = points.length - mappable.length;

  const toggleFilters = useCallback(() => setShowFilters((v) => !v), []);

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: 'calc(100dvh - 140px)', minHeight: '400px' }}>
      {/* Filter bar */}
      <div className="clay-card p-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 px-1.5 text-xs text-muted-foreground">
            แสดง <span className="font-mono text-foreground">{filteredPoints.length}</span> จุดบนแผนที่
            {hiddenCount > 0 && <span className="text-amber-600 dark:text-amber-400"> · {hiddenCount} จุดไม่มีพิกัด</span>}
          </div>
          <button
            onClick={toggleFilters}
            className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0 ${
              showFilters
                ? 'bg-[var(--foreground)]/10 text-[var(--foreground)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="ตัวกรอง"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {hasActiveFilters(filters) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-500 rounded-full border border-card" />
            )}
          </button>
        </div>

        <div className={`overflow-hidden transition-all duration-200 ${showFilters ? 'max-h-64 opacity-100 mt-2.5' : 'max-h-0 opacity-0'}`}>
          <div className="pt-2 border-t border-border">
            <PointFilters filters={filters} options={options} onChange={setFilters} />
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
          <ClusterLayer points={filteredPoints} onSelect={onSelect} onInspected={onInspected} />
          <LocationControl />
          <MapLegend />
        </MapContainer>
      </div>
    </div>
  );
}
