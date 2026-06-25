import { mkdir } from "node:fs/promises";
import { fromRoot } from "../paths.ts";
import { MONTHS } from "../core/units.ts";
import type { ProductionAnalysis } from "../app/analyzeProduction.ts";
import type { SimulationAnalysis } from "../app/analyzeSimulation.ts";
import { toCsv, type CsvCell } from "./toCsv.ts";

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
function pct1(fraction: number): number {
  return Math.round(fraction * 1000) / 10;
}

/** Write comparison.json + summary/monthly/hourly CSVs for the battery comparison. */
export async function writeSimulationOutputs(
  sim: SimulationAnalysis,
  prod: ProductionAnalysis,
  outDir = fromRoot("output"),
): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const { comparison, consumption } = sim;
  const wo = comparison.withoutBattery;
  const wb = comparison.withBattery;
  const written: string[] = [];

  // 1) comparison.json
  const jsonObj = {
    consumption: { source: consumption.source, annualKwh: consumption.annualKwh, notes: consumption.notes },
    battery: wb.metrics.battery,
    withoutBattery: { metrics: wo.metrics, monthly: wo.monthly },
    withBattery: { metrics: wb.metrics, monthly: wb.monthly, convergencePasses: wb.convergencePasses },
    delta: comparison.delta,
    notes: comparison.notes,
  };
  const jsonPath = `${outDir}/comparison.json`;
  await Bun.write(jsonPath, JSON.stringify(jsonObj, null, 2));
  written.push(jsonPath);

  // 2) comparison_summary.csv — metric, no_battery, with_battery
  const w = wo.metrics;
  const b = wb.metrics;
  const summaryRows: CsvCell[][] = [
    ["production_kwh", r2(w.productionKwh), r2(b.productionKwh)],
    ["consumption_kwh", r2(w.consumptionKwh), r2(b.consumptionKwh)],
    ["self_consumed_kwh", r2(w.selfConsumedKwh), r2(b.selfConsumedKwh)],
    ["self_consumption_rate_pct", pct1(w.selfConsumptionRate), pct1(b.selfConsumptionRate)],
    ["self_sufficiency_pct", pct1(w.selfSufficiency), pct1(b.selfSufficiency)],
    ["import_kwh", r2(w.importKwh), r2(b.importKwh)],
    ["export_kwh", r2(w.exportKwh), r2(b.exportKwh)],
    ["battery_throughput_kwh", 0, r2(b.battery?.throughputKwh ?? 0)],
    ["battery_equivalent_cycles", 0, r2(b.battery?.equivalentCycles ?? 0)],
    ["battery_roundtrip_loss_kwh", 0, r2(b.battery?.roundTripLossKwh ?? 0)],
  ];
  const summaryPath = `${outDir}/comparison_summary.csv`;
  await Bun.write(summaryPath, toCsv(["metric", "no_battery", "with_battery"], summaryRows));
  written.push(summaryPath);

  // 3) comparison_monthly.csv
  const monthlyHeaders = [
    "month",
    "nb_self_consumed_kwh",
    "nb_import_kwh",
    "nb_export_kwh",
    "wb_self_consumed_kwh",
    "wb_import_kwh",
    "wb_export_kwh",
    "wb_discharge_kwh",
  ];
  const monthlyRows: CsvCell[][] = [];
  for (let k = 0; k < MONTHS; k++) {
    const nm = wo.monthly[k]!;
    const bm = wb.monthly[k]!;
    monthlyRows.push([
      k + 1,
      r2(nm.selfConsumedKwh),
      r2(nm.importKwh),
      r2(nm.exportKwh),
      r2(bm.selfConsumedKwh),
      r2(bm.importKwh),
      r2(bm.exportKwh),
      r2(bm.dischargeKwh),
    ]);
  }
  const monthlyPath = `${outDir}/comparison_monthly.csv`;
  await Bun.write(monthlyPath, toCsv(monthlyHeaders, monthlyRows));
  written.push(monthlyPath);

  // 4) simulation_hourly.csv
  const ts = prod.hourly[0]?.timestampsUtc ?? [];
  const woh = wo.hourly;
  const wbh = wb.hourly;
  const hourlyHeaders = [
    "timestamp_utc",
    "production_kwh",
    "load_kwh",
    "nb_self_consumed_kwh",
    "nb_import_kwh",
    "nb_export_kwh",
    "wb_self_consumed_kwh",
    "wb_charge_kwh",
    "wb_discharge_kwh",
    "wb_soc_kwh",
    "wb_import_kwh",
    "wb_export_kwh",
  ];
  const hourlyRows: CsvCell[][] = [];
  for (let i = 0; i < ts.length; i++) {
    hourlyRows.push([
      new Date(ts[i]!).toISOString(),
      r2(woh.productionKwh[i] ?? 0),
      r2(woh.loadKwh[i] ?? 0),
      r2(woh.selfConsumedKwh[i] ?? 0),
      r2(woh.importKwh[i] ?? 0),
      r2(woh.exportKwh[i] ?? 0),
      r2(wbh.selfConsumedKwh[i] ?? 0),
      r2(wbh.chargeKwh[i] ?? 0),
      r2(wbh.dischargeKwh[i] ?? 0),
      r2(wbh.socKwh[i] ?? 0),
      r2(wbh.importKwh[i] ?? 0),
      r2(wbh.exportKwh[i] ?? 0),
    ]);
  }
  const hourlyPath = `${outDir}/simulation_hourly.csv`;
  await Bun.write(hourlyPath, toCsv(hourlyHeaders, hourlyRows));
  written.push(hourlyPath);

  return written;
}
