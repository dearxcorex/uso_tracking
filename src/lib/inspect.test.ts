import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeInspectToggle, parseServicePointId } from './inspect';

describe('parseServicePointId', () => {
  it('should parse valid integer string', () => {
    expect(parseServicePointId('123')).toBe(123);
  });

  it('should parse "0" as valid', () => {
    expect(parseServicePointId('0')).toBe(0);
  });

  it('should return null for non-numeric string', () => {
    expect(parseServicePointId('abc')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseServicePointId('')).toBeNull();
  });

  it('should parse string with leading number', () => {
    // parseInt('123abc') returns 123 — this is expected JS behavior
    expect(parseServicePointId('123abc')).toBe(123);
  });
});

describe('computeInspectToggle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should toggle false -> true with timestamp and pending status', () => {
    const result = computeInspectToggle(false);

    expect(result.inspected).toBe(true);
    expect(result.inspected_at).toEqual(new Date('2026-03-07T12:00:00Z'));
    expect(result.upload_status).toBe('pending');
  });

  it('should toggle true -> false with null timestamp and null status', () => {
    const result = computeInspectToggle(true);

    expect(result.inspected).toBe(false);
    expect(result.inspected_at).toBeNull();
    expect(result.upload_status).toBeNull();
  });
});
