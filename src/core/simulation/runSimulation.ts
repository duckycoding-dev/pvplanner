import type { BatteryConfig, ScenarioHourly, ScenarioResult } from "../types.ts";
import { dispatchHour } from "./batteryDispatch.ts";
import { hourBalance } from "./energyBalance.ts";
import { annualMetrics, monthlyScenario } from "./metrics.ts";

const MAX_SOC_PASSES = 6;
const SOC_TOLERANCE = 1e-3;

function emptyHourly(n: number): ScenarioHourly {
  return {
    productionKwh: new Array<number>(n).fill(0),
    loadKwh: new Array<number>(n).fill(0),
    selfConsumedKwh: new Array<number>(n).fill(0),
    importKwh: new Array<number>(n).fill(0),
    exportKwh: new Array<number>(n).fill(0),
    chargeKwh: new Array<number>(n).fill(0),
    dischargeKwh: new Array<number>(n).fill(0),
    socKwh: new Array<number>(n).fill(0),
  };
}

/** No-battery scenario: direct self-consumption, surplus exported, deficit imported. */
export function runNoBattery(
  production: ReadonlyArray<number>,
  load: ReadonlyArray<number>,
  months: ReadonlyArray<number>,
): ScenarioResult {
  const n = production.length;
  const h = emptyHourly(n);
  for (let i = 0; i < n; i++) {
    const g = production[i] ?? 0;
    const l = load[i] ?? 0;
    const b = hourBalance(g, l);
    h.productionKwh[i] = g;
    h.loadKwh[i] = l;
    h.selfConsumedKwh[i] = b.selfConsumed;
    h.exportKwh[i] = b.surplus;
    h.importKwh[i] = b.deficit;
  }
  return { scenario: "no-battery", metrics: annualMetrics(h), monthly: monthlyScenario(h, months), hourly: h };
}

function simulatePass(
  production: ReadonlyArray<number>,
  load: ReadonlyArray<number>,
  batt: BatteryConfig,
  startSoc: number,
): { hourly: ScenarioHourly; endSoc: number } {
  const n = production.length;
  const h = emptyHourly(n);
  let soc = startSoc;
  for (let i = 0; i < n; i++) {
    const g = production[i] ?? 0;
    const l = load[i] ?? 0;
    const bal = hourBalance(g, l);
    const d = dispatchHour(bal.surplus, bal.deficit, soc, batt);
    soc = d.newSoc;
    h.productionKwh[i] = g;
    h.loadKwh[i] = l;
    h.selfConsumedKwh[i] = bal.selfConsumed + d.battToLoad;
    h.exportKwh[i] = d.exportKwh;
    h.importKwh[i] = d.importKwh;
    h.chargeKwh[i] = d.charge;
    h.dischargeKwh[i] = d.discharge;
    h.socKwh[i] = soc;
  }
  return { hourly: h, endSoc: soc };
}

/** With-battery scenario: greedy self-consumption; SoC iterated to a stable year-loop. */
export function runWithBattery(
  production: ReadonlyArray<number>,
  load: ReadonlyArray<number>,
  months: ReadonlyArray<number>,
  batt: BatteryConfig,
): ScenarioResult {
  let start = batt.usableKwh * batt.initialSoCFraction;
  let last = simulatePass(production, load, batt, start);
  let passes = 1;
  if (batt.socConvergence) {
    while (passes < MAX_SOC_PASSES && Math.abs(last.endSoc - start) >= SOC_TOLERANCE) {
      start = last.endSoc;
      last = simulatePass(production, load, batt, start);
      passes++;
    }
  }
  return {
    scenario: "with-battery",
    metrics: annualMetrics(last.hourly, batt),
    monthly: monthlyScenario(last.hourly, months),
    hourly: last.hourly,
    convergencePasses: passes,
  };
}
