import { MONTHS } from "../units.ts";
import type { AnnualMetrics, MonthlyCombined, MonthlyScenario, ScenarioHourly } from "../types.ts";
import { combineProduction } from "../production/combine.ts";
import { applyAcCap } from "../production/clipping.ts";
import { buildBatteryConfig } from "../simulation/battery.ts";
import { runNoBattery, runWithBattery } from "../simulation/runSimulation.ts";

const CLIP_EPS = 1e-9;

/** One falda's baseline hourly production + its peak power (from viz.hourly.falde). */
export interface FaldaBaseline {
  peakKwp: number;
  productionKwh: readonly number[];
}

export interface ComputeSystemInput {
  /** Baseline per-falda series (the PVGIS hourly, at the baseline peak power). */
  faldeBase: FaldaBaseline[];
  /** Target kWp per falda, aligned with `faldeBase` (PVGIS P is exactly linear in peakpower). */
  newPeakKwp: number[];
  /** Inverter AC ceiling (kW) for clipping. */
  acCapKw: number;
  /** Battery usable capacity (kWh); 0 = no battery. */
  batteryUsableKwh: number;
  /** AC-to-AC round-trip efficiency (0..1). */
  roundTrip: number;
  /** Battery charge/discharge power cap (kW). */
  pMaxKw: number;
  /** Shared household load (kWh per hour). */
  loadKwh: readonly number[];
  /** Per-row month 1..12, aligned with the hourly axis. */
  months: readonly number[];
}

export interface CombinedStats {
  annual: {
    theoreticalKwh: number;
    practicalKwh: number;
    clippingLossKwh: number;
    clippingPct: number;
    clippedHours: number;
    peakKw: number;
  };
  monthly: MonthlyCombined[];
  hourly: { theoreticalKwh: number[]; practicalKwh: number[]; clippingLossKwh: number[] };
}

export interface SystemResult {
  peakKwpTotal: number;
  production: CombinedStats;
  scenario: "no-battery" | "with-battery";
  metrics: AnnualMetrics;
  monthly: MonthlyScenario[];
  hourly: ScenarioHourly;
}

function sum(xs: ReadonlyArray<number>): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

function monthlyTotals(values: ReadonlyArray<number>, months: ReadonlyArray<number>): number[] {
  const out = new Array<number>(MONTHS).fill(0);
  for (let i = 0; i < values.length; i++) {
    const m = months[i];
    if (m === undefined || m < 1 || m > MONTHS) continue;
    out[m - 1] = (out[m - 1] ?? 0) + (values[i] ?? 0);
  }
  return out;
}

/** Combine scaled falde into one series and apply the inverter AC cap → production stats. */
function combineAndClip(
  seriesList: ReadonlyArray<ReadonlyArray<number>>,
  acCapKw: number,
  months: ReadonlyArray<number>,
): CombinedStats {
  const theoreticalKwh = combineProduction(seriesList);
  const { practicalKwh, clippingLossKwh } = applyAcCap(theoreticalKwh, acCapKw);

  const theoreticalTotal = sum(theoreticalKwh);
  const practicalTotal = sum(practicalKwh);
  const clippingTotal = sum(clippingLossKwh);
  let clippedHours = 0;
  let peakKw = 0;
  for (let i = 0; i < theoreticalKwh.length; i++) {
    const t = theoreticalKwh[i] ?? 0;
    if (t > peakKw) peakKw = t;
    if ((clippingLossKwh[i] ?? 0) > CLIP_EPS) clippedHours++;
  }

  const monTheo = monthlyTotals(theoreticalKwh, months);
  const monPrac = monthlyTotals(practicalKwh, months);
  const monClip = monthlyTotals(clippingLossKwh, months);
  const monthly: MonthlyCombined[] = Array.from({ length: MONTHS }, (_, k) => ({
    month: k + 1,
    theoreticalKwh: monTheo[k] ?? 0,
    practicalKwh: monPrac[k] ?? 0,
    clippingLossKwh: monClip[k] ?? 0,
  }));

  return {
    annual: {
      theoreticalKwh: theoreticalTotal,
      practicalKwh: practicalTotal,
      clippingLossKwh: clippingTotal,
      clippingPct: theoreticalTotal > 0 ? (clippingTotal / theoreticalTotal) * 100 : 0,
      clippedHours,
      peakKw,
    },
    monthly,
    hourly: { theoreticalKwh, practicalKwh, clippingLossKwh },
  };
}

/**
 * Compute a full system result (production + battery simulation) from baseline
 * per-falda series, scaling each falda to its new peak power. Pure: no fs/network,
 * so the browser can recompute alternative systems live without re-fetching PVGIS.
 */
export function computeSystem(input: ComputeSystemInput): SystemResult {
  const { faldeBase, newPeakKwp, acCapKw, batteryUsableKwh, roundTrip, pMaxKw, loadKwh, months } = input;
  if (faldeBase.length !== newPeakKwp.length) {
    throw new Error(`computeSystem: ${faldeBase.length} baseline falde but ${newPeakKwp.length} new peak values`);
  }

  const scaled = faldeBase.map((f, i) => {
    const factor = f.peakKwp > 0 ? (newPeakKwp[i] ?? 0) / f.peakKwp : 0;
    return f.productionKwh.map((p) => p * factor);
  });

  const production = combineAndClip(scaled, acCapKw, months);
  const practical = production.hourly.practicalKwh;

  const res =
    batteryUsableKwh > 0
      ? runWithBattery(practical, loadKwh, months, buildBatteryConfig({ usableKwh: batteryUsableKwh, pMaxKw, roundTrip }))
      : runNoBattery(practical, loadKwh, months);

  return {
    peakKwpTotal: newPeakKwp.reduce((s, x) => s + x, 0),
    production,
    scenario: res.scenario,
    metrics: res.metrics,
    monthly: res.monthly,
    hourly: res.hourly,
  };
}
