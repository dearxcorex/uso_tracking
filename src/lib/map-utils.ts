import type { MapServicePoint } from '@/types';

/** Shorten full Thai provider names to display-friendly labels */
export function getProviderShort(name: string): string {
  if (name.includes('CAT')) return 'NT (CAT)';
  if (name.includes('TOT')) return 'NT (TOT)';
  if (name.includes('ทรู') || name.includes('True')) return 'True Move H';
  return name.length > 20 ? name.slice(0, 20) + '\u2026' : name;
}

/** Return Tailwind color class for a provider name (substring match) */
export function providerColor(provider: string): string {
  if (provider.includes('CAT')) return 'text-orange-600 dark:text-orange-400';
  if (provider.includes('TOT')) return 'text-violet-600 dark:text-violet-400';
  return 'text-rose-600 dark:text-rose-400';
}

/** Filter map points by inspection status + advanced filters */
export interface MapFilters {
  inspection: 'all' | 'inspected' | 'not-inspected';
  zone: string;
  serviceName: string;
  district: string;
  provider: string;
}

export function filterMapPoints(points: MapServicePoint[], filters: MapFilters): MapServicePoint[] {
  let pts = points;
  if (filters.inspection === 'inspected') pts = pts.filter((p) => p.inspected);
  else if (filters.inspection === 'not-inspected') pts = pts.filter((p) => !p.inspected);
  if (filters.zone) pts = pts.filter((p) => p.zone === filters.zone);
  if (filters.serviceName) pts = pts.filter((p) => p.serviceName === filters.serviceName);
  if (filters.district) pts = pts.filter((p) => p.district === filters.district);
  if (filters.provider) pts = pts.filter((p) => p.provider === filters.provider);
  return pts;
}

/** Compute inspection counts from a list of points */
export function computeInspectionCounts(points: MapServicePoint[]) {
  let inspected = 0;
  for (const p of points) {
    if (p.inspected) inspected++;
  }
  return { all: points.length, inspected, notInspected: points.length - inspected };
}

/** Filter upload points by status */
export function filterUploadPoints<T extends { uploadStatus: string | null }>(
  points: T[],
  filter: 'all' | 'pending' | 'uploaded'
): T[] {
  if (filter === 'pending') return points.filter((p) => p.uploadStatus === 'pending' || p.uploadStatus === 'partial');
  if (filter === 'uploaded') return points.filter((p) => p.uploadStatus === 'uploaded');
  return points;
}
