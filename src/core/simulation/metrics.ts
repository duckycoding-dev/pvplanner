import { MONTHS } from "../units.ts";
import type {
  AnnualMetrics,
  BatteryConfig,
  ComparisonResult,
  MonthlyScenario,
  ScenarioHourly,
  ScenarioResult,
} from "../types.ts";

function sum(xs: ReadonlyArray<number>): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

export function annualMetrics(h: ScenarioHourly, batt?: BatteryConfig): AnnualMetrics {
  const productionKwh = sum(h.productionKwh);
  const consumptionKwh = sum(h.loadKwh);
  const selfConsumedKwh = sum(h.selfConsumedKwh);

  const metrics: AnnualMetrics = {
    productionKwh,
    consumptionKwh,
    selfConsumedKwh,
    selfConsumptionRate: productionKwh > 0 ? selfConsumedKwh / productionKwh : 0,
    selfSufficiency: consumptionKwh > 0 ? selfConsumedKwh / consumptionKwh : 0,
    importKwh: sum(h.importKwh),
    exportKwh: sum(h.exportKwh),
  };

  if (batt) {
    const throughputKwh = sum(h.dischargeKwh);
    const chargeKwh = sum(h.chargeKwh);
    metrics.battery = {
      throughputKwh,
      equivalentCycles: batt.usableKwh > 0 ? throughputKwh / batt.usableKwh : 0,
      roundTripLossKwh: chargeKwh - throughputKwh,
      usableKwh: batt.usableKwh,
    };
  }
  return metrics;
}

export function monthlyScenario(h: ScenarioHourly, months: ReadonlyArray<number>): MonthlyScenario[] {
  const sc = new Array<number>(MONTHS).fill(0);
  const im = new Array<number>(MONTHS).fill(0);
  const ex = new Array<number>(MONTHS).fill(0);
  const di = new Array<number>(MONTHS).fill(0);
  for (let i = 0; i < h.loadKwh.length; i++) {
    const m = months[i];
    if (m === undefined || m < 1 || m > MONTHS) continue;
    const k = m - 1;
    sc[k] = (sc[k] ?? 0) + (h.selfConsumedKwh[i] ?? 0);
    im[k] = (im[k] ?? 0) + (h.importKwh[i] ?? 0);
    ex[k] = (ex[k] ?? 0) + (h.exportKwh[i] ?? 0);
    di[k] = (di[k] ?? 0) + (h.dischargeKwh[i] ?? 0);
  }
  return Array.from({ length: MONTHS }, (_, k) => ({
    month: k + 1,
    selfConsumedKwh: sc[k] ?? 0,
    importKwh: im[k] ?? 0,
    exportKwh: ex[k] ?? 0,
    dischargeKwh: di[k] ?? 0,
  }));
}

export function compareScenarios(without: ScenarioResult, withB: ScenarioResult): ComparisonResult {
  const w = without.metrics;
  const b = withB.metrics;
  return {
    withoutBattery: without,
    withBattery: withB,
    delta: {
      selfConsumedKwh: b.selfConsumedKwh - w.selfConsumedKwh,
      selfConsumptionRatePoints: (b.selfConsumptionRate - w.selfConsumptionRate) * 100,
      selfSufficiencyPoints: (b.selfSufficiency - w.selfSufficiency) * 100,
      importReductionKwh: w.importKwh - b.importKwh,
      exportReductionKwh: w.exportKwh - b.exportKwh,
    },
    notes: [
      "La produzione usata è quella PRATICA (dopo clipping).",
      "Risoluzione oraria: l'autoconsumo è una stima per eccesso (i disallineamenti sub-orari non sono catturati).",
      "L'energia che la batteria sposta da export ad autoconsumo = importReductionKwh (≈ throughput).",
    ],
  };
}
