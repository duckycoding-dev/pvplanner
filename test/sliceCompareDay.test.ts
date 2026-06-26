import { expect, test } from "bun:test";
import type { Viz } from "../web/src/types.ts";
import type { SystemResult } from "../src/core/comparison/computeSystem.ts";
import { sliceCompareDay } from "../web/src/lib/sliceCompareDay.ts";

function res(practical: number[], self: number[], soc: number[]): SystemResult {
  return {
    production: { hourly: { practicalKwh: practical } },
    hourly: { selfConsumedKwh: self, socKwh: soc },
  } as unknown as SystemResult;
}

test("sliceCompareDay returns 24 aligned A-vs-B points for the requested day", () => {
  const n = 48; // 2 days
  const zero = (): number[] => new Array<number>(n).fill(0);
  const pA = zero();
  const pB = zero();
  const load = zero();
  pA[24 + 5] = 3; // day 1, hour 5
  pB[24 + 5] = 7;
  load[24 + 5] = 2;
  const a = res(pA, zero(), zero());
  const b = res(pB, zero(), zero());
  const viz = { hourly: { loadKwh: load } } as unknown as Viz;

  const pts = sliceCompareDay(a, b, viz, 1);
  expect(pts.length).toBe(24);
  expect(pts[0]!.hour).toBe(0);
  expect(pts[5]!.prodA).toBe(3);
  expect(pts[5]!.prodB).toBe(7);
  expect(pts[5]!.load).toBe(2);
});
