import { expect, test } from "bun:test";
import { paybackYears } from "../src/core/economics/payback.ts";

const base = { incentiveEur: 0, incentiveYears: 1 };

test("simple payback from annual savings", () => {
  // -100, +60/yr → crosses zero partway through year 2
  expect(paybackYears({ capexEur: 100, annualSavingEur: 60, ...base })).toBeCloseTo(1 + 40 / 60, 6);
});

test("immediate incentive counts in year 1", () => {
  // capex 100, no saving, 100 incentive over 1 year → 1.0
  expect(paybackYears({ capexEur: 100, annualSavingEur: 0, incentiveEur: 100, incentiveYears: 1 })).toBeCloseTo(1, 6);
});

test("incentive spread over several years", () => {
  // capex 100, +10/yr saving + 50 incentive over 5y (10/yr) → 20/yr for 5y → year 5
  expect(paybackYears({ capexEur: 100, annualSavingEur: 10, incentiveEur: 50, incentiveYears: 5 })).toBeCloseTo(5, 6);
});

test("no payback when nothing comes back", () => {
  expect(paybackYears({ capexEur: 100, annualSavingEur: 0, ...base })).toBeNull();
  expect(paybackYears({ capexEur: 100, annualSavingEur: -5, ...base })).toBeNull();
});

test("zero capex pays back instantly", () => {
  expect(paybackYears({ capexEur: 0, annualSavingEur: 50, ...base })).toBe(0);
});
