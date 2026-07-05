import { HOUSE_DEFAULTS, type HouseParams, syntheticHouseLoad } from "../core/consumption/houseLoad.ts";
import { buildBatteryConfig } from "../core/simulation/battery.ts";
import { compareScenarios } from "../core/simulation/metrics.ts";
import { runNoBattery, runWithBattery } from "../core/simulation/runSimulation.ts";
import type { ComparisonResult, ConsumptionSeries } from "../core/types.ts";
import type { HouseConfig, ResolvedConfig } from "../config/schema.ts";

/** Map the config's house block onto HouseParams, filling gaps with defaults. */
function houseParams(h: HouseConfig): HouseParams {
  return {
    heatedAreaM2: h.heated_area_m2 ?? HOUSE_DEFAULTS.heatedAreaM2,
    specificHeatDemandKwhM2y: h.specific_heat_demand_kwh_m2y ?? HOUSE_DEFAULTS.specificHeatDemandKwhM2y,
    heatingBaseTempC: h.heating_base_temp_c ?? HOUSE_DEFAULTS.heatingBaseTempC,
    occupants: h.occupants ?? HOUSE_DEFAULTS.occupants,
    wfhOccupants: h.wfh_occupants ?? HOUSE_DEFAULTS.wfhOccupants,
    heatPumpScop: h.heat_pump_scop ?? HOUSE_DEFAULTS.heatPumpScop,
    copRef: h.heat_pump_cop_ref ?? HOUSE_DEFAULTS.copRef,
    copRefOutdoorC: h.heat_pump_cop_ref_outdoor_c ?? HOUSE_DEFAULTS.copRefOutdoorC,
    flowTempC: h.heat_pump_flow_temp_c ?? HOUSE_DEFAULTS.flowTempC,
    dhwCop: h.dhw_cop ?? HOUSE_DEFAULTS.dhwCop,
    dhwKwhPerPersonY: h.dhw_kwh_per_person_y ?? HOUSE_DEFAULTS.dhwKwhPerPersonY,
    baseLoadAnnualKwh: h.base_load_annual_kwh ?? HOUSE_DEFAULTS.baseLoadAnnualKwh,
    standbyLossPct: h.storage_standby_loss_pct ?? HOUSE_DEFAULTS.standbyLossPct,
    bufferSmoothingHours: h.buffer_smoothing_hours ?? HOUSE_DEFAULTS.bufferSmoothingHours,
  };
}
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
  } else if (cfg.consumption.house !== undefined) {
    consumption = syntheticHouseLoad(ctx, houseParams(cfg.consumption.house));
  } else {
    throw new Error('consumption.source="synthetic" richiede il blocco consumption.house in config.json');
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
