import { expect, test } from "bun:test";
import { applyAcCap } from "../src/core/production/clipping.ts";

test("below cap: unchanged, zero clipping", () => {
  const r = applyAcCap([1, 2, 3], 6);
  expect(r.practicalKwh).toEqual([1, 2, 3]);
  expect(r.clippingLossKwh).toEqual([0, 0, 0]);
});

test("above cap: practical = cap, clipping = excess", () => {
  const r = applyAcCap([8, 6, 7], 6);
  expect(r.practicalKwh).toEqual([6, 6, 6]);
  expect(r.clippingLossKwh[0]).toBeCloseTo(2, 9);
  expect(r.clippingLossKwh[1]).toBeCloseTo(0, 9);
  expect(r.clippingLossKwh[2]).toBeCloseTo(1, 9);
});

test("conservation: theoretical = practical + clipping", () => {
  const theo = [0, 3, 6, 9, 12];
  const r = applyAcCap(theo, 6);
  for (let i = 0; i < theo.length; i++) {
    expect(r.practicalKwh[i]! + r.clippingLossKwh[i]!).toBeCloseTo(theo[i]!, 9);
  }
});
