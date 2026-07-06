import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fromRoot } from "../paths.ts";
import { DEFAULT_ROUND_TRIP } from "../core/simulation/battery.ts";
import type { ResolvedConfig } from "../config/schema.ts";
import { batteryUsableKwh, batteryUsablePercent, inverterBatteryPortKw } from "../products/specAccessors.ts";
import type { ProductionAnalysis } from "../app/analyzeProduction.ts";
import type { SimulationAnalysis } from "../app/analyzeSimulation.ts";
import { buildVizObject, type VizMetaInput, type VizObject } from "../core/viz/buildViz.ts";

/** Derive the viz meta (everything the pure builder needs from the resolved config). */
export function buildVizMeta(
  prod: ProductionAnalysis,
  _sim: SimulationAnalysis | null,
  cfg: ResolvedConfig,
): VizMetaInput {
  const { result } = prod;
  const usablePct = batteryUsablePercent(cfg.battery);
  return {
    year: result.year,
    yearLabel: String(result.year),
    timeZone: cfg.timezone,
    acCapKw: result.acCapKw,
    batteryTotalKwh: usablePct > 0 ? batteryUsableKwh(cfg.battery) / (usablePct / 100) : batteryUsableKwh(cfg.battery),
    batteryUsablePct: usablePct,
    batteryPortKw: inverterBatteryPortKw(cfg.inverter),
    batteryRoundTrip: cfg.simulation?.battery_round_trip ?? DEFAULT_ROUND_TRIP,
    batteryCoupling: cfg.simulation?.battery_coupling ?? "dc",
    installationCostEur: cfg.economics?.installation_cost_eur ?? 0,
    incentive: cfg.economics?.incentive ?? { mode: "percent", value: 0, years: 1 },
    falde: cfg.resolvedFalde.map((f) => ({
      id: f.id,
      azimuth: f.azimuth,
      peakKwp: f.peakpower_kw,
      panelCount: f.panel_count,
      wp: cfg.module.peak_power_wp,
    })),
    consumptionSource: _sim?.consumption.source ?? "none",
    consumptionNote: _sim?.consumption.notes[0] ?? "",
    multiyearKwh: result.combined.multiyear.annualKwh,
  };
}

/** Build the compact viz.json consumed by the dashboard SPA and write it to web/viz.json. */
export async function writeVizJson(
  prod: ProductionAnalysis,
  sim: SimulationAnalysis,
  cfg: ResolvedConfig,
  outPath = fromRoot("web", "viz.json"),
): Promise<string> {
  const obj: VizObject = buildVizObject(prod, sim, buildVizMeta(prod, sim, cfg));
  await mkdir(dirname(outPath), { recursive: true });
  await Bun.write(outPath, JSON.stringify(obj));
  return outPath;
}
