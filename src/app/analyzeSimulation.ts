import { syntheticHeatPumpLoad } from "../core/consumption/syntheticSource.ts";
import { buildBatteryConfig } from "../core/simulation/battery.ts";
import { compareScenarios } from "../core/simulation/metrics.ts";
import { runNoBattery, runWithBattery } from "../core/simulation/runSimulation.ts";
import type { ComparisonResult, ConsumptionSeries } from "../core/types.ts";
import type { ResolvedConfig } from "../config/schema.ts";
import { csvConsumptionSource } from "../io/csvConsumptionSource.ts";
import { batteryUsableKwh, inverterBatteryPortKw } from "../products/specAccessors.ts";
import type { ProductionAnalysis } from "./analyzeProduction.ts";

export interface SimulationAnalysis {
  comparison: ComparisonResult;
  consumption: ConsumptionSeries;
}

/** Orchestrator: build the load series, run no-battery + with-battery, compare. */
export async function analyzeSimulation(
  cfg: ResolvedConfig,
  prod: ProductionAnalysis,
): Promise<SimulationAnalysis> {
  const base = prod.hourly[0];
  if (base === undefined) throw new Error("analyzeSimulation: no hourly data");

  const ctx = {
    timestampsUtc: base.timestampsUtc,
    months: base.months,
    t2m: base.t2m,
    ...(cfg.consumption.annual_kwh_target === undefined
      ? {}
      : { annualKwhTarget: cfg.consumption.annual_kwh_target }),
  };

  let consumption: ConsumptionSeries;
  if (cfg.consumption.source === "csv") {
    if (cfg.consumption.csv === undefined) {
      throw new Error("consumption.source=csv but consumption.csv config is missing");
    }
    consumption = await csvConsumptionSource(cfg.consumption.csv, ctx);
  } else {
    consumption = syntheticHeatPumpLoad(ctx);
  }

  const production = prod.result.combined.hourly.practicalKwh;
  const months = base.months;
  const batt = buildBatteryConfig({
    usableKwh: batteryUsableKwh(cfg.battery),
    pMaxKw: inverterBatteryPortKw(cfg.inverter),
  });

  const without = runNoBattery(production, consumption.loadKwh, months);
  const withB = runWithBattery(production, consumption.loadKwh, months, batt);
  return { comparison: compareScenarios(without, withB), consumption };
}
