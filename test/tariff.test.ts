import { expect, test } from "bun:test";
import { aggregateCost, hourInBand, priceForHour, type Tariff } from "../src/core/economics/tariff.ts";

const T: Tariff = {
  label: "test",
  bands: [
    { id: "day", name: "giorno", color: "#f00", hours: [[8, 20]], days: [0, 1, 2, 3, 4], buyPrice: 0.3 },
    { id: "night", name: "notte", color: "#00f", hours: [[20, 8]], days: [0, 1, 2, 3, 4, 5, 6], buyPrice: 0.1 },
  ],
  defaultBuyPrice: 0.2,
  sellPrice: 0.1,
};

test("hourInBand handles normal and wrapping ranges", () => {
  expect(hourInBand(10, [[8, 20]])).toBe(true);
  expect(hourInBand(20, [[8, 20]])).toBe(false); // end exclusive
  expect(hourInBand(2, [[20, 8]])).toBe(true); // wrap past midnight
  expect(hourInBand(12, [[20, 8]])).toBe(false);
});

test("priceForHour: first matching band wins, else default", () => {
  expect(priceForHour(T, 10, 2)).toBe(0.3); // weekday daytime
  expect(priceForHour(T, 23, 2)).toBe(0.1); // weekday night
  expect(priceForHour(T, 10, 6)).toBe(0.2); // sunday daytime → no band → default
  expect(priceForHour(T, 3, 6)).toBe(0.1); // sunday night → night band (all days)
});

test("aggregateCost: buy banded, sell flat, net = buy - sell, annual = sum months", () => {
  const imp = [1, 0];
  const exp = [0, 2];
  const lh = [10, 11];
  const wd = [2, 2];
  const mo = [1, 2];
  const r = aggregateCost(imp, exp, lh, wd, mo, T);
  expect(r.annual.buyCost).toBeCloseTo(0.3, 9); // 1 kWh @ 0.30
  expect(r.annual.sellRevenue).toBeCloseTo(0.2, 9); // 2 kWh @ 0.10
  expect(r.annual.netCost).toBeCloseTo(0.1, 9);
  const sumMonthNet = r.monthly.reduce((s, m) => s + m.netCost, 0);
  expect(sumMonthNet).toBeCloseTo(r.annual.netCost, 9);
  expect(r.monthly.length).toBe(12);
});
