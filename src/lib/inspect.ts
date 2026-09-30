/** Validate and parse a visit_plan ID from a route param */
export function parseSiteId(id: string): number | null {
  return /^\d+$/.test(id) ? Number(id) : null;
}

/** Read `{ inspected: boolean }` from a request body; null when invalid */
export function parseInspectBody(body: unknown): boolean | null {
  if (typeof body !== 'object' || body === null) return null;
  const { inspected } = body as { inspected?: unknown };
  return typeof inspected === 'boolean' ? inspected : null;
}

/** Fields to write when setting inspection status */
export function inspectUpdate(inspected: boolean, now = new Date()) {
  return { inspected, inspected_at: inspected ? now : null };
}

export const INSPECT_LABELS = { done: 'ตรวจแล้ว', pending: 'ยังไม่ตรวจ' } as const;
