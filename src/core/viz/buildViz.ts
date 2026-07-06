/**
 * Pure builder for the compact viz object consumed by the dashboard SPA.
 * No fs/Bun/console — usable from both the CLI writer and the browser wizard.
 */

import { MONTHS } from "../units.ts";
import type { AnnualMetrics } from "../types.ts";
import { localHourWeekday } from "../time/localTime.ts";
import type { IncentiveConfig } from "../../config/schema.ts";
import type { ProductionAnalysis } from "../../app/analyzeProduction.ts";
import type { SimulationAnalysis } from "../../app/analyzeSimulation.ts";

function r3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function arr3(xs: ReadonlyArray<number>): number[] {
  return xs.map(r3);
}

function zeros(n: number): number[] {
  return new Array<number>(n).fill(0);
}

interface VizScenarioMetrics {
  selfConsumedKwh: number;
  selfConsumptionRate: number;
  selfSufficiency: number;
  importKwh: number;
  exportKwh: number;
}

function metricsToViz(m: AnnualMetrics): VizScenarioMetrics {
  return {
    selfConsumedKwh: r3(m.selfConsumedKwh),
    selfConsumptionRate: r3(m.selfConsumptionRate),
    selfSufficiency: r3(m.selfSufficiency),
    importKwh: r3(m.importKwh),
    exportKwh: r3(m.exportKwh),
  };
}

const ZERO_METRICS: VizScenarioMetrics = {
  selfConsumedKwh: 0,
  selfConsumptionRate: 0,
  selfSufficiency: 0,
  importKwh: 0,
  exportKwh: 0,
};

/** Everything the viz object needs that today comes from the resolved config. */
export interface VizMetaInput {
  year: number;
  yearLabel: string; // "2023" oppure "media 2019–2023"
  timeZone: string;
  acCapKw: number;
  batteryTotalKwh: number;
  batteryUsablePct: number;
  batteryPortKw: number;
  batteryRoundTrip: number;
  batteryCoupling: "dc" | "ac";
  installationCostEur: number;
  incentive: IncentiveConfig;
  falde: { id: string; azimuth: number; peakKwp: number; panelCount: number; wp: number }[];
  consumptionSource: string; // "none" per dataset senza consumi
  consumptionNote: string;
  multiyearKwh: number; // 0 se non disponibile (dataset wizard senza PVcalc)
}

export interface VizMonthRow {
  month: number;
  prodTheoreticalKwh: number;
  prodPracticalKwh: number;
  clippingKwh: number;
  nb: { selfConsumedKwh: number; importKwh: number; exportKwh: number };
  wb: { selfConsumedKwh: number; importKwh: number; exportKwh: number; dischargeKwh: number };
}

export interface VizObject {
  meta: {
    year: number;
    yearLabel: string;
    timeZone: string;
    hoursInYear: number;
    acCapKw: number;
    batteryUsableKwh: number;
    batteryTotalKwh: number;
    batteryUsablePct: number;
    batteryPortKw: number;
    batteryRoundTrip: number;
    batteryCoupling: "dc" | "ac";
    consumptionAnnualKwh: number;
    installationCostEur: number;
    incentive: IncentiveConfig;
    falde: { id: string; azimuth: number; peakKwp: number; panelCount: number; wp: number }[];
    consumptionSource: string;
    consumptionNote: string;
  };
  annual: {
    production: {
      theoreticalKwh: number;
      practicalKwh: number;
      clippingLossKwh: number;
      clippingPct: number;
      clippedHours: number;
      peakKw: number;
      multiyearKwh: number;
    };
    noBattery: VizScenarioMetrics;
    withBattery: VizScenarioMetrics & {
      battery: { throughputKwh: number; equivalentCycles: number; roundTripLossKwh: number; recoveredClipKwh: number };
    };
    delta: {
      selfConsumedKwh: number;
      selfSufficiencyPoints: number;
      importReductionKwh: number;
      exportReductionKwh: number;
    };
  };
  monthly: VizMonthRow[];
  hourly: {
    timestampsUtc: number[];
    months: number[];
    localHour: number[];
    weekday: number[];
    falde: { id: string; azimuth: number; peakKwp: number; productionKwh: number[] }[];
    productionTheoreticalKwh: number[];
    productionPracticalKwh: number[];
    clippingKwh: number[];
    loadKwh: number[];
    nb: { selfConsumedKwh: number[]; importKwh: number[]; exportKwh: number[] };
    wb: {
      selfConsumedKwh: number[];
      importKwh: number[];
      exportKwh: number[];
      chargeKwh: number[];
      dischargeKwh: number[];
      socKwh: number[];
    };
  };
}

/**
 * Build the compact viz object. `sim === null` means a production-only dataset
 * (no consumption/battery): all consumption/scenario series collapse to zero
 * while production stays real.
 */
