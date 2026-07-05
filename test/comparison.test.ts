import { expect, test } from "bun:test";
import { computeSystem, type FaldaBaseline } from "../src/core/comparison/computeSystem.ts";
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { analyzeSimulation } from "../src/app/analyzeSimulation.ts";
import { DEFAULT_ROUND_TRIP } from "../src/core/simulation/battery.ts";
import { batteryUsableKwh, inverterBatteryPortKw } from "../src/products/specAccessors.ts";

const FOUR_MONTHS = [1, 1, 1, 1];

test("computeSystem scales production linearly with peak power", () => {
  const base: FaldaBaseline[] = [{ peakKwp: 1, productionKwh: [0, 2, 3, 10] }];
  const r = computeSystem({
    faldeBase: base,
    newPeakKwp: [2], // double the peak power
    acCapKw: 100, // well above any value → no clipping
    batteryUsableKwh: 0,
    roundTrip: 0.9,
    pMaxKw: 6,
    loadKwh: [0, 0, 0, 0],
    months: FOUR_MONTHS,
  });
  expect(r.peakKwpTotal).toBe(2);
  expect(r.production.hourly.practicalKwh).toEqual([0, 4, 6, 20]);
  expect(r.production.annual.practicalKwh).toBeCloseTo(30, 9);
  expect(r.production.annual.clippingLossKwh).toBeCloseTo(0, 9);
});

test("computeSystem clips at the new AC cap and conserves energy", () => {
  const base: FaldaBaseline[] = [{ peakKwp: 1, productionKwh: [0, 2, 3, 10] }];
  const r = computeSystem({
    faldeBase: base,
    newPeakKwp: [2], // theoretical → [0, 4, 6, 20]
    acCapKw: 5,
    batteryUsableKwh: 0,
    roundTrip: 0.9,
    pMaxKw: 6,
    loadKwh: [0, 0, 0, 0],
    months: FOUR_MONTHS,
  });
  expect(r.production.hourly.practicalKwh).toEqual([0, 4, 5, 5]);
  expect(r.production.hourly.clippingLossKwh).toEqual([0, 0, 1, 15]);
  // conservation: theoretical = practical + clipping (per hour and total)
  const a = r.production.annual;
  expect(a.theoreticalKwh).toBeCloseTo(a.practicalKwh + a.clippingLossKwh, 9);
  expect(a.clippedHours).toBe(2);
  expect(a.peakKw).toBe(20);
});

test("computeSystem takes the no-battery path when capacity is 0", () => {
  const base: FaldaBaseline[] = [{ peakKwp: 1, productionKwh: [5, 0] }];
  const r = computeSystem({
    faldeBase: base,
    newPeakKwp: [1],
    acCapKw: 100,
    batteryUsableKwh: 0,
    roundTrip: 0.9,
    pMaxKw: 6,
    loadKwh: [0, 5], // surplus hour 0, deficit hour 1 — no battery to shift it
    months: [1, 1],
  });
  expect(r.scenario).toBe("no-battery");
  expect(r.metrics.battery).toBeUndefined();
  expect(r.metrics.exportKwh).toBeCloseTo(5, 9);
  expect(r.metrics.importKwh).toBeCloseTo(5, 9);
});

test("computeSystem with a battery shifts surplus to a later deficit", () => {
  const base: FaldaBaseline[] = [{ peakKwp: 1, productionKwh: [5, 0] }];
  const r = computeSystem({
    faldeBase: base,
    newPeakKwp: [1],
    acCapKw: 100,
    batteryUsableKwh: 10,
    roundTrip: 1, // lossless → easy to reason about
    pMaxKw: 6,
    loadKwh: [0, 5],
    months: [1, 1],
  });
  expect(r.scenario).toBe("with-battery");
  expect(r.metrics.battery).toBeDefined();
  // surplus of 5 charged then discharged to cover the deficit → no import, no export
  expect(r.metrics.importKwh).toBeCloseTo(0, 9);
  expect(r.metrics.exportKwh).toBeCloseTo(0, 9);
  expect(r.metrics.battery!.throughputKwh).toBeCloseTo(5, 9);
});

test("coupling DC vs AC: il DC recupera clipping in batteria", () => {
  const base: FaldaBaseline[] = [{ peakKwp: 1, productionKwh: [0, 10, 0] }];
  const common = {
    faldeBase: base,
    newPeakKwp: [1],
    acCapKw: 5, // teorica [0,10,0] → practical [0,5,0], clip [0,5,0]
    batteryUsableKwh: 20,
    roundTrip: 1,
    pMaxKw: 20,
    loadKwh: [3, 0, 3],
    months: [1, 1, 1],
  };
  const dc = computeSystem({ ...common, coupling: "dc" });
  const ac = computeSystem({ ...common, coupling: "ac" });
  expect(dc.metrics.battery!.recoveredClipKwh).toBeCloseTo(5, 9); // 5 surplus + 5 clip caricati
  expect(ac.metrics.battery!.recoveredClipKwh).toBe(0);
  expect(dc.metrics.battery!.throughputKwh).toBeGreaterThanOrEqual(ac.metrics.battery!.throughputKwh);
});

test("golden: computeSystem reproduces the baseline with-battery metrics", async () => {
  const cfg = await loadConfig();
  const prod = await analyzeProduction(cfg);
  const sim = await analyzeSimulation(cfg, prod);

  const faldeBase: FaldaBaseline[] = prod.hourly.map((f) => ({
    peakKwp: f.peakKwp,
    productionKwh: f.productionKwh,
  }));

  const r = computeSystem({
    faldeBase,
    newPeakKwp: prod.hourly.map((f) => f.peakKwp), // baseline → factor 1.0
    acCapKw: prod.result.acCapKw,
    batteryUsableKwh: batteryUsableKwh(cfg.battery),
    roundTrip: cfg.simulation?.battery_round_trip ?? DEFAULT_ROUND_TRIP,
    coupling: cfg.simulation?.battery_coupling ?? "dc",
    pMaxKw: inverterBatteryPortKw(cfg.inverter),
    loadKwh: sim.consumption.loadKwh,
    months: prod.hourly[0]!.months,
  });

  const ref = sim.comparison.withBattery.metrics;
  expect(r.production.annual.practicalKwh).toBeCloseTo(prod.result.combined.annual.practicalKwh, 6);
  expect(r.production.annual.clippingLossKwh).toBeCloseTo(prod.result.combined.annual.clippingLossKwh, 6);
  expect(r.metrics.selfConsumedKwh).toBeCloseTo(ref.selfConsumedKwh, 6);
  expect(r.metrics.importKwh).toBeCloseTo(ref.importKwh, 6);
  expect(r.metrics.exportKwh).toBeCloseTo(ref.exportKwh, 6);
  expect(r.metrics.battery!.equivalentCycles).toBeCloseTo(ref.battery!.equivalentCycles, 6);
});
