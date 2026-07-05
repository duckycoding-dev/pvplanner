import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { HOUSE_DEFAULTS, syntheticHouseLoad } from "../src/core/consumption/houseLoad.ts";

test("house V2 load: physical totals, winter-heavy, full length", async () => {
  const cfg = await loadConfig();
  const { hourly } = await analyzeProduction(cfg);
  const base = hourly[0]!;
  const p = { ...HOUSE_DEFAULTS, heatedAreaM2: 250, specificHeatDemandKwhM2y: 90, wfhOccupants: 1, flowTempC: 30 };
  const series = syntheticHouseLoad({ timestampsUtc: base.timestampsUtc, months: base.months, t2m: base.t2m, timeZone: "Europe/Rome" }, p);

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
  const ctx = { timestampsUtc: base.timestampsUtc, months: base.months, t2m: base.t2m, timeZone: "Europe/Rome" };
  const lo = syntheticHouseLoad(ctx, { ...HOUSE_DEFAULTS, specificHeatDemandKwhM2y: 60 });
  const hi = syntheticHouseLoad(ctx, { ...HOUSE_DEFAULTS, specificHeatDemandKwhM2y: 120 });
  expect(hi.annualKwh).toBeGreaterThan(lo.annualKwh);
});

test("DST: la sagoma del carico base segue l'ora locale estiva (UTC+2)", () => {
  // 48 h a partire da lunedì 2023-07-03 00:00 UTC; solo carico base (niente PDC/ACS).
  const n = 48;
  const timestampsUtc = Array.from({ length: n }, (_, i) => Date.UTC(2023, 6, 3, 0) + i * 3_600_000);
  const ctx = {
    timestampsUtc,
    months: new Array<number>(n).fill(7),
    t2m: new Array<number>(n).fill(25), // > heatingBaseTempC → riscaldamento nullo
    timeZone: "Europe/Rome",
  };
  const p = { ...HOUSE_DEFAULTS, specificHeatDemandKwhM2y: 0, dhwKwhPerPersonY: 0, wfhOccupants: 0 };
  const series = syntheticHouseLoad(ctx, p);
  // BASE_WEEKDAY ha il massimo (1.6) alle ore locali 18 e 19 → in CEST (UTC+2)
  // il primo massimo del giorno cade all'indice UTC 16 (col vecchio UTC+1 sarebbe 17).
  const day0 = series.loadKwh.slice(0, 24);
  const argmax = day0.indexOf(Math.max(...day0));
  expect(argmax).toBe(16);
});
