import type { HourlySeries } from "../types.ts";

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Bucket key from a UTC date: "MM-DD-HH" (ignores year). */
function bucketKey(month: number, day: number, hour: number): string {
  return `${pad2(month)}-${pad2(day)}-${pad2(hour)}`;
}

/**
 * Collapse a multi-year HourlySeries (N consecutive years from one seriescalc
 * call, spanning [yearFrom, yearTo]) into a typical single year: per
 * (month, day, hour) arithmetic average of P (productionKwh) and T2m.
 *
 * - Feb 29 is dropped everywhere (never contributes to a bucket, never in the axis).
 * - The output axis (timestamps + months) is taken from the FIRST NON-LEAP year
 *   in the range, so it has exactly 8760 rows and no leap day. If every year in
 *   the range were leap (impossible for a real ≥2-year range in ALLOWED_YEARS),
 *   the first year is used and its Feb 29 dropped.
 * - `id`/`azimuth`/`peakKwp` are preserved. `months` is recomputed from the axis
 *   timestamps. `reconstructedCount` is carried through unchanged: it reflects the
 *   count of PVGIS-reconstructed rows in the *source* data (a data-quality signal),
 *   which averaging does not scale away.
 *
 * Single-year request (yearFrom === yearTo): returns the input unchanged (same
 * reference) — there is nothing to average and no leap day to drop.
 *
 * Pure: no fs/Bun/console.
 */
export function typicalYear(series: HourlySeries, yearFrom: number, yearTo: number): HourlySeries {
  if (yearFrom === yearTo) return series;

  // Axis year: first non-leap year in range; fallback to the first year.
  let axisYear = yearFrom;
  for (let y = yearFrom; y <= yearTo; y++) {
    if (!isLeap(y)) {
      axisYear = y;
      break;
    }
  }

  const { timestampsUtc, productionKwh, t2m } = series;

  // Accumulate per-bucket sums/counts (Feb 29 skipped).
  const sumP = new Map<string, number>();
  const sumT = new Map<string, number>();
  const cnt = new Map<string, number>();
  for (let i = 0; i < timestampsUtc.length; i++) {
    const d = new Date(timestampsUtc[i]!);
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    if (month === 2 && day === 29) continue;
    const key = bucketKey(month, day, d.getUTCHours());
    sumP.set(key, (sumP.get(key) ?? 0) + productionKwh[i]!);
    sumT.set(key, (sumT.get(key) ?? 0) + t2m[i]!);
    cnt.set(key, (cnt.get(key) ?? 0) + 1);
  }

  // Emit the axis-year rows in order, filling each with its bucket average.
  const outTs: number[] = [];
  const outMonths: number[] = [];
  const outP: number[] = [];
  const outT: number[] = [];
  for (let i = 0; i < timestampsUtc.length; i++) {
    const d = new Date(timestampsUtc[i]!);
    if (d.getUTCFullYear() !== axisYear) continue;
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    if (month === 2 && day === 29) continue; // only reachable in the all-leap fallback
    const key = bucketKey(month, day, d.getUTCHours());
    const n = cnt.get(key)!;
    outTs.push(timestampsUtc[i]!);
    outMonths.push(month);
    outP.push(sumP.get(key)! / n);
    outT.push(sumT.get(key)! / n);
  }

  return {
    id: series.id,
    azimuth: series.azimuth,
    peakKwp: series.peakKwp,
    timestampsUtc: outTs,
    months: outMonths,
    productionKwh: outP,
    t2m: outT,
    reconstructedCount: series.reconstructedCount,
  };
}
