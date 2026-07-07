import { expect, test } from "bun:test";
import { deriveMonoViz } from "../web/src/lib/monoView.ts";
import { cloneFromBaseline } from "../web/src/lib/systemConfig.ts";
import { hasConsumption } from "../web/src/lib/vizFlags.ts";
import type { Viz } from "../web/src/types.ts";

// web/viz.json (personale, gitignored) se esiste, altrimenti il demo tracciato:
// questi test sono di auto-consistenza, valgono su qualunque baseline.
const vizFile = Bun.file("web/viz.json");
const viz = (await ((await vizFile.exists()) ? vizFile : Bun.file("web/viz.demo.json")).json()) as Viz;

/** A copy of the baseline viz with no consumption: source "none" and all loads zeroed. */
function noConsumptionViz(): Viz {
  const clone = structuredClone(viz);
  clone.meta.consumptionSource = "none";
  clone.meta.consumptionAnnualKwh = 0;
  clone.hourly.loadKwh = clone.hourly.loadKwh.map(() => 0);
  return clone;
}

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

test("no-consumption viz: deriveMonoViz has no NaN, zero self/import metrics, real production", () => {
  const noCons = noConsumptionViz();
  const { vizA } = deriveMonoViz(noCons, cloneFromBaseline(noCons, "Sistema A"));

  // Production is unaffected by consumption and must stay real (non-zero, no NaN).
  expect(Number.isFinite(vizA.annual.production.practicalKwh)).toBe(true);
  expect(vizA.annual.production.practicalKwh).toBeGreaterThan(0);
  expect(vizA.annual.production.theoreticalKwh).toBeCloseTo(viz.annual.production.theoreticalKwh, 0);

  const nb = vizA.annual.noBattery;
  const wb = vizA.annual.withBattery;
  // No load ⇒ nothing self-consumed or imported; all production is exported.
  expect(nb.selfConsumedKwh).toBe(0);
  expect(nb.importKwh).toBe(0);
  expect(wb.selfConsumedKwh).toBe(0);
  expect(wb.importKwh).toBe(0);
  // selfSufficiency is 0 (not NaN) when consumption is 0 — guarded by ternario in annualMetrics.
  expect(nb.selfSufficiency).toBe(0);
  expect(wb.selfSufficiency).toBe(0);
  expect(Number.isNaN(nb.selfConsumptionRate)).toBe(false);
  expect(Number.isNaN(wb.selfConsumptionRate)).toBe(false);

  // No NaN anywhere in the derived numeric fields we surface.
  for (const v of [nb.exportKwh, wb.exportKwh, vizA.annual.delta.selfConsumedKwh, vizA.annual.delta.selfSufficiencyPoints]) {
    expect(Number.isNaN(v)).toBe(false);
  }
});

test("hasConsumption: none → false, valid source with kWh>0 → true, valid source with kWh=0 → false", () => {
  const none = noConsumptionViz();
  expect(hasConsumption(none)).toBe(false);

  const valid = structuredClone(viz);
  valid.meta.consumptionSource = "synthetic-house";
  valid.meta.consumptionAnnualKwh = 8354.711;
  expect(hasConsumption(valid)).toBe(true);

  const zeroKwh = structuredClone(viz);
  zeroKwh.meta.consumptionSource = "synthetic-house";
  zeroKwh.meta.consumptionAnnualKwh = 0;
  expect(hasConsumption(zeroKwh)).toBe(false);
});
