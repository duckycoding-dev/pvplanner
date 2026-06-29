import { expect, test } from "bun:test";
import type { Viz } from "../web/src/types.ts";
import { monorarioTariff } from "../web/src/lib/tariffPresets.ts";
import { batterySavingEur, scenarioCost } from "../web/src/lib/viewCosts.ts";

function vizFixture(): Viz {
  return {
    hourly: {
      months: [1, 1],
      localHour: [3, 14],
      weekday: [2, 2],
      nb: { importKwh: [2, 0], exportKwh: [0, 4], selfConsumedKwh: [0, 0] },
      wb: { importKwh: [1, 0], exportKwh: [0, 3], selfConsumedKwh: [0, 0] },
    },
  } as unknown as Viz;
}

test("scenarioCost prices the chosen scenario's flows", () => {
  const t = monorarioTariff(0.3, 0.1);
  const c = scenarioCost(vizFixture(), "senza", t);
  expect(c.annual.buyCost).toBeCloseTo(0.6, 9); // 2 kWh × 0.30
  expect(c.annual.sellRevenue).toBeCloseTo(0.4, 9); // 4 kWh × 0.10
  expect(c.annual.netCost).toBeCloseTo(0.2, 9);
});

test("batterySavingEur = net(senza) - net(con)", () => {
  const t = monorarioTariff(0.3, 0.1);
  const v = vizFixture();
  const senza = scenarioCost(v, "senza", t).annual.netCost; // 0.20
  const con = scenarioCost(v, "con", t).annual.netCost; // 1×0.30 - 3×0.10 = 0.0
  expect(con).toBeCloseTo(0.0, 9);
  expect(batterySavingEur(v, t)).toBeCloseTo(senza - con, 9);
});
