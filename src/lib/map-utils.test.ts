import { describe, it, expect } from 'vitest';
import {
  getProviderShort,
  providerColor,
  filterMapPoints,
  computeInspectionCounts,
  filterUploadPoints,
} from './map-utils';
import type { MapFilters } from './map-utils';
import type { MapServicePoint } from '@/types';

/* ─── Test data factory ─── */

function makePoint(overrides: Partial<MapServicePoint> = {}): MapServicePoint {
  return {
    id: 1,
    serviceName: 'Mobile',
    zone: 'USO Zone C',
    district: 'หนองบัวแดง',
    village: 'บ้านทดสอบ',
    subdistrict: 'ต.ทดสอบ',
    provider: 'บริษัท ทรู มูฟ เอช',
    latitude: 15.8,
    longitude: 102.0,
    inspected: false,
    installLocation: null,
    assetId: 'A001',
    oAssetId: null,
    ...overrides,
  };
}

const defaultFilters: MapFilters = {
  inspection: 'all',
  zone: '',
  serviceName: '',
  district: '',
  provider: '',
};

/* ─── getProviderShort ─── */

describe('getProviderShort', () => {
  it('should return NT (CAT) for full Thai CAT provider name', () => {
    expect(getProviderShort('บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (CAT เดิม)')).toBe('NT (CAT)');
  });

  it('should return NT (TOT) for full Thai TOT provider name', () => {
    expect(getProviderShort('บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (TOT เดิม)')).toBe('NT (TOT)');
  });

  it('should return True Move H for Thai True provider name', () => {
    expect(getProviderShort('บริษัท ทรู มูฟ เอช ยูนิเวอร์แซล คอมมิวนิเคชั่น จำกัด')).toBe('True Move H');
  });

  it('should return True Move H for English True provider name', () => {
    expect(getProviderShort('True Move H Universal Communication')).toBe('True Move H');
  });

  it('should truncate unknown providers longer than 20 chars', () => {
    const longName = 'Some Very Long Provider Name Here';
    const result = getProviderShort(longName);
    expect(result).toBe('Some Very Long Provi\u2026');
    expect(result.length).toBe(21); // 20 chars + ellipsis
  });

  it('should return short names as-is', () => {
    expect(getProviderShort('AIS')).toBe('AIS');
  });

  it('should handle empty string', () => {
    expect(getProviderShort('')).toBe('');
  });
});

/* ─── providerColor ─── */

describe('providerColor', () => {
  it('should return orange for CAT provider (substring match)', () => {
    expect(providerColor('บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (CAT เดิม)')).toBe('text-orange-600 dark:text-orange-400');
  });

  it('should return violet for TOT provider (substring match)', () => {
    expect(providerColor('บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (TOT เดิม)')).toBe('text-violet-600 dark:text-violet-400');
  });

  it('should return rose for True Move H (default)', () => {
    expect(providerColor('บริษัท ทรู มูฟ เอช ยูนิเวอร์แซล คอมมิวนิเคชั่น จำกัด')).toBe('text-rose-600 dark:text-rose-400');
  });

  it('should return rose for unknown providers', () => {
    expect(providerColor('Unknown Provider')).toBe('text-rose-600 dark:text-rose-400');
  });
});

/* ─── filterMapPoints ─── */

