import { expect, test } from "bun:test";
import { cashflowSeries } from "../web/src/lib/cashflow.ts";
import { paybackYears } from "../src/core/economics/payback.ts";

test("series starts at −capex and has years+1 points", () => {
  const s = cashflowSeries({ capex: 10000, annualSaving: 1000, incentiveTotal: 0, incentiveYears: 1, years: 20 });
  expect(s.length).toBe(21);
  expect(s[0]).toBe(-10000);
  expect(s[20]).toBe(-10000 + 1000 * 20);
});

test("incentive instalments stop after N years (slope drops)", () => {
  const s = cashflowSeries({ capex: 0, annualSaving: 100, incentiveTotal: 1000, incentiveYears: 2, years: 4 });
  // year1,2: +100 +500 = +600 each; year3,4: +100 each
  expect(s[0]).toBe(0);
  expect(s[1]).toBeCloseTo(600, 6);
  expect(s[2]).toBeCloseTo(1200, 6);
  expect(s[3]).toBeCloseTo(1300, 6);
  expect(s[4]).toBeCloseTo(1400, 6);
});

test("zero crossing matches paybackYears", () => {
  const input = { capex: 11000, annualSaving: 1200, incentiveTotal: 5500, incentiveYears: 10 };
  const pay = paybackYears({
    capexEur: input.capex,
    annualSavingEur: input.annualSaving,
    incentiveEur: input.incentiveTotal,
    incentiveYears: input.incentiveYears,
    horizonYears: 40,
  });
  expect(pay).not.toBeNull();
  const s = cashflowSeries({ ...input, years: 40 });
  const k = s.findIndex((v) => v >= 0);
  // payback falls within the year that turns the cumulative non-negative
  expect(k - 1).toBeLessThanOrEqual(pay!);
  expect(pay!).toBeLessThanOrEqual(k);
  expect(s[k - 1]! < 0 && s[k]! >= 0).toBe(true);
});

test("senza FV style input (no capex, no saving) is a flat zero line", () => {
  const s = cashflowSeries({ capex: 0, annualSaving: 0, incentiveTotal: 0, incentiveYears: 1, years: 10 });
  expect(s.every((v) => v === 0)).toBe(true);
});
