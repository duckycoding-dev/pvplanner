import { expect, test } from "bun:test";
import { applyConsumption } from "../web/src/lib/applyConsumption.ts";
import { deriveMonoViz } from "../web/src/lib/monoView.ts";
import { cloneFromBaseline } from "../web/src/lib/systemConfig.ts";
import type { CanonicalConsumption } from "../src/core/consumption/canonical.ts";
import type { ConsumptionSpec, StoredSetup } from "../web/src/lib/setupTypes.ts";
import type { Viz } from "../web/src/types.ts";

const baseViz = (await Bun.file("web/viz.json").json()) as Viz;

function makeSetup(): StoredSetup {
  const viz = structuredClone(baseViz);
  return {
    version: 1,
    savedAt: 111,
    inputs: { timeZone: viz.meta.timeZone },
    viz,
    hourlyT2m: [],
  } as unknown as StoredSetup;
}

function constResult(value: number, source: CanonicalConsumption["meta"]["source"], extra: Partial<CanonicalConsumption["meta"]> = {}): CanonicalConsumption {
  const n = baseViz.hourly.loadKwh.length;
  const hourlyKwh = new Array(n).fill(value);
  return {
    hourlyKwh,
    meta: { source, label: "L", annualKwh: value * n, coveragePct: 100, ...extra },
  };
}

test("loadKwh sostituito, meta aggiornati, input non mutato (nuovo oggetto)", () => {
  const setup = makeSetup();
  const originalLoad0 = setup.viz.hourly.loadKwh[0];
  const spec: ConsumptionSpec = { method: "monthly", template: { months: [], weekendFactor: 1 } };
  const result = constResult(0.5, "monthly");

  const out = applyConsumption(setup, spec, result);

  expect(out).not.toBe(setup);
  expect(out.viz).not.toBe(setup.viz);
  // input non mutato
  expect(setup.viz.hourly.loadKwh[0]).toBe(originalLoad0);
  // loadKwh sostituito
  expect(out.viz.hourly.loadKwh.every((v) => Math.abs(v - 0.5) < 1e-9)).toBe(true);
  // meta
  expect(out.viz.meta.consumptionSource).toBe("monthly");
  expect(out.viz.meta.consumptionAnnualKwh).toBeCloseTo(0.5 * baseViz.hourly.loadKwh.length, 3);
  expect(out.viz.meta.consumptionNote).toContain("L");
  // spec + result conservati
  expect(out.consumption?.spec).toBe(spec);
  expect(out.consumption?.result).toBe(result);
});

test("nota CSV include la copertura", () => {
  const out = applyConsumption(makeSetup(), { method: "csv", filename: "c.csv" }, constResult(0.3, "csv", { label: "CSV c.csv", coveragePct: 88.5 }));
  expect(out.viz.meta.consumptionNote).toContain("copertura");
  expect(out.viz.meta.consumptionNote).toContain("88.5");
});

test("nota parametrica include il disclaimer", () => {
  const disc = "Stima approssimativa calcolata dai parametri inseriti: non sono dati reali, usala come ordine di grandezza.";
  const out = applyConsumption(makeSetup(), { method: "parametric", house: {} as never }, constResult(0.4, "parametric", { label: "Stima parametrica", disclaimer: disc }));
  expect(out.viz.meta.consumptionNote).toContain(disc);
});

test("invariante golden: deriveMonoViz(viz, baseline) riproduce i blocchi baked", () => {
  const setup = makeSetup();
  // usa una sagoma non banale (metà giornata alta) per stressare nb/wb
  const n = baseViz.hourly.loadKwh.length;
  const hourlyKwh = Array.from({ length: n }, (_, i) => (baseViz.hourly.localHour[i]! >= 8 && baseViz.hourly.localHour[i]! < 20 ? 1.2 : 0.3));
  const result: CanonicalConsumption = { hourlyKwh, meta: { source: "monthly", label: "T", annualKwh: hourlyKwh.reduce((s, v) => s + v, 0), coveragePct: 100 } };
  const out = applyConsumption(setup, { method: "monthly", template: { months: [], weekendFactor: 1 } }, result);

  const { vizA } = deriveMonoViz(out.viz, cloneFromBaseline(out.viz));

  expect(vizA.annual.noBattery.importKwh).toBeCloseTo(out.viz.annual.noBattery.importKwh, 6);
  expect(vizA.annual.noBattery.selfConsumedKwh).toBeCloseTo(out.viz.annual.noBattery.selfConsumedKwh, 6);
  expect(vizA.annual.withBattery.importKwh).toBeCloseTo(out.viz.annual.withBattery.importKwh, 6);
  expect(vizA.annual.withBattery.exportKwh).toBeCloseTo(out.viz.annual.withBattery.exportKwh, 6);
  expect(vizA.annual.withBattery.battery.equivalentCycles).toBeCloseTo(out.viz.annual.withBattery.battery.equivalentCycles, 6);
  expect(vizA.monthly[0]!.wb.importKwh).toBeCloseTo(out.viz.monthly[0]!.wb.importKwh, 6);
  // produzione invariata dai consumi (tolleranza come monoView.test: arrotondamenti)
  expect(out.viz.annual.production.practicalKwh).toBeCloseTo(baseViz.annual.production.practicalKwh, 0);
});