describe('filterMapPoints', () => {
  const points: MapServicePoint[] = [
    makePoint({ id: 1, inspected: true, zone: 'USO Zone C', serviceName: 'Mobile', district: 'หนองบัวแดง', provider: 'CAT' }),
    makePoint({ id: 2, inspected: false, zone: 'USO Zone C+', serviceName: 'Wi-Fi โรงเรียน', district: 'ภูเขียว', provider: 'TOT' }),
    makePoint({ id: 3, inspected: false, zone: 'USO Zone C', serviceName: 'Mobile', district: 'หนองบัวแดง', provider: 'CAT' }),
    makePoint({ id: 4, inspected: true, zone: 'USO Zone C+', serviceName: 'Wi-Fi โรงเรียน', district: 'ภูเขียว', provider: 'True' }),
  ];

  it('should return all points when filter is "all" with no advanced filters', () => {
    const result = filterMapPoints(points, defaultFilters);
    expect(result).toHaveLength(4);
  });

  it('should filter inspected points only', () => {
    const result = filterMapPoints(points, { ...defaultFilters, inspection: 'inspected' });
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.inspected)).toBe(true);
  });

  it('should filter not-inspected points only', () => {
    const result = filterMapPoints(points, { ...defaultFilters, inspection: 'not-inspected' });
    expect(result).toHaveLength(2);
    expect(result.every((p) => !p.inspected)).toBe(true);
  });

  it('should filter by zone', () => {
    const result = filterMapPoints(points, { ...defaultFilters, zone: 'USO Zone C+' });
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.zone === 'USO Zone C+')).toBe(true);
  });

  it('should filter by serviceName', () => {
    const result = filterMapPoints(points, { ...defaultFilters, serviceName: 'Mobile' });
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.serviceName === 'Mobile')).toBe(true);
  });

  it('should filter by district', () => {
    const result = filterMapPoints(points, { ...defaultFilters, district: 'ภูเขียว' });
    expect(result).toHaveLength(2);
  });

  it('should filter by provider', () => {
    const result = filterMapPoints(points, { ...defaultFilters, provider: 'CAT' });
    expect(result).toHaveLength(2);
  });

  it('should combine multiple filters', () => {
    const result = filterMapPoints(points, {
      inspection: 'not-inspected',
      zone: 'USO Zone C',
      serviceName: 'Mobile',
      district: 'หนองบัวแดง',
      provider: 'CAT',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('should return empty array when no points match', () => {
    const result = filterMapPoints(points, { ...defaultFilters, district: 'ไม่มี' });
    expect(result).toHaveLength(0);
  });

  it('should handle empty points array', () => {
    const result = filterMapPoints([], defaultFilters);
    expect(result).toHaveLength(0);
  });
});

/* ─── computeInspectionCounts ─── */

describe('computeInspectionCounts', () => {
  it('should count inspected and not-inspected points', () => {
    const points = [
      makePoint({ inspected: true }),
      makePoint({ inspected: false }),
      makePoint({ inspected: true }),
    ];
    const counts = computeInspectionCounts(points);
    expect(counts).toEqual({ all: 3, inspected: 2, notInspected: 1 });
  });

  it('should handle all inspected', () => {
    const points = [makePoint({ inspected: true }), makePoint({ inspected: true })];
    const counts = computeInspectionCounts(points);
    expect(counts).toEqual({ all: 2, inspected: 2, notInspected: 0 });
  });

  it('should handle none inspected', () => {
    const points = [makePoint({ inspected: false }), makePoint({ inspected: false })];
    const counts = computeInspectionCounts(points);
    expect(counts).toEqual({ all: 2, inspected: 0, notInspected: 2 });
  });

  it('should handle empty array', () => {
    const counts = computeInspectionCounts([]);
    expect(counts).toEqual({ all: 0, inspected: 0, notInspected: 0 });
  });
});

/* ─── filterUploadPoints ─── */

describe('filterUploadPoints', () => {
  const points = [
    { id: 1, uploadStatus: 'pending' },
    { id: 2, uploadStatus: 'uploaded' },
    { id: 3, uploadStatus: 'partial' },
    { id: 4, uploadStatus: 'pending' },
    { id: 5, uploadStatus: 'uploaded' },
  ];

  it('should return all points when filter is "all"', () => {
    expect(filterUploadPoints(points, 'all')).toHaveLength(5);
  });

  it('should return pending + partial when filter is "pending"', () => {
    const result = filterUploadPoints(points, 'pending');
    expect(result).toHaveLength(3);
    expect(result.every((p) => p.uploadStatus === 'pending' || p.uploadStatus === 'partial')).toBe(true);
  });

  it('should return uploaded only when filter is "uploaded"', () => {
    const result = filterUploadPoints(points, 'uploaded');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.uploadStatus === 'uploaded')).toBe(true);
  });

  it('should handle empty array', () => {
    expect(filterUploadPoints([], 'pending')).toHaveLength(0);
  });

  it('should handle null uploadStatus', () => {
    const pts = [{ id: 1, uploadStatus: null }];
    expect(filterUploadPoints(pts, 'pending')).toHaveLength(0);
    expect(filterUploadPoints(pts, 'uploaded')).toHaveLength(0);
    expect(filterUploadPoints(pts, 'all')).toHaveLength(1);
  });
});
