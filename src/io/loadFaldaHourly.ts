import { parseFaldaHourly } from "../core/pvgis/parseHourly.ts";
import type { HourlySeries } from "../core/types.ts";
import type { ResolvedFalda } from "../config/schema.ts";
import { readJson } from "./readJson.ts";

/** Load + validate a falda's hourly.json into a normalized HourlySeries (P → kWh, UTC). */
export async function loadFaldaHourly(falda: ResolvedFalda): Promise<HourlySeries> {
  const path = `${falda.dataDir}/hourly.json`;
  const file = await readJson(path);
  const { series, negativesClamped } = parseFaldaHourly(
    file,
    { id: falda.id, azimuth: falda.azimuth, peakKwp: falda.peakpower_kw },
    path,
  );
  if (negativesClamped > 0) console.warn(`${path}: clamped ${negativesClamped} negative P value(s) to 0`);
  return series;
}
