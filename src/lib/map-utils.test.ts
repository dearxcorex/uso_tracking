import { describe, it, expect } from 'vitest';
import { getProviderShort, providerColor } from './map-utils';

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
