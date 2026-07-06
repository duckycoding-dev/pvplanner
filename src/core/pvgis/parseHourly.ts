import { parsePvgisTimestamp, pvgisMonth } from "../time/pvgisTimestamp.ts";
import { HOURS_LEAP, HOURS_NON_LEAP } from "../units.ts";
import type { HourlySeries } from "../types.ts";

export interface FaldaMeta {
  id: string;
  azimuth: number;
  peakKwp: number;
}

export interface ParseHourlyResult {
  series: HourlySeries;
  negativesClamped: number;
}

interface RawHourlyRow {
  time?: unknown;
  P?: unknown;
  T2m?: unknown;
  Int?: unknown;
}
interface RawHourlyFile {
  outputs?: { hourly?: unknown };
}

function hoursInYear(year: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? HOURS_LEAP : HOURS_NON_LEAP;
}

/**
 * A row count is valid if it equals the total hours of 1..N consecutive years
 * starting at `firstYear`: a single year (8760 or 8784) or a concatenation of
 * consecutive years (e.g. 8760 + 8784). Anything else (e.g. 9000) is rejected.
 */
function isValidRowCount(rowCount: number, firstYear: number): boolean {
  let cumulative = 0;
  let year = firstYear;
  for (let i = 0; i < 500 && cumulative < rowCount; i++) {
    cumulative += hoursInYear(year);
    if (cumulative === rowCount) return true;
    year++;
  }
  return false;
}

/**
 * Parse a PVGIS seriescalc JSON (already in memory) into a normalized HourlySeries.
 * Pure: no fs/console. `sourceLabel` only decorates error messages.
 */
export function parseFaldaHourly(file: unknown, meta: FaldaMeta, sourceLabel: string): ParseHourlyResult {
  const rows = (file as RawHourlyFile | null | undefined)?.outputs?.hourly;
  if (!Array.isArray(rows)) throw new Error(`${sourceLabel}: outputs.hourly is not an array`);
  if (rows.length === 0) throw new Error(`${sourceLabel}: outputs.hourly is empty`);

  const first = rows[0] as RawHourlyRow;
  if (typeof first.time !== "string") throw new Error(`${sourceLabel}: row 0 has non-string "time"`);
  const firstYear = new Date(parsePvgisTimestamp(first.time)).getUTCFullYear();
  if (!isValidRowCount(rows.length, firstYear)) {
    throw new Error(
      `${sourceLabel}: unexpected row count ${rows.length} (expected 1..N consecutive years from ${firstYear})`,
    );
  }

  const timestampsUtc = new Array<number>(rows.length);
  const months = new Array<number>(rows.length);
  const productionKwh = new Array<number>(rows.length);
  const t2m = new Array<number>(rows.length);
  let reconstructedCount = 0;
  let negatives = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as RawHourlyRow;
    if (typeof r.time !== "string") throw new Error(`${sourceLabel}: row ${i} has non-string "time"`);
    if (typeof r.P !== "number" || Number.isNaN(r.P)) throw new Error(`${sourceLabel}: row ${i} has invalid "P"`);
    timestampsUtc[i] = parsePvgisTimestamp(r.time);
    months[i] = pvgisMonth(r.time);
    let kwh = r.P / 1000;
    if (kwh < 0) {
      kwh = 0;
      negatives++;
    }
    productionKwh[i] = kwh;
    t2m[i] = typeof r.T2m === "number" ? r.T2m : 0;
    if (r.Int === 1) reconstructedCount++;
  }

  return {
    series: {
      id: meta.id,
      azimuth: meta.azimuth,
      peakKwp: meta.peakKwp,
      timestampsUtc,
      months,
      productionKwh,
      t2m,
      reconstructedCount,
    },
    negativesClamped: negatives,
  };
}
