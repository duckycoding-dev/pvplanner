import { expect, test } from "bun:test";
import { dayCount, sliceDay } from "../web/src/lib/sliceDay.ts";
import { quickPickDays } from "../web/src/lib/quickPickDays.ts";
import type { Hourly } from "../web/src/types.ts";

function makeHourly(days: number): Hourly {
  const n = days * 24;
  const zero = (): number[] => new Array<number>(n).fill(0);
  return {
    timestampsUtc: Array.from({ length: n }, (_, i) => Date.UTC(2023, 0, 1, 0) + i * 3_600_000),
    months: Array.from({ length: n }, () => 1),
    productionTheoreticalKwh: zero(),
    productionPracticalKwh: zero(),
    clippingKwh: zero(),
    loadKwh: zero(),
    nb: { selfConsumedKwh: zero(), importKwh: zero(), exportKwh: zero() },
    wb: {
      selfConsumedKwh: zero(),
      importKwh: zero(),
      exportKwh: zero(),
      chargeKwh: zero(),
      dischargeKwh: zero(),
      socKwh: zero(),
    },
  };
}

test("sliceDay returns 24 aligned points for the requested day", () => {
  const h = makeHourly(3);
  h.productionPracticalKwh[24 + 5] = 4.2; // day 1, hour 5
  const pts = sliceDay(h, 1);
  expect(pts.length).toBe(24);
  expect(pts[0]!.hour).toBe(0);
  expect(pts[5]!.prodPractical).toBe(4.2);
  expect(dayCount(h)).toBe(3);
});

test("quickPickDays finds max-clipping and max-production days", () => {
  const h = makeHourly(3);
  for (let i = 0; i < 24; i++) h.clippingKwh[2 * 24 + i] = 1; // day 2 clips
  h.productionPracticalKwh[0] = 100; // day 0 max production
  const picks = quickPickDays(h);
  expect(picks.maxClipping).toBe(2);
  expect(picks.maxProduction).toBe(0);
});
