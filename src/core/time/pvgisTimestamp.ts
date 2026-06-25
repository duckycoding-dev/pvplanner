const PVGIS_TS_RE = /^(\d{4})(\d{2})(\d{2}):(\d{2})(\d{2})$/;

/**
 * Parse a PVGIS hourly timestamp "YYYYMMDD:HHMM" to a UTC epoch (ms).
 * The minute part (always :10 in seriescalc) is intentionally dropped — each
 * row represents one whole UTC clock hour.
 */
export function parsePvgisTimestamp(s: string): number {
  const m = PVGIS_TS_RE.exec(s);
  if (m === null) throw new Error(`Invalid PVGIS timestamp: "${s}"`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  return Date.UTC(year, month - 1, day, hour);
}

/** Month (1..12) directly from a PVGIS timestamp string, without timezone math. */
export function pvgisMonth(s: string): number {
  const m = PVGIS_TS_RE.exec(s);
  if (m === null) throw new Error(`Invalid PVGIS timestamp: "${s}"`);
  return Number(m[2]);
}
