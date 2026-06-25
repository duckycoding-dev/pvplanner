import { buildProductionSeries } from "../core/production/buildProductionSeries.ts";
import type { HourlySeries, ProductionResult } from "../core/types.ts";
import type { ResolvedConfig } from "../config/schema.ts";
import { loadFaldaHourly } from "../io/loadFaldaHourly.ts";
import { loadPower } from "../io/loadPower.ts";
import { inverterAcCapKw } from "../products/specAccessors.ts";

export interface ProductionAnalysis {
  result: ProductionResult;
  /** Per-falda hourly series (kept for the hourly CSV export). */
  hourly: HourlySeries[];
}

/** Orchestrator: load falde data + inverter cap, build the production model. */
export async function analyzeProduction(cfg: ResolvedConfig): Promise<ProductionAnalysis> {
  const hourly = await Promise.all(cfg.resolvedFalde.map((f) => loadFaldaHourly(f)));
  const power = await Promise.all(cfg.resolvedFalde.map((f) => loadPower(f)));
  const acCapKw = inverterAcCapKw(cfg.inverter);
  const result = buildProductionSeries({ hourly, power, acCapKw, year: cfg.pvgis.single_year });
  return { result, hourly };
}
