const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export const MONTH_LABELS = MONTHS_IT;

export function formatDayLabel(tsUtc: number): string {
  const d = new Date(tsUtc);
  return `${d.getUTCDate()} ${MONTHS_IT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function dayIndexToDateInput(tsUtc: number): string {
  const d = new Date(tsUtc);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
