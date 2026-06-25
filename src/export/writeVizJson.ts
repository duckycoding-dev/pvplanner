import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fromRoot } from "../paths.ts";
import { MONTHS } from "../core/units.ts";
import type { AnnualMetrics } from "../core/types.ts";
import type { ProductionAnalysis } from "../app/analyzeProduction.ts";
import type { SimulationAnalysis } from "../app/analyzeSimulation.ts";

function r3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function arr3(xs: ReadonlyArray<number>): number[] {
  return xs.map(r3);
}
function metricsToViz(m: AnnualMetrics) {
  return {
    selfConsumedKwh: r3(m.selfConsumedKwh),
    selfConsumptionRate: r3(m.selfConsumptionRate),
    selfSufficiency: r3(m.selfSufficiency),
    importKwh: r3(m.importKwh),
    exportKwh: r3(m.exportKwh),
  };
}

/** Build the compact viz.json consumed by the dashboard SPA and write it to web/viz.json. */
export async function writeVizJson(
  prod: ProductionAnalysis,
  sim: SimulationAnalysis,
  outPath = fromRoot("web", "viz.json"),
): Promise<string> {
  const { result, hourly } = prod;
  const base = hourly[0];
  if (base === undefined) throw new Error("writeVizJson: no hourly data");
  const a = result.combined.annual;
  const cmp = sim.comparison;
  const wo = cmp.withoutBattery;
  const wb = cmp.withBattery;
  const woh = wo.hourly;
  const wbh = wb.hourly;

  const monthly = Array.from({ length: MONTHS }, (_, k) => {
    const cm = result.combined.monthly[k]!;
    const nm = wo.monthly[k]!;
    const bm = wb.monthly[k]!;
    return {
      month: k + 1,
      prodTheoreticalKwh: r3(cm.theoreticalKwh),
      prodPracticalKwh: r3(cm.practicalKwh),
      clippingKwh: r3(cm.clippingLossKwh),
      nb: { selfConsumedKwh: r3(nm.selfConsumedKwh), importKwh: r3(nm.importKwh), exportKwh: r3(nm.exportKwh) },
      wb: {
        selfConsumedKwh: r3(bm.selfConsumedKwh),
        importKwh: r3(bm.importKwh),
        exportKwh: r3(bm.exportKwh),
        dischargeKwh: r3(bm.dischargeKwh),
      },
    };
  });

  const obj = {
    meta: {
      year: result.year,
      hoursInYear: result.hoursInYear,
      acCapKw: result.acCapKw,
      batteryUsableKwh: wb.metrics.battery?.usableKwh ?? 0,
      falde: result.falde.map((f) => ({ id: f.id, azimuth: f.azimuth, peakKwp: f.peakKwp })),
      consumptionSource: sim.consumption.source,
      consumptionNote: sim.consumption.notes[0] ?? "",
    },
    annual: {
      production: {
        theoreticalKwh: r3(a.theoreticalKwh),
        practicalKwh: r3(a.practicalKwh),
        clippingLossKwh: r3(a.clippingLossKwh),
        clippingPct: r3(a.clippingPct),
        clippedHours: a.clippedHours,
        peakKw: r3(a.peakKw),
        multiyearKwh: r3(result.combined.multiyear.annualKwh),
      },
      noBattery: metricsToViz(wo.metrics),
      withBattery: {
        ...metricsToViz(wb.metrics),
        battery: {
          throughputKwh: r3(wb.metrics.battery?.throughputKwh ?? 0),
          equivalentCycles: r3(wb.metrics.battery?.equivalentCycles ?? 0),
          roundTripLossKwh: r3(wb.metrics.battery?.roundTripLossKwh ?? 0),
        },
      },
      delta: {
        selfConsumedKwh: r3(cmp.delta.selfConsumedKwh),
        selfSufficiencyPoints: r3(cmp.delta.selfSufficiencyPoints),
        importReductionKwh: r3(cmp.delta.importReductionKwh),
        exportReductionKwh: r3(cmp.delta.exportReductionKwh),
      },
    },
    monthly,
    hourly: {
      timestampsUtc: [...base.timestampsUtc],
      months: [...base.months],
      productionTheoreticalKwh: arr3(result.combined.hourly.theoreticalKwh),
      productionPracticalKwh: arr3(result.combined.hourly.practicalKwh),
      clippingKwh: arr3(result.combined.hourly.clippingLossKwh),
      loadKwh: arr3(woh.loadKwh),
      nb: {
        selfConsumedKwh: arr3(woh.selfConsumedKwh),
        importKwh: arr3(woh.importKwh),
        exportKwh: arr3(woh.exportKwh),
      },
      wb: {
        selfConsumedKwh: arr3(wbh.selfConsumedKwh),
        importKwh: arr3(wbh.importKwh),
        exportKwh: arr3(wbh.exportKwh),
        chargeKwh: arr3(wbh.chargeKwh),
        dischargeKwh: arr3(wbh.dischargeKwh),
        socKwh: arr3(wbh.socKwh),
      },
    },
  };

  await mkdir(dirname(outPath), { recursive: true });
  await Bun.write(outPath, JSON.stringify(obj));
  return outPath;
}
