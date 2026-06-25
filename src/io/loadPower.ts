import { MONTHS } from "../core/units.ts";
import type { PowerSeries } from "../core/types.ts";
import type { ResolvedFalda } from "../config/schema.ts";
import { readJson } from "./readJson.ts";

interface RawPowerFile {
  inputs?: { meteo_data?: { year_min?: unknown; year_max?: unknown } };
  outputs?: { monthly?: { fixed?: unknown }; totals?: { fixed?: { E_y?: unknown } } };
}

/** Load a falda's power.json (PVcalc multi-year) into a PowerSeries (E_y + 12 × E_m). */
export async function loadPower(falda: ResolvedFalda): Promise<PowerSeries> {
  const path = `${falda.dataDir}/power.json`;
  const file = await readJson<RawPowerFile>(path);

  const monthlyRaw = file.outputs?.monthly?.fixed;
  if (!Array.isArray(monthlyRaw)) throw new Error(`${path}: outputs.monthly.fixed is not an array`);
  const monthlyKwh = new Array<number>(MONTHS).fill(0);
  for (const row of monthlyRaw) {
    const m = (row as { month?: unknown }).month;
    const em = (row as { E_m?: unknown }).E_m;
    if (typeof m === "number" && typeof em === "number" && m >= 1 && m <= MONTHS) {
      monthlyKwh[m - 1] = em;
    }
  }

  const ey = file.outputs?.totals?.fixed?.E_y;
  if (typeof ey !== "number") throw new Error(`${path}: missing numeric outputs.totals.fixed.E_y`);

  const yearMin = Number(file.inputs?.meteo_data?.year_min ?? 0);
  const yearMax = Number(file.inputs?.meteo_data?.year_max ?? 0);

  return { id: falda.id, azimuth: falda.azimuth, annualKwh: ey, monthlyKwh, yearMin, yearMax };
}
