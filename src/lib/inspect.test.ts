import { describe, it, expect } from 'vitest';
import { inspectUpdate, parseInspectBody, parseSiteId } from './inspect';

describe('parseSiteId', () => {
  it('accepts positive integers only', () => {
    expect(parseSiteId('42')).toBe(42);
    expect(parseSiteId('4x')).toBeNull();
    expect(parseSiteId('-1')).toBeNull();
    expect(parseSiteId('')).toBeNull();
  });
});

describe('parseInspectBody', () => {
  it('requires a boolean inspected field', () => {
    expect(parseInspectBody({ inspected: true })).toBe(true);
    expect(parseInspectBody({ inspected: false })).toBe(false);
    expect(parseInspectBody({ inspected: 'true' })).toBeNull();
    expect(parseInspectBody({})).toBeNull();
    expect(parseInspectBody(null)).toBeNull();
  });
});

describe('inspectUpdate', () => {
  it('stamps the time when inspected and clears it when undone', () => {
    const now = new Date('2026-09-30T08:00:00Z');
    expect(inspectUpdate(true, now)).toEqual({ inspected: true, inspected_at: now });
    expect(inspectUpdate(false, now)).toEqual({ inspected: false, inspected_at: null });
  });
});
