import { expect, test } from "bun:test";
import { typicalYear } from "../src/core/pvgis/typicalYear.ts";
import { ALLOWED_YEARS } from "../src/core/pvgis/allowedYears.ts";
import { loadConfig } from "../src/config/loadConfig.ts";
import { hasPersonalConfig } from "./helpers/personalConfig.ts";
import { hourlyParams } from "../src/fetch/urlBuilder.ts";
import type { HourlySeries } from "../src/core/types.ts";

const HOUR_MS = 3_600_000;

/**
 * Synthetic 2-year series: 2019 (non-leap, 8760 rows, P=1 kWh/h, T=10°C) +
 * 2020 (leap, 8784 rows, P=2 kWh/h, T=20°C), one seriescalc-style UTC axis.
 */
function buildTwoYearSeries(): HourlySeries {
  const start = Date.UTC(2019, 0, 1, 0);
  const totalHours = 8760 + 8784;
  const timestampsUtc: number[] = [];
  const months: number[] = [];
  const productionKwh: number[] = [];
  const t2m: number[] = [];
  for (let i = 0; i < totalHours; i++) {
    const ts = start + i * HOUR_MS;
    const d = new Date(ts);
    const year = d.getUTCFullYear();
    timestampsUtc.push(ts);
    months.push(d.getUTCMonth() + 1);
    productionKwh.push(year === 2019 ? 1 : 2);
    t2m.push(year === 2019 ? 10 : 20);
  }
  return {
    id: "est",
    azimuth: -45,
    peakKwp: 5.115,
    timestampsUtc,
    months,
    productionKwh,
    t2m,
    reconstructedCount: 7,
  };
}

test("typicalYear collapses 2 years into a typical 8760-row year", () => {
  const s = buildTwoYearSeries();
  const out = typicalYear(s, 2019, 2020);

  // Axis is a single non-leap year.
  expect(out.timestampsUtc.length).toBe(8760);
  expect(out.productionKwh.length).toBe(8760);
  expect(out.t2m.length).toBe(8760);
  expect(out.months.length).toBe(8760);

  // Every hour is the arithmetic mean of the two years.
  for (const p of out.productionKwh) expect(p).toBeCloseTo(1.5, 10);
  for (const t of out.t2m) expect(t).toBeCloseTo(15, 10);

  // Timestamps come from 2019 (first non-leap year in range).
  expect(out.timestampsUtc[0]).toBe(Date.UTC(2019, 0, 1, 0));
  expect(new Date(out.timestampsUtc[0]!).getUTCFullYear()).toBe(2019);
  expect(new Date(out.timestampsUtc[out.timestampsUtc.length - 1]!).getUTCFullYear()).toBe(2019);

  // No Feb 29 in the output.
  const hasFeb29 = out.timestampsUtc.some((ts) => {
    const d = new Date(ts);
    return d.getUTCMonth() === 1 && d.getUTCDate() === 29;
  });
  expect(hasFeb29).toBe(false);

  // months coherent with the axis timestamps.
  for (let i = 0; i < out.months.length; i++) {
    expect(out.months[i]).toBe(new Date(out.timestampsUtc[i]!).getUTCMonth() + 1);
  }

  // Total = mean of the annual totals excluding Feb 29.
  const total = out.productionKwh.reduce((a, b) => a + b, 0);
  const total2019 = 8760 * 1;
  const total2020NoFeb29 = 8760 * 2; // 8784 - 24 leap-day hours, all P=2
  expect(total).toBeCloseTo((total2019 + total2020NoFeb29) / 2, 6);

  // Meta preserved.
  expect(out.id).toBe("est");
  expect(out.azimuth).toBe(-45);
  expect(out.peakKwp).toBeCloseTo(5.115, 6);
});

test("typicalYear with a single year returns the input unchanged (same reference)", () => {
  const s = buildTwoYearSeries();
  const out = typicalYear(s, 2019, 2019);
  expect(out).toBe(s);
});

test("ALLOWED_YEARS sanity: expected databases present, min <= max", () => {
  expect(ALLOWED_YEARS["PVGIS-SARAH3"]).toBeDefined();
  expect(ALLOWED_YEARS["PVGIS-ERA5"]).toBeDefined();
  for (const db of Object.values(ALLOWED_YEARS)) {
    expect(db.min).toBeLessThanOrEqual(db.max);
  }
});

// Golden calibrati sul config personale (cercano la falda "est"): skippati su
// clone fresco / fallback demo, dove config.json non esiste.
test.skipIf(!hasPersonalConfig)("hourlyParams without years => startyear=endyear=single_year", async () => {
  const cfg = await loadConfig();
  const est = cfg.resolvedFalde.find((f) => f.id === "est")!;
  const p = hourlyParams(cfg, est);
  expect(p.startyear).toBe(String(cfg.pvgis.single_year));
  expect(p.endyear).toBe(String(cfg.pvgis.single_year));
});

test.skipIf(!hasPersonalConfig)("hourlyParams with a year range => startyear/endyear from the range", async () => {
  const cfg = await loadConfig();
  const est = cfg.resolvedFalde.find((f) => f.id === "est")!;
  const p = hourlyParams(cfg, est, { from: 2019, to: 2023 });
  expect(p.startyear).toBe("2019");
  expect(p.endyear).toBe("2023");
});
