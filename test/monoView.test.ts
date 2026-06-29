import { expect, test } from "bun:test";
import { deriveMonoViz } from "../web/src/lib/monoView.ts";
import { cloneFromBaseline } from "../web/src/lib/systemConfig.ts";
import type { Viz } from "../web/src/types.ts";

const viz = (await Bun.file("web/viz.json").json()) as Viz;

test("deriveMonoViz reproduces the baked scenarios when A = baseline", () => {
  const { vizA, hasBattery } = deriveMonoViz(viz, cloneFromBaseline(viz, "Sistema A"));
  expect(hasBattery).toBe(true);

  // production
  expect(vizA.annual.production.practicalKwh).toBeCloseTo(viz.annual.production.practicalKwh, 0);
  expect(vizA.annual.production.theoreticalKwh).toBeCloseTo(viz.annual.production.theoreticalKwh, 0);
  expect(vizA.annual.production.clippingLossKwh).toBeCloseTo(viz.annual.production.clippingLossKwh, 0);
  expect(vizA.annual.production.clippedHours).toBe(viz.annual.production.clippedHours);
  expect(vizA.annual.production.multiyearKwh).toBeCloseTo(viz.annual.production.multiyearKwh, 0);

  // no-battery scenario
  expect(vizA.annual.noBattery.importKwh).toBeCloseTo(viz.annual.noBattery.importKwh, 0);
  expect(vizA.annual.noBattery.exportKwh).toBeCloseTo(viz.annual.noBattery.exportKwh, 0);
  expect(vizA.annual.noBattery.selfConsumedKwh).toBeCloseTo(viz.annual.noBattery.selfConsumedKwh, 0);

  // with-battery scenario
  expect(vizA.annual.withBattery.importKwh).toBeCloseTo(viz.annual.withBattery.importKwh, 0);
  expect(vizA.annual.withBattery.exportKwh).toBeCloseTo(viz.annual.withBattery.exportKwh, 0);
  expect(vizA.annual.withBattery.battery.equivalentCycles).toBeCloseTo(viz.annual.withBattery.battery.equivalentCycles, 0);
  expect(vizA.annual.withBattery.battery.roundTripLossKwh).toBeCloseTo(viz.annual.withBattery.battery.roundTripLossKwh, 0);

  // shapes
  expect(vizA.monthly.length).toBe(12);
  expect(vizA.monthly[0]!.prodPracticalKwh).toBeCloseTo(viz.monthly[0]!.prodPracticalKwh, 0);
  expect(vizA.monthly[0]!.wb.importKwh).toBeCloseTo(viz.monthly[0]!.wb.importKwh, 0);
  expect(vizA.hourly.wb.socKwh.length).toBe(viz.hourly.wb.socKwh.length);
  expect(vizA.hourly.nb.importKwh.length).toBe(viz.hourly.nb.importKwh.length);
});

test("battery = 0 ⇒ hasBattery false and con === senza", () => {
  const a = { ...cloneFromBaseline(viz, "Sistema A"), batteryTotalKwh: 0 };
  const { vizA, hasBattery } = deriveMonoViz(viz, a);
  expect(hasBattery).toBe(false);
  expect(vizA.meta.batteryUsableKwh).toBe(0);
  expect(vizA.annual.withBattery.importKwh).toBeCloseTo(vizA.annual.noBattery.importKwh, 6);
  expect(vizA.annual.withBattery.exportKwh).toBeCloseTo(vizA.annual.noBattery.exportKwh, 6);
  expect(vizA.annual.withBattery.battery.equivalentCycles).toBe(0);
});

test("scaling A's panels scales production and multiyear linearly", () => {
  const base = cloneFromBaseline(viz, "Sistema A");
  const doubled = { ...base, falde: base.falde.map((f) => ({ ...f, panelCount: f.panelCount * 2 })) };
  const { vizA } = deriveMonoViz(viz, doubled);
  expect(vizA.annual.production.theoreticalKwh).toBeCloseTo(viz.annual.production.theoreticalKwh * 2, 0);
  expect(vizA.annual.production.multiyearKwh).toBeCloseTo(viz.annual.production.multiyearKwh * 2, 0);
});
