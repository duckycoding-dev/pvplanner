import { expect, test } from "bun:test";
import type { Viz } from "../web/src/types.ts";
import { runSystem } from "../web/src/lib/runSystem.ts";
import { cloneFromBaseline } from "../web/src/lib/systemConfig.ts";

function makeViz(): Viz {
  return {
    meta: {
      acCapKw: 100, // no clipping
      batteryUsableKwh: 0,
      batteryTotalKwh: 0,
      batteryUsablePct: 100,
      batteryPortKw: 6,
      batteryRoundTrip: 0.9,
      falde: [
        { id: "est", azimuth: -45, peakKwp: 2, panelCount: 10, wp: 200 },
        { id: "ovest", azimuth: 45, peakKwp: 2, panelCount: 10, wp: 200 },
      ],
    },
    hourly: {
      timestampsUtc: [0, 3_600_000],
      months: [1, 1],
      loadKwh: [0, 0],
      falde: [
        { id: "est", azimuth: -45, peakKwp: 2, productionKwh: [1, 2] },
        { id: "ovest", azimuth: 45, peakKwp: 2, productionKwh: [1, 1] },
      ],
    },
  } as unknown as Viz;
}

test("runSystem reproduces the baseline clone", () => {
  const viz = makeViz();
  const r = runSystem(cloneFromBaseline(viz), viz);
  expect(r.production.hourly.practicalKwh).toEqual([2, 3]); // est+ovest, no clip
  expect(r.scenario).toBe("no-battery");
});

test("runSystem scales a single falda by its panel count", () => {
  const viz = makeViz();
  const cfg = cloneFromBaseline(viz);
  const doubled = { ...cfg, falde: cfg.falde.map((f) => (f.id === "est" ? { ...f, panelCount: 20 } : f)) };
  const r = runSystem(doubled, viz);
  expect(r.production.hourly.practicalKwh).toEqual([3, 5]); // est doubled [2,4] + ovest [1,1]
});

test("runSystem aligns falde by id regardless of config order", () => {
  const viz = makeViz();
  const cfg = cloneFromBaseline(viz);
  const reversed = { ...cfg, falde: [...cfg.falde].reverse() };
  expect(runSystem(reversed, viz).production.hourly.practicalKwh).toEqual([2, 3]);
});

test("runSystem feeds usable = total × usable% to the battery", () => {
  const viz = makeViz();
  const cfg = { ...cloneFromBaseline(viz), batteryTotalKwh: 10, batteryUsablePct: 50 };
  const r = runSystem(cfg, viz);
  expect(r.scenario).toBe("with-battery");
  expect(r.metrics.battery!.usableKwh).toBeCloseTo(5, 9);
});
