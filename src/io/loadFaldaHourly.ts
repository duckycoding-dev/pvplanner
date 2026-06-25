import { parsePvgisTimestamp, pvgisMonth } from "../core/time/pvgisTimestamp.ts";
import { HOURS_LEAP, HOURS_NON_LEAP } from "../core/units.ts";
import type { HourlySeries } from "../core/types.ts";
import type { ResolvedFalda } from "../config/schema.ts";
import { readJson } from "./readJson.ts";

interface RawHourlyRow {
  time?: unknown;
  P?: unknown;
  Int?: unknown;
}
interface RawHourlyFile {
  outputs?: { hourly?: unknown };
}

/** Load + validate a falda's hourly.json into a normalized HourlySeries (P → kWh, UTC). */
export async function loadFaldaHourly(falda: ResolvedFalda): Promise<HourlySeries> {
  const path = `${falda.dataDir}/hourly.json`;
  const file = await readJson<RawHourlyFile>(path);
  const rows = file.outputs?.hourly;
  if (!Array.isArray(rows)) throw new Error(`${path}: outputs.hourly is not an array`);
  if (rows.length !== HOURS_NON_LEAP && rows.length !== HOURS_LEAP) {
    throw new Error(`${path}: unexpected row count ${rows.length} (expected ${HOURS_NON_LEAP} or ${HOURS_LEAP})`);
  }

  const timestampsUtc = new Array<number>(rows.length);
  const months = new Array<number>(rows.length);
  const productionKwh = new Array<number>(rows.length);
  let reconstructedCount = 0;
  let negatives = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as RawHourlyRow;
    if (typeof r.time !== "string") throw new Error(`${path}: row ${i} has non-string "time"`);
    if (typeof r.P !== "number" || Number.isNaN(r.P)) throw new Error(`${path}: row ${i} has invalid "P"`);
    timestampsUtc[i] = parsePvgisTimestamp(r.time);
    months[i] = pvgisMonth(r.time);
    let kwh = r.P / 1000;
    if (kwh < 0) {
      kwh = 0;
      negatives++;
    }
    productionKwh[i] = kwh;
    if (r.Int === 1) reconstructedCount++;
  }

  if (negatives > 0) console.warn(`${path}: clamped ${negatives} negative P value(s) to 0`);

  return {
    id: falda.id,
    azimuth: falda.azimuth,
    peakKwp: falda.peakpower_kw,
    timestampsUtc,
    months,
    productionKwh,
    reconstructedCount,
  };
}
