import { expect, test } from "bun:test";
import { incentiveTotalEur, systemPaybackYears } from "../web/src/lib/economics.ts";

test("incentiveTotalEur: percent of capex or fixed amount", () => {
  expect(incentiveTotalEur({ mode: "percent", value: 50, years: 10 }, 16000)).toBe(8000);
  expect(incentiveTotalEur({ mode: "fixed", value: 2000, years: 1 }, 16000)).toBe(2000);
});

test("systemPaybackYears uses saving = noPvNet - systemNet", () => {
  // capex 1000, saving 100/yr, no incentive → year 10
  expect(systemPaybackYears(1000, 0, 100, { mode: "fixed", value: 0, years: 1 })).toBeCloseTo(10, 6);
  // + 500 immediate incentive (percent 50 of 1000) → year 5
  expect(systemPaybackYears(1000, 0, 100, { mode: "percent", value: 50, years: 1 })).toBeCloseTo(5, 6);
  // system costs more than no-PV → never
  expect(systemPaybackYears(1000, 200, 100, { mode: "fixed", value: 0, years: 1 })).toBeNull();
});
