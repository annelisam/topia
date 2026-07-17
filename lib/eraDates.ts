// Shared, client-safe formatting for era dates. Real dates (YYYY-MM-DD from
// the pickers) render as "MAR 2026"; rows created before the date columns
// existed fall back to their free-text labels.

function fmt(d: string | null | undefined): string | null {
  if (!d) return null;
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
}

export function eraDateRange(era: {
  startDate?: string | null; endDate?: string | null;
  startLabel?: string | null; endLabel?: string | null;
}): string | null {
  const start = fmt(era.startDate) ?? era.startLabel ?? null;
  const end = fmt(era.endDate) ?? era.endLabel ?? null;
  const parts = [start, end].filter(Boolean);
  return parts.length ? parts.join(' — ') : null;
}
