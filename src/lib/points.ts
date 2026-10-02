import type { VisitSite, VisitStats } from '@/types';
import { DEPARTMENTS, SCHOOL_SERVICE } from '@/lib/services';
import { INSPECT_LABELS } from '@/lib/inspect';

/** Inspection filter value; '' means all. Shown as INSPECT_LABELS via filterLabel() */
export type InspectionFilter = '' | keyof typeof INSPECT_LABELS;

export interface PointFilters {
  search: string;
  round: string;
  department: string;
  serviceName: string;
  district: string;
  inspection: InspectionFilter;
}

/** The dropdown/chip filters (everything but search), in mobile chip order */
export const FILTER_KEYS = ['department', 'inspection', 'round', 'serviceName', 'district'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export type FilterOptions = ReturnType<typeof getFilterOptions>;

export const EMPTY_FILTERS: PointFilters = {
  search: '',
  round: '',
  department: '',
  serviceName: '',
  district: '',
  inspection: '',
};

export function hasActiveFilters(filters: PointFilters): boolean {
  return Object.values(filters).some((v) => v !== '');
}

/** Number of dropdown/chip filters set (search excluded) — for the filter button badge */
export function countActiveFilters(filters: PointFilters): number {
  return FILTER_KEYS.filter((key) => filters[key]).length;
}

/** Display text for a filter value (inspection values are keys of INSPECT_LABELS) */
export function filterLabel(key: FilterKey, value: string): string {
  return key === 'inspection' && value in INSPECT_LABELS ? INSPECT_LABELS[value as keyof typeof INSPECT_LABELS] : value;
}

/** Thai-aware sort that also orders embedded numbers naturally ('ค.9' before 'ค.10') */
function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'th', { numeric: true });
}

function departmentIndex(department: string): number {
  const i = DEPARTMENTS.indexOf(department);
  return i === -1 ? DEPARTMENTS.length : i;
}

/** Round, then department (อภ./ตภ./บภ./ผภ.), then service, then the department's visit order */
export function compareSites(a: VisitSite, b: VisitSite): number {
  return (
    compareText(a.round, b.round) ||
    departmentIndex(a.department) - departmentIndex(b.department) ||
    compareText(a.serviceName, b.serviceName) ||
    (a.deptSeq ?? Infinity) - (b.deptSeq ?? Infinity) ||
    a.id - b.id
  );
}

export function filterPoints(points: VisitSite[], filters: PointFilters): VisitSite[] {
  const q = filters.search.trim().toLowerCase();
  return points.filter((p) => {
    if (filters.round && p.round !== filters.round) return false;
    if (filters.department && p.department !== filters.department) return false;
    if (filters.serviceName && p.serviceName !== filters.serviceName) return false;
    if (filters.district && p.district !== filters.district) return false;
    if (filters.inspection === 'done' && !p.inspected) return false;
    if (filters.inspection === 'pending' && p.inspected) return false;
    if (q) {
      const haystack = [p.installLocation, p.village, p.subdistrict, p.district, p.province, p.villageCode, p.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Unique, sorted values for filter dropdowns */
export function getFilterOptions(points: VisitSite[]) {
  const uniq = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))].sort(compareText);
  return {
    rounds: uniq(points.map((p) => p.round)),
    departments: uniq(points.map((p) => p.department)).sort((a, b) => departmentIndex(a) - departmentIndex(b)),
    serviceNames: uniq(points.map((p) => p.serviceName)),
    inspection: ['pending', 'done'] as InspectionFilter[],
    districts: uniq(points.map((p) => p.district)),
  };
}

export function computeStats(points: VisitSite[]): VisitStats {
  const countBy = (key: (p: VisitSite) => string | null) => {
    const out: Record<string, number> = {};
    for (const p of points) {
      const k = key(p);
      if (k) out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  };
  const schools = points.filter((p) => p.serviceName === SCHOOL_SERVICE);
  const byDepartmentService: Record<string, Record<string, number>> = {};
  const inspectedByDepartment: Record<string, number> = {};
  const inspectedByDepartmentService: Record<string, Record<string, number>> = {};
  for (const p of points) {
    const byService = (byDepartmentService[p.department] ??= {});
    byService[p.serviceName] = (byService[p.serviceName] ?? 0) + 1;
    if (p.inspected) {
      inspectedByDepartment[p.department] = (inspectedByDepartment[p.department] ?? 0) + 1;
      const inspectedByService = (inspectedByDepartmentService[p.department] ??= {});
      inspectedByService[p.serviceName] = (inspectedByService[p.serviceName] ?? 0) + 1;
    }
  }

  return {
    total: points.length,
    missingCoords: points.filter((p) => !hasCoords(p)).length,
    schools: schools.length,
    schoolsWithPhone: schools.filter((p) => p.phone).length,
    inspected: points.filter((p) => p.inspected).length,
    byRound: countBy((p) => p.round),
    byDepartment: countBy((p) => p.department),
    byDepartmentService,
    inspectedByDepartment,
    inspectedByDepartmentService,
    byServiceName: countBy((p) => p.serviceName),
    byDistrict: countBy((p) => p.district),
    byProvider: countBy((p) => p.provider),
  };
}

export interface DepartmentProgress {
  department: string;
  inspected: number;
  total: number;
}

/** Inspected x/total per department present in `points`, in display order (อภ./ตภ./บภ./ผภ.) */
export function departmentProgress(points: VisitSite[]): DepartmentProgress[] {
  const byDepartment = new Map<string, DepartmentProgress>();
  for (const p of points) {
    let entry = byDepartment.get(p.department);
    if (!entry) byDepartment.set(p.department, (entry = { department: p.department, inspected: 0, total: 0 }));
    entry.total += 1;
    if (p.inspected) entry.inspected += 1;
  }
  return [...byDepartment.values()].sort(
    (a, b) => departmentIndex(a.department) - departmentIndex(b.department) || compareText(a.department, b.department)
  );
}

export function hasCoords(p: VisitSite): p is VisitSite & { latitude: number; longitude: number } {
  return p.latitude !== null && p.longitude !== null;
}

/** Display name: the school for Wi-Fi โรงเรียน, the village for Wi-Fi หมู่บ้าน */
export function siteTitle(p: Pick<VisitSite, 'installLocation' | 'village'>): string {
  return p.installLocation ?? p.village ?? '—';
}

/** 'village / subdistrict / district' with blanks skipped */
export function formatLocation(p: Pick<VisitSite, 'village' | 'subdistrict' | 'district'>): string {
  return [p.village, p.subdistrict, p.district].filter(Boolean).join(' / ');
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
