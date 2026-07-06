import { MONTHS } from "../units.ts";
import type { PowerSeries } from "../types.ts";

interface RawPowerFile {
  inputs?: { meteo_data?: { year_min?: unknown; year_max?: unknown } };
  outputs?: { monthly?: { fixed?: unknown }; totals?: { fixed?: { E_y?: unknown } } };
}

/**
 * Parse a PVGIS PVcalc power.json (already in memory) into a PowerSeries
 * (E_y + 12 × E_m). Pure: no fs/console. `sourceLabel` only decorates errors.
 */
export function parsePower(file: unknown, meta: { id: string; azimuth: number }, sourceLabel: string): PowerSeries {
  const f = file as RawPowerFile | null | undefined;

  const monthlyRaw = f?.outputs?.monthly?.fixed;
  if (!Array.isArray(monthlyRaw)) throw new Error(`${sourceLabel}: outputs.monthly.fixed is not an array`);
  const monthlyKwh = new Array<number>(MONTHS).fill(0);
  for (const row of monthlyRaw) {
    const m = (row as { month?: unknown }).month;
    const em = (row as { E_m?: unknown }).E_m;
    if (typeof m === "number" && typeof em === "number" && m >= 1 && m <= MONTHS) {
      monthlyKwh[m - 1] = em;
    }
  }

  const ey = f?.outputs?.totals?.fixed?.E_y;
  if (typeof ey !== "number") throw new Error(`${sourceLabel}: missing numeric outputs.totals.fixed.E_y`);

  const yearMin = Number(f?.inputs?.meteo_data?.year_min ?? 0);
  const yearMax = Number(f?.inputs?.meteo_data?.year_max ?? 0);

  return { id: meta.id, azimuth: meta.azimuth, annualKwh: ey, monthlyKwh, yearMin, yearMax };
}
