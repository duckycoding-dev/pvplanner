import type { Viz } from "../types.ts";
import { computeSystem, type SystemResult } from "../../../src/core/comparison/computeSystem.ts";
import { type SystemConfigB, batteryUsableKwh, faldaPeakKwp } from "./systemConfig.ts";

/**
 * Recompute a system (config B or a baseline clone) entirely in the browser:
 * scales the baseline per-falda PVGIS series to the config's peak power and runs
 * the pure core simulation. No PVGIS re-fetch. Falde are matched by id, so the
 * config's falda order is irrelevant.
 */
export function runSystem(cfg: SystemConfigB, viz: Viz): SystemResult {
  const faldeBase = viz.hourly.falde.map((f) => ({ peakKwp: f.peakKwp, productionKwh: f.productionKwh }));
  const newPeakKwp = viz.hourly.falde.map((bf) => {
    const cf = cfg.falde.find((x) => x.id === bf.id);
    return cf ? faldaPeakKwp(cf) : 0;
  });
  return computeSystem({
    faldeBase,
    newPeakKwp,
    acCapKw: cfg.acCapKw,
    batteryUsableKwh: batteryUsableKwh(cfg),
    roundTrip: cfg.roundTrip,
    coupling: cfg.coupling,
    pMaxKw: viz.meta.batteryPortKw,
    loadKwh: viz.hourly.loadKwh,
    months: viz.hourly.months,
  });
}
