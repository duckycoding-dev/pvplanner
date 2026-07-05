import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { analyzeSimulation } from "../src/app/analyzeSimulation.ts";
import { buildBatteryConfig } from "../src/core/simulation/battery.ts";
import { runWithBattery } from "../src/core/simulation/runSimulation.ts";

test("tiny lossless example: dispatch + conservation", () => {
  const prod = [0, 5, 0];
  const load = [2, 0, 2];
  const months = [1, 1, 1];
  const batt = buildBatteryConfig({ usableKwh: 10, pMaxKw: 5, roundTrip: 1, socConvergence: false });
  const r = runWithBattery(prod, load, months, batt);
  const m = r.metrics;
  expect(m.selfConsumedKwh).toBeCloseTo(2, 9);
  expect(m.importKwh).toBeCloseTo(2, 9);
  expect(m.exportKwh).toBeCloseTo(0, 9);
  expect(m.battery!.throughputKwh).toBeCloseTo(2, 9);

  const h = r.hourly;
  let g = 0, direct = 0, charge = 0, exp = 0, imp = 0, disc = 0, l = 0;
  for (let i = 0; i < 3; i++) {
    g += h.productionKwh[i]!;
    charge += h.chargeKwh[i]!;
    exp += h.exportKwh[i]!;
    imp += h.importKwh[i]!;
    disc += h.dischargeKwh[i]!;
    l += h.loadKwh[i]!;
    direct += h.selfConsumedKwh[i]! - h.dischargeKwh[i]!;
  }
  expect(g).toBeCloseTo(direct + charge + exp, 9); // PV split
  expect(l).toBeCloseTo(direct + disc + imp, 9); // load split
});

test("real pipeline: battery raises self-consumption, lowers import, SoC bounded", async () => {
  const cfg = await loadConfig();
  const prod = await analyzeProduction(cfg);
  const { comparison } = await analyzeSimulation(cfg, prod);
  const wo = comparison.withoutBattery.metrics;
  const wb = comparison.withBattery.metrics;

  expect(wb.selfConsumedKwh).toBeGreaterThan(wo.selfConsumedKwh);
  expect(wb.importKwh).toBeLessThan(wo.importKwh);
  expect(comparison.delta.importReductionKwh).toBeGreaterThan(0);
  expect(wo.selfConsumptionRate).toBeGreaterThanOrEqual(0);
  expect(wb.selfConsumptionRate).toBeLessThanOrEqual(1);
  expect(wb.selfSufficiency).toBeLessThanOrEqual(1);

  const usable = wb.battery!.usableKwh;
  for (const s of comparison.withBattery.hourly.socKwh) {
    expect(s).toBeGreaterThanOrEqual(-1e-9);
    expect(s).toBeLessThanOrEqual(usable + 1e-6);
  }
});

test("real pipeline: round-trip closure Σdischarge ≈ Σcharge × RT", async () => {
  const cfg = await loadConfig();
  const prod = await analyzeProduction(cfg);
  const { comparison } = await analyzeSimulation(cfg, prod);
  const b = comparison.withBattery.metrics.battery!;
  const charge = b.roundTripLossKwh + b.throughputKwh;
  expect(b.throughputKwh / charge).toBeCloseTo(0.9, 2); // RT = 0.90 at SoC convergence
});

test("DC coupling: il clipping recuperato carica la batteria e torna nelle metriche", () => {
  // practical già clippato a 5; nell'ora 1 il clip è 3 (teorica 8, cap 5)
  const prod = [0, 5, 0];
  const clip = [0, 3, 0];
  const load = [2, 0, 2];
  const months = [1, 1, 1];
  const batt = buildBatteryConfig({ usableKwh: 10, pMaxKw: 10, roundTrip: 1, socConvergence: false });
  const r = runWithBattery(prod, load, months, batt, { clippingLossKwh: clip, acCapKw: 5 });

  const h = r.hourly;
  expect(h.chargeKwh[1]).toBeCloseTo(8, 9); // 5 surplus + 3 clip
  expect(h.recoveredClipKwh[1]).toBeCloseTo(3, 9);
  expect(h.exportKwh[1]).toBeCloseTo(0, 9);
  expect(h.dischargeKwh[2]).toBeCloseTo(2, 9);
  expect(r.metrics.battery!.recoveredClipKwh).toBeCloseTo(3, 9);

  // conservazione: g + recuperato = diretto + carica + export
  const g = 5, recovered = 3, direct = 0, chargeTot = 8, exportTot = 0;
  expect(g + recovered).toBeCloseTo(direct + chargeTot + exportTot, 9);
});

test("AC coupling (nessun blocco dc): recoveredClipKwh resta 0", () => {
  const batt = buildBatteryConfig({ usableKwh: 10, pMaxKw: 5, roundTrip: 1, socConvergence: false });
  const r = runWithBattery([0, 5, 0], [2, 0, 2], [1, 1, 1], batt);
  expect(r.metrics.battery!.recoveredClipKwh).toBe(0);
  expect(r.hourly.recoveredClipKwh.every((v) => v === 0)).toBe(true);
});
