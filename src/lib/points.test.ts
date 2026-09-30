import { describe, it, expect } from 'vitest';
import {
  EMPTY_FILTERS,
  compareSites,
  computeStats,
  countActiveFilters,
  filterPoints,
  formatLocation,
  getFilterOptions,
  googleMapsUrl,
  hasActiveFilters,
  hasCoords,
  siteCode,
  siteTitle,
  telHref,
} from './points';
import { DEFAULT_STYLE, getDepartmentStyle, getProviderShort, getServiceStyle } from './services';
import type { VisitSite } from '@/types';

function makeSite(overrides: Partial<VisitSite> = {}): VisitSite {
  return {
    id: 1,
    round: 'ค.9',
    department: 'อภ.',
    deptSeq: 1,
    serviceType: '1',
    serviceName: 'Wi-Fi หมู่บ้าน',
    villageCode: '36120101',
    village: 'หมู่ 1 ตาเนิน',
    subdistrict: 'ตาเนิน',
    district: 'เนินสง่า',
    province: 'ชัยภูมิ',
    installLocation: null,
    provider: 'บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (CAT เดิม)',
    latitude: 15.6,
    longitude: 102.2,
    project: 'USO Zone C',
    phone: null,
    phoneSource: null,
    inspected: false,
    inspectedAt: null,
    ...overrides,
  };
}

const sites = [
  makeSite({ id: 1 }),
  makeSite({
    id: 2,
    round: 'ค.10',
    department: 'บภ.',
    serviceName: 'Wi-Fi โรงเรียน',
    installLocation: 'โรงเรียนบ้านกุดขมิ้น',
    village: 'หมู่ 3 กุดขมิ้น',
    district: 'สีคิ้ว',
    province: 'นครราชสีมา',
    provider: 'บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (TOT เดิม)',
    phone: '065-9911395',
  }),
  makeSite({
    id: 3,
    department: 'ตภ.',
    serviceName: 'Wi-Fi โรงเรียน',
    installLocation: 'โรงเรียนบ้านไทรงาม',
    district: 'เทพสถิต',
    latitude: null,
    longitude: null,
  }),
];

