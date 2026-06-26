import { expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { analyzeSimulation } from "../src/app/analyzeSimulation.ts";
import { writeVizJson } from "../src/export/writeVizJson.ts";

test("writeVizJson emits a viz.json matching the analysis", async () => {
  const cfg = await loadConfig();
  const prod = await analyzeProduction(cfg);
  const sim = await analyzeSimulation(cfg, prod);
  const out = join(tmpdir(), `viz-test-${process.pid}.json`);
  await writeVizJson(prod, sim, cfg, out);

  const v = (await Bun.file(out).json()) as {
    meta: {
      hoursInYear: number;
      acCapKw: number;
      batteryUsableKwh: number;
      batteryTotalKwh: number;
      batteryUsablePct: number;
      batteryPortKw: number;
      batteryRoundTrip: number;
      consumptionAnnualKwh: number;
      falde: { id: string; peakKwp: number; panelCount: number; wp: number }[];
    };
    annual: { production: { theoreticalKwh: number; clippedHours: number } };
    monthly: unknown[];
    hourly: {
      productionPracticalKwh: number[];
      wb: { socKwh: number[] };
      falde: { id: string; peakKwp: number; productionKwh: number[] }[];
    };
  };

  expect(v.meta.hoursInYear).toBe(8760);
  expect(v.meta.acCapKw).toBe(6);
  expect(v.meta.batteryUsableKwh).toBeCloseTo(10.24, 2);
  expect(v.meta.batteryPortKw).toBe(6);
  expect(v.meta.batteryUsablePct).toBe(100);
  expect(v.meta.batteryTotalKwh).toBeCloseTo(10.24, 2);
  expect(v.meta.batteryRoundTrip).toBeCloseTo(0.9, 6);
  expect(v.meta.consumptionAnnualKwh).toBeGreaterThan(0);
  expect(v.meta.falde.length).toBe(2);
  expect(v.meta.falde[0]!.panelCount).toBe(11);
  expect(v.meta.falde[0]!.wp).toBe(465);
  expect(v.annual.production.theoreticalKwh).toBeCloseTo(12892.55, 1);
  expect(v.annual.production.clippedHours).toBe(589);
  expect(v.monthly.length).toBe(12);
  expect(v.hourly.productionPracticalKwh.length).toBe(8760);
  expect(v.hourly.wb.socKwh.length).toBe(8760);
  expect(v.hourly.falde.length).toBe(2);
  expect(v.hourly.falde[0]!.productionKwh.length).toBe(8760);
  // per-falda hourly must sum to the combined theoretical (before clipping)
  const sumFalde = v.hourly.falde.reduce((s, f) => s + f.productionKwh.reduce((a, b) => a + b, 0), 0);
  expect(sumFalde).toBeCloseTo(v.annual.production.theoreticalKwh, 0);
});
