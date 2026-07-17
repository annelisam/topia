// Shared, client-safe formatting for era dates. Dates are stored normalized
// (YYYY-MM-DD; month precision → 1st, year precision → Jan 1) with a
// per-side precision that drives rendering:
//   day   → "MAR 3, 2026"
//   month → "MAR 2026"   (default when precision is missing)
//   year  → "2026"
// Rows created before the date columns existed fall back to their free-text
// labels.

export type DatePrecision = 'day' | 'month' | 'year';

export function formatEraDate(d: string | null | undefined, precision?: string | null): string | null {
  if (!d) return null;
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  switch (precision) {
    case 'year':
      return String(dt.getFullYear());
    case 'day':
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    default:
      return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  }
}

export function eraDateRange(era: {
  startDate?: string | null; endDate?: string | null;
  startPrecision?: string | null; endPrecision?: string | null;
  startLabel?: string | null; endLabel?: string | null;
}): string | null {
  const start = formatEraDate(era.startDate, era.startPrecision) ?? era.startLabel ?? null;
  const end = formatEraDate(era.endDate, era.endPrecision) ?? era.endLabel ?? null;
  if (start && end && start === end) return start; // same month/year both sides
  const parts = [start, end].filter(Boolean);
  return parts.length ? parts.join(' — ') : null;
}