describe('filterPoints', () => {
  it('returns everything with empty filters', () => {
    expect(filterPoints(sites, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filters by round, department, service, and district together', () => {
    expect(filterPoints(sites, { ...EMPTY_FILTERS, round: 'ค.10' }).map((p) => p.id)).toEqual([2]);
    expect(filterPoints(sites, { ...EMPTY_FILTERS, department: 'ตภ.' }).map((p) => p.id)).toEqual([3]);
    expect(filterPoints(sites, { ...EMPTY_FILTERS, serviceName: 'Wi-Fi โรงเรียน' }).map((p) => p.id)).toEqual([2, 3]);
    expect(filterPoints(sites, { ...EMPTY_FILTERS, district: 'สีคิ้ว' }).map((p) => p.id)).toEqual([2]);
    expect(filterPoints(sites, { ...EMPTY_FILTERS, round: 'ค.9', department: 'บภ.' })).toHaveLength(0);
  });

  it('searches location text, village code, and phone, ignoring surrounding spaces', () => {
    expect(filterPoints(sites, { ...EMPTY_FILTERS, search: ' กุดขมิ้น ' }).map((p) => p.id)).toEqual([2]);
    expect(filterPoints(sites, { ...EMPTY_FILTERS, search: '065-99' }).map((p) => p.id)).toEqual([2]);
    expect(filterPoints(sites, { ...EMPTY_FILTERS, search: 'นครราชสีมา' }).map((p) => p.id)).toEqual([2]);
    expect(filterPoints(sites, { ...EMPTY_FILTERS, search: 'ไม่มีแน่นอน' })).toHaveLength(0);
  });
});

describe('getFilterOptions', () => {
  it('orders rounds numerically and departments in department order', () => {
    const opts = getFilterOptions([...sites, makeSite({ id: 4, department: 'ผภ.' })]);
    expect(opts.rounds).toEqual(['ค.9', 'ค.10']);
    expect(opts.departments).toEqual(['อภ.', 'ตภ.', 'บภ.', 'ผภ.']);
    expect(opts.serviceNames).toHaveLength(2);
    expect(opts.districts).toHaveLength(3);
  });
});

describe('compareSites', () => {
  it('sorts by round, department, service (Thai order: โรงเรียน first), then visit order', () => {
    const unsorted = [
      makeSite({ id: 10, round: 'ค.10' }),
      makeSite({ id: 11, department: 'ผภ.' }),
      makeSite({ id: 12, serviceName: 'Wi-Fi โรงเรียน' }),
      makeSite({ id: 13, deptSeq: 2 }),
      makeSite({ id: 14, deptSeq: 1 }),
    ];
    expect([...unsorted].sort(compareSites).map((p) => p.id)).toEqual([12, 14, 13, 11, 10]);
  });
});

describe('computeStats', () => {
  it('counts totals, groupings, and school phones', () => {
    const stats = computeStats(sites);
    expect(stats.total).toBe(3);
    expect(stats.missingCoords).toBe(1);
    expect(stats.schools).toBe(2);
    expect(stats.schoolsWithPhone).toBe(1);
    expect(stats.inspected).toBe(0);
    expect(stats.byRound).toEqual({ 'ค.9': 2, 'ค.10': 1 });
    expect(stats.byDepartment).toEqual({ 'อภ.': 1, 'บภ.': 1, 'ตภ.': 1 });
    expect(stats.byServiceName).toEqual({ 'Wi-Fi หมู่บ้าน': 1, 'Wi-Fi โรงเรียน': 2 });
    expect(stats.byDepartmentService['อภ.']).toEqual({ 'Wi-Fi หมู่บ้าน': 1 });
    expect(Object.values(stats.byProvider).reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe('computeStats byDepartmentService', () => {
  it('splits each department by service', () => {
    const stats = computeStats([
      makeSite({ id: 1 }),
      makeSite({ id: 2, deptSeq: 2 }),
      makeSite({ id: 3, serviceName: 'Wi-Fi โรงเรียน' }),
      makeSite({ id: 4, department: 'ผภ.', serviceName: 'Wi-Fi โรงเรียน' }),
    ]);
    expect(stats.byDepartmentService).toEqual({
      'อภ.': { 'Wi-Fi หมู่บ้าน': 2, 'Wi-Fi โรงเรียน': 1 },
      'ผภ.': { 'Wi-Fi โรงเรียน': 1 },
    });
  });
});

describe('helpers', () => {
  it('countActiveFilters ignores search', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, search: 'x' })).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, round: 'ค.9', district: 'จัตุรัส' })).toBe(2);
  });

  it('hasActiveFilters detects any non-empty field', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, round: 'ค.9' })).toBe(true);
  });

  it('hasCoords requires both lat and lng', () => {
    expect(hasCoords(sites[0])).toBe(true);
    expect(hasCoords(sites[2])).toBe(false);
    expect(hasCoords(makeSite({ longitude: null }))).toBe(false);
  });

  it('siteTitle prefers the install location, falling back to the village', () => {
    expect(siteTitle(sites[1])).toBe('โรงเรียนบ้านกุดขมิ้น');
    expect(siteTitle(sites[0])).toBe('หมู่ 1 ตาเนิน');
    expect(siteTitle(makeSite({ village: null }))).toBe('—');
  });

  it('siteCode joins department and visit order', () => {
    expect(siteCode(makeSite({ department: 'บภ.', deptSeq: 7 }))).toBe('บภ.7');
    expect(siteCode(makeSite({ deptSeq: null }))).toBe('อภ.');
  });

  it('formatLocation joins non-empty parts', () => {
    expect(formatLocation(sites[0])).toBe('หมู่ 1 ตาเนิน / ตาเนิน / เนินสง่า');
    expect(formatLocation(makeSite({ village: null, subdistrict: null, district: null }))).toBe('');
  });

  it('telHref strips separators', () => {
    expect(telHref('044-810 905')).toBe('tel:044810905');
  });

  it('googleMapsUrl builds a directions link', () => {
    expect(googleMapsUrl(16.1, 102.2)).toBe('https://www.google.com/maps/dir/?api=1&destination=16.1,102.2');
  });
});

describe('services', () => {
  it('shortens NT provider names by legacy company', () => {
    expect(getProviderShort('บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (CAT เดิม)')).toBe('NT (CAT)');
    expect(getProviderShort('บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (TOT เดิม)')).toBe('NT (TOT)');
    expect(getProviderShort('อื่นๆ')).toBe('อื่นๆ');
  });

  it('falls back to the default style for unknown services and departments', () => {
    expect(getServiceStyle('Wi-Fi โรงเรียน')).not.toBe(DEFAULT_STYLE);
    expect(getServiceStyle('unknown')).toBe(DEFAULT_STYLE);
    expect(getDepartmentStyle('อภ.')).not.toBe(DEFAULT_STYLE);
    expect(getDepartmentStyle('xx')).toBe(DEFAULT_STYLE);
  });
});
