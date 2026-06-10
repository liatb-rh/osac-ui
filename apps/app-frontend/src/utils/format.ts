/**
 * Format an ISO 8601 timestamp for display.
 * Returns '—' for missing or unparseable values.
 */
export function formatIsoDate(iso?: string): string {
  if (!iso?.trim()) return '—'
  const t = Date.parse(iso.trim())
  return Number.isNaN(t) ? iso : new Date(t).toLocaleString()
}
