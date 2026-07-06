import { expect, test } from "bun:test";
import { type CanonicalConsumption, validateCanonical } from "../src/core/consumption/canonical.ts";

function make(hourlyKwh: number[]): CanonicalConsumption {
  return {
    hourlyKwh,
    meta: { source: "monthly", label: "x", annualKwh: hourlyKwh.reduce((s, v) => s + v, 0), coveragePct: 100 },
  };
}

test("validateCanonical: lunghezza corretta → null", () => {
  expect(validateCanonical(make([1, 2, 3]), 3)).toBeNull();
});

test("validateCanonical: lunghezza sbagliata → messaggio con i numeri", () => {
  const msg = validateCanonical(make([1, 2, 3]), 8760);
  expect(msg).not.toBeNull();
  expect(msg).toContain("8760");
  expect(msg).toContain("3");
});

test("validateCanonical: NaN → messaggio", () => {
  const msg = validateCanonical(make([1, Number.NaN, 3]), 3);
  expect(msg).not.toBeNull();
  expect(msg!.toLowerCase()).toContain("numer");
});

test("validateCanonical: valore negativo → messaggio", () => {
  const msg = validateCanonical(make([1, -0.5, 3]), 3);
  expect(msg).not.toBeNull();
  expect(msg!.toLowerCase()).toContain("negativ");
});

test("validateCanonical: Infinity → messaggio (non finito)", () => {
  const msg = validateCanonical(make([1, Number.POSITIVE_INFINITY, 3]), 3);
  expect(msg).not.toBeNull();
});
