/** Compute the toggled upload status and timestamp */
export function computeUploadToggle(currentStatus: string | null): {
  upload_status: string;
  uploaded_at: Date | null;
} {
  if (currentStatus === 'uploaded') {
    return { upload_status: 'pending', uploaded_at: null };
  }
  return { upload_status: 'uploaded', uploaded_at: new Date() };
}

/** Validate toggle-status request body */
export function validateToggleRequest(body: unknown): {
  valid: boolean;
  ids?: number[];
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const { ids } = body as { ids?: unknown };

  if (!Array.isArray(ids) || ids.length === 0) {
    return { valid: false, error: 'ids must be a non-empty array of numbers' };
  }

  if (!ids.every((id) => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
    return { valid: false, error: 'Each id must be a positive integer' };
  }

  return { valid: true, ids };
}

/** Extract the latest inspection images from an item detail response */
export interface InspectionImages {
  equipImageUrl: string | null;
  overallImageUrl: string | null;
  inspectedBy: string | null;
  inspectedAt: string | null;
  status: string | null;
}

/** Validate batch image request — item_ids query param */
export function validateBatchImageIds(param: string | null): {
  valid: boolean;
  ids?: number[];
  error?: string;
} {
  if (!param || !param.trim()) {
    return { valid: false, error: 'item_ids is required' };
  }
  const parts = param.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { valid: false, error: 'item_ids must contain at least one ID' };
  }
  if (parts.length > 50) {
    return { valid: false, error: 'Maximum 50 item IDs per request' };
  }
  const ids: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n <= 0) {
      return { valid: false, error: `Invalid item ID: ${p}` };
    }
    ids.push(n);
  }
  return { valid: true, ids };
}

/** Result type for batch image fetch — maps item ID to its images */
export type BatchImageResult = Record<string, InspectionImages>;

/** Fetch images for multiple items in parallel with concurrency limit */
export async function fetchBatchImages(
  itemIds: number[],
  fetcher: (itemId: number) => Promise<InspectionImages>,
  concurrency = 5,
): Promise<BatchImageResult> {
  const result: BatchImageResult = {};
  const queue = [...itemIds];

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift()!;
      try {
        result[String(id)] = await fetcher(id);
      } catch {
        result[String(id)] = {
          equipImageUrl: null,
          overallImageUrl: null,
          inspectedBy: null,
          inspectedAt: null,
          status: null,
        };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, itemIds.length) }, () => worker());
  await Promise.all(workers);
  return result;
}

export function extractLatestImages(inspections: unknown): InspectionImages {
  const empty: InspectionImages = { equipImageUrl: null, overallImageUrl: null, inspectedBy: null, inspectedAt: null, status: null };
  if (!Array.isArray(inspections) || inspections.length === 0) return empty;

  // Latest inspection is first in array
  const latest = inspections[0] as Record<string, unknown>;
  return {
    equipImageUrl: (typeof latest.equip_image_url === 'string' && latest.equip_image_url) || null,
    overallImageUrl: (typeof latest.overall_image_url === 'string' && latest.overall_image_url) || null,
    inspectedBy: [latest.user_name, latest.user_surname].filter(Boolean).join(' ') || null,
    inspectedAt: (typeof latest.created_at === 'string' && latest.created_at) || null,
    status: (typeof latest.status === 'string' && latest.status) || null,
  };
}
