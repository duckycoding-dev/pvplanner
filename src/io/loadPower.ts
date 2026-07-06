import { parsePower } from "../core/pvgis/parsePower.ts";
import type { PowerSeries } from "../core/types.ts";
import type { ResolvedFalda } from "../config/schema.ts";
import { readJson } from "./readJson.ts";

/** Load a falda's power.json (PVcalc multi-year) into a PowerSeries (E_y + 12 × E_m). */
export async function loadPower(falda: ResolvedFalda): Promise<PowerSeries> {
  const path = `${falda.dataDir}/power.json`;
  const file = await readJson(path);
  return parsePower(file, { id: falda.id, azimuth: falda.azimuth }, path);
}
