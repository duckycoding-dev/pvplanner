import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { hasPersonalConfig } from "./helpers/personalConfig.ts";

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

// Golden calibrati sul dataset personale (falde est/ovest, data/falde/):
// skippati su clone fresco / fallback demo, dove config.json non esiste.
test.skipIf(!hasPersonalConfig)("production model reproduces golden 2023 figures", async () => {
  const cfg = await loadConfig();
  const { result } = await analyzeProduction(cfg);

  const est = result.falde.find((f) => f.id === "est")!;
  const ovest = result.falde.find((f) => f.id === "ovest")!;
  expect(est.annualKwh).toBeCloseTo(6424.78, 1);
  expect(ovest.annualKwh).toBeCloseTo(6467.77, 1);

  const a = result.combined.annual;
  expect(a.theoreticalKwh).toBeCloseTo(12892.55, 1);
  expect(a.practicalKwh).toBeCloseTo(12433.45, 1);
  expect(a.clippingLossKwh).toBeCloseTo(459.1, 1);
  expect(a.clippingPct).toBeCloseTo(3.56, 1);
  expect(a.clippedHours).toBe(589);
  expect(a.peakKw).toBeGreaterThan(8.0);
  expect(a.peakKw).toBeLessThan(8.05);
  expect(result.hoursInYear).toBe(8760);
});

test("monthly sums equal annual totals; theoretical = practical + clipping", async () => {
  const cfg = await loadConfig();
  const { result } = await analyzeProduction(cfg);
  const a = result.combined.annual;

  expect(sum(result.combined.monthly.map((m) => m.theoreticalKwh))).toBeCloseTo(a.theoreticalKwh, 5);
  expect(sum(result.combined.monthly.map((m) => m.practicalKwh))).toBeCloseTo(a.practicalKwh, 5);
  expect(sum(result.combined.monthly.map((m) => m.clippingLossKwh))).toBeCloseTo(a.clippingLossKwh, 5);
  expect(a.practicalKwh + a.clippingLossKwh).toBeCloseTo(a.theoreticalKwh, 5);
});

test("per-falda annual equals sum of its monthly", async () => {
  const cfg = await loadConfig();
  const { result } = await analyzeProduction(cfg);
  for (const f of result.falde) {
    expect(sum(f.monthlyKwh)).toBeCloseTo(f.annualKwh, 5);
  }
});

test.skipIf(!hasPersonalConfig)("multi-year reference = sum of per-falda E_y", async () => {
  const cfg = await loadConfig();
  const { result } = await analyzeProduction(cfg);
  expect(result.combined.multiyear.annualKwh).toBeCloseTo(6507.54 + 6563.24, 1);
});
