/** Compute the fields to update when toggling inspection status */
export function computeInspectToggle(currentInspected: boolean): {
  inspected: boolean;
  inspected_at: Date | null;
  upload_status: string | null;
} {
  const newInspected = !currentInspected;
  return {
    inspected: newInspected,
    inspected_at: newInspected ? new Date() : null,
    upload_status: newInspected ? 'pending' : null,
  };
}

/** Validate and parse a service point ID from string */
export function parseServicePointId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
}
