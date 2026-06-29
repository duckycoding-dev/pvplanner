import type { ScenarioMetrics, Viz } from "../types.ts";
import type { AnnualMetrics } from "../../../src/core/types.ts";
import { batteryUsableKwh, faldaPeakKwp, type SystemConfigB, totalPeakKwp } from "./systemConfig.ts";
import { runSystem } from "./runSystem.ts";

export interface MonoView {
  /** A Viz-shaped object reflecting System A, with nb/wb = A without/with its battery. */
  vizA: Viz;
  /** True when System A has a usable battery; false ⇒ views show only the "senza" scenario. */
  hasBattery: boolean;
}

function toScenarioMetrics(m: AnnualMetrics): ScenarioMetrics {
  return {
    selfConsumedKwh: m.selfConsumedKwh,
    selfConsumptionRate: m.selfConsumptionRate,
    selfSufficiency: m.selfSufficiency,
    importKwh: m.importKwh,
    exportKwh: m.exportKwh,
  };
}

/**
 * Recompute the mono-system views' data live from System A (instead of reading the
 * precomputed scenarios baked into viz.json). "senza" = A without battery, "con" = A
 * with its battery. The result keeps the exact shape the views already consume, so the
 * components change minimally. Pure: delegates to runSystem/computeSystem.
 */
export function deriveMonoViz(viz: Viz, systemA: SystemConfigB): MonoView {
  const usable = batteryUsableKwh(systemA);
  const hasBattery = usable > 0;
  const resSenza = runSystem({ ...systemA, batteryTotalKwh: 0 }, viz);
  const resCon = hasBattery ? runSystem(systemA, viz) : resSenza;

  const prod = resCon.production;
  const nb = resSenza.metrics;
  const wb = resCon.metrics;
  const bat = wb.battery ?? { throughputKwh: 0, equivalentCycles: 0, roundTripLossKwh: 0 };

  const baseKwp = viz.meta.falde.reduce((s, f) => s + f.peakKwp, 0);
  const aKwp = totalPeakKwp(systemA);
  const multiyearKwh = baseKwp > 0 ? viz.annual.production.multiyearKwh * (aKwp / baseKwp) : 0;

  const vizA: Viz = {
    meta: {
      ...viz.meta,
      acCapKw: systemA.acCapKw,
      batteryUsableKwh: usable,
      batteryTotalKwh: systemA.batteryTotalKwh,
      batteryUsablePct: systemA.batteryUsablePct,
      batteryRoundTrip: systemA.roundTrip,
      installationCostEur: systemA.installationCostEur,
      falde: systemA.falde.map((f) => ({
        id: f.id,
        azimuth: f.azimuth,
        peakKwp: faldaPeakKwp(f),
        panelCount: f.panelCount,
        wp: f.wp,
      })),
    },
    annual: {
      production: {
        theoreticalKwh: prod.annual.theoreticalKwh,
        practicalKwh: prod.annual.practicalKwh,
        clippingLossKwh: prod.annual.clippingLossKwh,
        clippingPct: prod.annual.clippingPct,
        clippedHours: prod.annual.clippedHours,
        peakKw: prod.annual.peakKw,
        multiyearKwh,
      },
      noBattery: toScenarioMetrics(nb),
      withBattery: {
        ...toScenarioMetrics(wb),
        battery: {
          throughputKwh: bat.throughputKwh,
          equivalentCycles: bat.equivalentCycles,
          roundTripLossKwh: bat.roundTripLossKwh,
        },
      },
      delta: {
        selfConsumedKwh: wb.selfConsumedKwh - nb.selfConsumedKwh,
        selfSufficiencyPoints: (wb.selfSufficiency - nb.selfSufficiency) * 100,
        importReductionKwh: nb.importKwh - wb.importKwh,
        exportReductionKwh: nb.exportKwh - wb.exportKwh,
      },
    },
    monthly: prod.monthly.map((pm, k) => {
      const mn = resSenza.monthly[k];
      const mw = resCon.monthly[k];
      return {
        month: pm.month,
        prodTheoreticalKwh: pm.theoreticalKwh,
        prodPracticalKwh: pm.practicalKwh,
        clippingKwh: pm.clippingLossKwh,
        nb: {
          selfConsumedKwh: mn?.selfConsumedKwh ?? 0,
          importKwh: mn?.importKwh ?? 0,
          exportKwh: mn?.exportKwh ?? 0,
        },
        wb: {
          selfConsumedKwh: mw?.selfConsumedKwh ?? 0,
          importKwh: mw?.importKwh ?? 0,
          exportKwh: mw?.exportKwh ?? 0,
          dischargeKwh: mw?.dischargeKwh ?? 0,
        },
      };
    }),
    hourly: {
      ...viz.hourly,
      productionTheoreticalKwh: prod.hourly.theoreticalKwh,
      productionPracticalKwh: prod.hourly.practicalKwh,
      clippingKwh: prod.hourly.clippingLossKwh,
      nb: {
        selfConsumedKwh: resSenza.hourly.selfConsumedKwh,
        importKwh: resSenza.hourly.importKwh,
        exportKwh: resSenza.hourly.exportKwh,
      },
      wb: {
        selfConsumedKwh: resCon.hourly.selfConsumedKwh,
        importKwh: resCon.hourly.importKwh,
        exportKwh: resCon.hourly.exportKwh,
        chargeKwh: resCon.hourly.chargeKwh,
        dischargeKwh: resCon.hourly.dischargeKwh,
        socKwh: resCon.hourly.socKwh,
      },
    },
  };

  return { vizA, hasBattery };
}
