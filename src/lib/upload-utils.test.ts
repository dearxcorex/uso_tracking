import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeUploadToggle,
  validateToggleRequest,
  extractLatestImages,
  validateBatchImageIds,
  fetchBatchImages,
  type InspectionImages,
} from './upload-utils';

describe('computeUploadToggle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should toggle "uploaded" → "pending" with null timestamp', () => {
    const result = computeUploadToggle('uploaded');
    expect(result.upload_status).toBe('pending');
    expect(result.uploaded_at).toBeNull();
  });

  it('should toggle "pending" → "uploaded" with current timestamp', () => {
    const result = computeUploadToggle('pending');
    expect(result.upload_status).toBe('uploaded');
    expect(result.uploaded_at).toEqual(new Date('2026-03-08T12:00:00Z'));
  });

  it('should toggle "partial" → "uploaded" with current timestamp', () => {
    const result = computeUploadToggle('partial');
    expect(result.upload_status).toBe('uploaded');
    expect(result.uploaded_at).toEqual(new Date('2026-03-08T12:00:00Z'));
  });

  it('should toggle null → "uploaded" with current timestamp', () => {
    const result = computeUploadToggle(null);
    expect(result.upload_status).toBe('uploaded');
    expect(result.uploaded_at).not.toBeNull();
  });
});

