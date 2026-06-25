import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { syntheticHeatPumpLoad } from "../src/core/consumption/syntheticSource.ts";

test("synthetic load scales to target, full length, winter-heavy", async () => {
  const cfg = await loadConfig();
  const { hourly } = await analyzeProduction(cfg);
  const base = hourly[0]!;
  const series = syntheticHeatPumpLoad({
    timestampsUtc: base.timestampsUtc,
    months: base.months,
    t2m: base.t2m,
    annualKwhTarget: 7000,
  });
  expect(series.loadKwh.length).toBe(base.timestampsUtc.length);
  expect(series.annualKwh).toBeCloseTo(7000, 0);

  const monthSum = (m: number): number =>
    series.loadKwh.reduce((s, v, i) => s + (base.months[i] === m ? v : 0), 0);
  // heat-pump house: January load well above July
  expect(monthSum(1)).toBeGreaterThan(monthSum(7));
});