export function buildVizObject(
  prod: ProductionAnalysis,
  sim: SimulationAnalysis | null,
  meta: VizMetaInput,
): VizObject {
  const { result } = prod;
  const base = prod.hourly[0];
  if (base === undefined) throw new Error("buildVizObject: no hourly data");
  const a = result.combined.annual;
  const hours = result.combined.hourly.practicalKwh.length;

  const cmp = sim?.comparison ?? null;
  const wo = cmp?.withoutBattery ?? null;
  const wb = cmp?.withBattery ?? null;
  const woh = wo?.hourly ?? null;
  const wbh = wb?.hourly ?? null;

  const monthly: VizMonthRow[] = Array.from({ length: MONTHS }, (_, k) => {
    const cm = result.combined.monthly[k]!;
    const nm = wo?.monthly[k];
    const bm = wb?.monthly[k];
    return {
      month: k + 1,
      prodTheoreticalKwh: r3(cm.theoreticalKwh),
      prodPracticalKwh: r3(cm.practicalKwh),
      clippingKwh: r3(cm.clippingLossKwh),
      nb: {
        selfConsumedKwh: r3(nm?.selfConsumedKwh ?? 0),
        importKwh: r3(nm?.importKwh ?? 0),
        exportKwh: r3(nm?.exportKwh ?? 0),
      },
      wb: {
        selfConsumedKwh: r3(bm?.selfConsumedKwh ?? 0),
        importKwh: r3(bm?.importKwh ?? 0),
        exportKwh: r3(bm?.exportKwh ?? 0),
        dischargeKwh: r3(bm?.dischargeKwh ?? 0),
      },
    };
  });

  return {
    meta: {
      year: meta.year,
      yearLabel: meta.yearLabel,
      timeZone: meta.timeZone,
      hoursInYear: result.hoursInYear,
      acCapKw: meta.acCapKw,
      batteryUsableKwh: wb?.metrics.battery?.usableKwh ?? 0,
      batteryTotalKwh: r3(meta.batteryTotalKwh),
      batteryUsablePct: meta.batteryUsablePct,
      batteryPortKw: meta.batteryPortKw,
      batteryRoundTrip: meta.batteryRoundTrip,
      batteryCoupling: meta.batteryCoupling,
      consumptionAnnualKwh: r3(sim?.consumption.annualKwh ?? 0),
      installationCostEur: meta.installationCostEur,
      incentive: meta.incentive,
      falde: meta.falde.map((f) => ({
        id: f.id,
        azimuth: f.azimuth,
        peakKwp: f.peakKwp,
        panelCount: f.panelCount,
        wp: f.wp,
      })),
      consumptionSource: meta.consumptionSource,
      consumptionNote: meta.consumptionNote,
    },
    annual: {
      production: {
        theoreticalKwh: r3(a.theoreticalKwh),
        practicalKwh: r3(a.practicalKwh),
        clippingLossKwh: r3(a.clippingLossKwh),
        clippingPct: r3(a.clippingPct),
        clippedHours: a.clippedHours,
        peakKw: r3(a.peakKw),
        multiyearKwh: r3(meta.multiyearKwh),
      },
      noBattery: wo ? metricsToViz(wo.metrics) : { ...ZERO_METRICS },
      withBattery: {
        ...(wb ? metricsToViz(wb.metrics) : { ...ZERO_METRICS }),
        battery: {
          throughputKwh: r3(wb?.metrics.battery?.throughputKwh ?? 0),
          equivalentCycles: r3(wb?.metrics.battery?.equivalentCycles ?? 0),
          roundTripLossKwh: r3(wb?.metrics.battery?.roundTripLossKwh ?? 0),
          recoveredClipKwh: r3(wb?.metrics.battery?.recoveredClipKwh ?? 0),
        },
      },
      delta: {
        selfConsumedKwh: r3(cmp?.delta.selfConsumedKwh ?? 0),
        selfSufficiencyPoints: r3(cmp?.delta.selfSufficiencyPoints ?? 0),
        importReductionKwh: r3(cmp?.delta.importReductionKwh ?? 0),
        exportReductionKwh: r3(cmp?.delta.exportReductionKwh ?? 0),
      },
    },
    monthly,
    hourly: {
      timestampsUtc: [...base.timestampsUtc],
      months: [...base.months],
      localHour: base.timestampsUtc.map((t) => localHourWeekday(t, meta.timeZone).hour),
      weekday: base.timestampsUtc.map((t) => localHourWeekday(t, meta.timeZone).weekday),
      falde: prod.hourly.map((f) => ({
        id: f.id,
        azimuth: f.azimuth,
        peakKwp: f.peakKwp,
        productionKwh: arr3(f.productionKwh),
      })),
      productionTheoreticalKwh: arr3(result.combined.hourly.theoreticalKwh),
      productionPracticalKwh: arr3(result.combined.hourly.practicalKwh),
      clippingKwh: arr3(result.combined.hourly.clippingLossKwh),
      loadKwh: woh ? arr3(woh.loadKwh) : zeros(hours),
      nb: {
        selfConsumedKwh: woh ? arr3(woh.selfConsumedKwh) : zeros(hours),
        importKwh: woh ? arr3(woh.importKwh) : zeros(hours),
        exportKwh: woh ? arr3(woh.exportKwh) : zeros(hours),
      },
      wb: {
        selfConsumedKwh: wbh ? arr3(wbh.selfConsumedKwh) : zeros(hours),
        importKwh: wbh ? arr3(wbh.importKwh) : zeros(hours),
        exportKwh: wbh ? arr3(wbh.exportKwh) : zeros(hours),
        chargeKwh: wbh ? arr3(wbh.chargeKwh) : zeros(hours),
        dischargeKwh: wbh ? arr3(wbh.dischargeKwh) : zeros(hours),
        socKwh: wbh ? arr3(wbh.socKwh) : zeros(hours),
      },
    },
  };
}