describe('validateToggleRequest', () => {
  it('should accept valid ids array', () => {
    const result = validateToggleRequest({ ids: [1, 2, 3] });
    expect(result.valid).toBe(true);
    expect(result.ids).toEqual([1, 2, 3]);
  });

  it('should accept single id', () => {
    const result = validateToggleRequest({ ids: [42] });
    expect(result.valid).toBe(true);
    expect(result.ids).toEqual([42]);
  });

  it('should reject null body', () => {
    const result = validateToggleRequest(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject missing ids', () => {
    const result = validateToggleRequest({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty array');
  });

  it('should reject empty ids array', () => {
    const result = validateToggleRequest({ ids: [] });
    expect(result.valid).toBe(false);
  });

  it('should reject non-array ids', () => {
    const result = validateToggleRequest({ ids: 'abc' });
    expect(result.valid).toBe(false);
  });

  it('should reject ids with non-integer values', () => {
    const result = validateToggleRequest({ ids: [1, 2.5] });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('positive integer');
  });

  it('should reject ids with zero', () => {
    const result = validateToggleRequest({ ids: [0] });
    expect(result.valid).toBe(false);
  });

  it('should reject ids with negative numbers', () => {
    const result = validateToggleRequest({ ids: [-1] });
    expect(result.valid).toBe(false);
  });

  it('should reject ids with string values', () => {
    const result = validateToggleRequest({ ids: ['abc'] });
    expect(result.valid).toBe(false);
  });
});

describe('extractLatestImages', () => {
  it('should extract images from a valid inspection', () => {
    const inspections = [{
      equip_image_url: 'http://example.com/equip.jpg',
      overall_image_url: 'http://example.com/overall.jpg',
      user_name: 'วิทวัส',
      user_surname: 'ตั้งประเสริฐ',
      created_at: '2026-03-07T19:17:36',
      status: 'normal_use',
    }];
    const result = extractLatestImages(inspections);
    expect(result.equipImageUrl).toBe('http://example.com/equip.jpg');
    expect(result.overallImageUrl).toBe('http://example.com/overall.jpg');
    expect(result.inspectedBy).toBe('วิทวัส ตั้งประเสริฐ');
    expect(result.inspectedAt).toBe('2026-03-07T19:17:36');
    expect(result.status).toBe('normal_use');
  });

  it('should return nulls for empty inspections array', () => {
    const result = extractLatestImages([]);
    expect(result.equipImageUrl).toBeNull();
    expect(result.overallImageUrl).toBeNull();
    expect(result.inspectedBy).toBeNull();
  });

  it('should return nulls for non-array input', () => {
    expect(extractLatestImages(null).equipImageUrl).toBeNull();
    expect(extractLatestImages(undefined).equipImageUrl).toBeNull();
    expect(extractLatestImages('string').equipImageUrl).toBeNull();
  });

  it('should handle missing image URLs', () => {
    const result = extractLatestImages([{ status: 'normal_use' }]);
    expect(result.equipImageUrl).toBeNull();
    expect(result.overallImageUrl).toBeNull();
    expect(result.status).toBe('normal_use');
  });

  it('should handle empty string image URLs as null', () => {
    const result = extractLatestImages([{ equip_image_url: '', overall_image_url: '' }]);
    expect(result.equipImageUrl).toBeNull();
    expect(result.overallImageUrl).toBeNull();
  });

  it('should use first inspection as latest', () => {
    const inspections = [
      { equip_image_url: 'http://latest.jpg', created_at: '2026-03-08' },
      { equip_image_url: 'http://older.jpg', created_at: '2026-03-01' },
    ];
    const result = extractLatestImages(inspections);
    expect(result.equipImageUrl).toBe('http://latest.jpg');
  });
});

describe('validateBatchImageIds', () => {
  it('should accept comma-separated numeric IDs', () => {
    const result = validateBatchImageIds('101,102,103');
    expect(result.valid).toBe(true);
    expect(result.ids).toEqual([101, 102, 103]);
  });

  it('should accept a single ID', () => {
    const result = validateBatchImageIds('42');
    expect(result.valid).toBe(true);
    expect(result.ids).toEqual([42]);
  });

  it('should trim whitespace around IDs', () => {
    const result = validateBatchImageIds(' 1 , 2 , 3 ');
    expect(result.valid).toBe(true);
    expect(result.ids).toEqual([1, 2, 3]);
  });

  it('should reject null/empty param', () => {
    expect(validateBatchImageIds(null).valid).toBe(false);
    expect(validateBatchImageIds('').valid).toBe(false);
    expect(validateBatchImageIds('  ').valid).toBe(false);
  });

  it('should reject non-numeric values', () => {
    const result = validateBatchImageIds('1,abc,3');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('abc');
  });

  it('should reject zero and negative IDs', () => {
    expect(validateBatchImageIds('0').valid).toBe(false);
    expect(validateBatchImageIds('-1').valid).toBe(false);
  });

  it('should reject more than 50 IDs', () => {
    const ids = Array.from({ length: 51 }, (_, i) => i + 1).join(',');
    const result = validateBatchImageIds(ids);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('50');
  });

  it('should accept exactly 50 IDs', () => {
    const ids = Array.from({ length: 50 }, (_, i) => i + 1).join(',');
    const result = validateBatchImageIds(ids);
    expect(result.valid).toBe(true);
    expect(result.ids).toHaveLength(50);
  });
});

describe('fetchBatchImages', () => {
  const mockImages: InspectionImages = {
    equipImageUrl: 'http://example.com/equip.jpg',
    overallImageUrl: 'http://example.com/overall.jpg',
    inspectedBy: 'Test User',
    inspectedAt: '2026-03-08T12:00:00',
    status: 'normal_use',
  };

  it('should fetch images for multiple item IDs', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockImages);
    const result = await fetchBatchImages([101, 102], fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith(101);
    expect(fetcher).toHaveBeenCalledWith(102);
    expect(result['101']).toEqual(mockImages);
    expect(result['102']).toEqual(mockImages);
  });

  it('should handle empty array', async () => {
    const fetcher = vi.fn();
    const result = await fetchBatchImages([], fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should return nulls for failed fetches without breaking others', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(mockImages) // 101 succeeds
      .mockRejectedValueOnce(new Error('Network error')) // 102 fails
      .mockResolvedValueOnce(mockImages); // 103 succeeds

    const result = await fetchBatchImages([101, 102, 103], fetcher, 1);

    expect(result['101']).toEqual(mockImages);
    expect(result['102'].equipImageUrl).toBeNull();
    expect(result['102'].overallImageUrl).toBeNull();
    expect(result['103']).toEqual(mockImages);
  });

  it('should respect concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const fetcher = vi.fn().mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 10));
      concurrent--;
      return mockImages;
    });

    await fetchBatchImages([1, 2, 3, 4, 5, 6], fetcher, 3);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(fetcher).toHaveBeenCalledTimes(6);
  });
});
