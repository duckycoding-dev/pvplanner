import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { HOUSE_DEFAULTS, syntheticHouseLoad } from "../src/core/consumption/houseLoad.ts";

test("house V2 load: physical totals, winter-heavy, full length", async () => {
  const cfg = await loadConfig();
  const { hourly } = await analyzeProduction(cfg);
  const base = hourly[0]!;
  const p = { ...HOUSE_DEFAULTS, heatedAreaM2: 250, specificHeatDemandKwhM2y: 90, wfhOccupants: 1, flowTempC: 30 };
  const series = syntheticHouseLoad({ timestampsUtc: base.timestampsUtc, months: base.months, t2m: base.t2m }, p);

  expect(series.loadKwh.length).toBe(base.timestampsUtc.length);
  expect(series.source).toBe("synthetic-house");

  // total = heating(area×spec×standby/SCOP) + DHW(persons×kWh×standby/COP) + base
  const expHeat = (250 * 90 * 1.04) / 4.84;
  const expDhw = (2 * 700 * 1.04) / 2.8;
  const expTotal = expHeat + expDhw + 3000;
  expect(series.annualKwh).toBeCloseTo(expTotal, 0); // ~8355 kWh

  const monthSum = (m: number): number =>
    series.loadKwh.reduce((s, v, i) => s + (base.months[i] === m ? v : 0), 0);
  // heat-pump house: January (heating) far above July (≈ DHW+base only)
  expect(monthSum(1)).toBeGreaterThan(2 * monthSum(7));
  expect(series.loadKwh.every((v) => v >= 0)).toBe(true);
});

test("more insulation (lower specific demand) lowers the annual load", async () => {
  const cfg = await loadConfig();
  const { hourly } = await analyzeProduction(cfg);
  const base = hourly[0]!;
  const ctx = { timestampsUtc: base.timestampsUtc, months: base.months, t2m: base.t2m };
  const lo = syntheticHouseLoad(ctx, { ...HOUSE_DEFAULTS, specificHeatDemandKwhM2y: 60 });
  const hi = syntheticHouseLoad(ctx, { ...HOUSE_DEFAULTS, specificHeatDemandKwhM2y: 120 });
  expect(hi.annualKwh).toBeGreaterThan(lo.annualKwh);
});
