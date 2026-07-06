import { expect, test } from "bun:test";
import { DAY_SHAPES, type MonthlyTemplate, expandMonthlyTemplate } from "../src/core/consumption/monthlyTemplate.ts";
import { validateCanonical } from "../src/core/consumption/canonical.ts";
import { localHourWeekday } from "../src/core/time/localTime.ts";

/** Full non-leap UTC year axis (2023 → 8760 hours). Months from the UTC timestamp. */
function fullYearAxis(year = 2023): { ts: number[]; months: number[] } {
  const ts: number[] = [];
  const months: number[] = [];
  const end = Date.UTC(year + 1, 0, 1, 0);
  for (let t = Date.UTC(year, 0, 1, 0); t < end; t += 3_600_000) {
    ts.push(t);
    months.push(new Date(t).getUTCMonth() + 1);
  }
  return { ts, months };
}

const DAYS_2023 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function template(dailyKwh: number[], weekendFactor = 1, shape: MonthlyTemplate["months"][number]["shape"] = "flat"): MonthlyTemplate {
  return { months: dailyKwh.map((d) => ({ dailyKwh: d, shape })), weekendFactor };
}

test("all four DAY_SHAPES have 24 dimensionless weights", () => {
  for (const key of ["flat", "morningEvening", "daytimeWfh", "nightHeavy"] as const) {
    expect(DAY_SHAPES[key].length).toBe(24);
  }
  expect(DAY_SHAPES.flat.every((v) => v === 1)).toBe(true);
});

test("(a) totale annuo = Σ (dailyKwh_m × giorni_m)", () => {
  const { ts, months } = fullYearAxis();
  const daily = [8, 8, 7, 6, 5, 5, 5, 5, 6, 7, 8, 9];
  const res = expandMonthlyTemplate(template(daily), ts, months, "UTC");
  const expected = daily.reduce((s, d, m) => s + d * DAYS_2023[m]!, 0);
  expect(res.hourlyKwh.length).toBe(8760);
  expect(res.meta.annualKwh).toBeCloseTo(expected, 6);
  expect(res.hourlyKwh.reduce((s, v) => s + v, 0)).toBeCloseTo(expected, 6);
  expect(res.meta.coveragePct).toBe(100);
});

test("(b) totale di ogni mese preservato anche con weekendFactor ≠ 1", () => {
  const { ts, months } = fullYearAxis();
  const daily = [8, 8, 7, 6, 5, 5, 5, 5, 6, 7, 8, 9];
  const res = expandMonthlyTemplate(template(daily, 1.7, "morningEvening"), ts, months, "Europe/Rome");
  for (let m = 1; m <= 12; m++) {
    const sum = res.hourlyKwh.reduce((s, v, i) => s + (months[i] === m ? v : 0), 0);
    expect(sum).toBeCloseTo(daily[m - 1]! * DAYS_2023[m - 1]!, 5);
  }
});

test("(c) shape flat, weekendFactor 1 → tutte le ore del giorno uguali", () => {
  const { ts, months } = fullYearAxis();
  const res = expandMonthlyTemplate(template(new Array(12).fill(10)), ts, months, "UTC");
  const day0 = res.hourlyKwh.slice(0, 24);
  for (const v of day0) expect(v).toBeCloseTo(day0[0]!, 9);
});

test("(d) weekendFactor 2, flat → ora weekend = 2× ora feriale stesso mese", () => {
  const { ts, months } = fullYearAxis();
  const res = expandMonthlyTemplate(template(new Array(12).fill(10), 2), ts, months, "UTC");
  // January (month 1), tz UTC → weekday classification == UTC weekday.
  let satIdx = -1;
  let tueIdx = -1;
  for (let i = 0; i < ts.length && (satIdx < 0 || tueIdx < 0); i++) {
    if (months[i] !== 1) continue;
    const wd = localHourWeekday(ts[i]!, "UTC").weekday;
    if (wd === 5 && satIdx < 0) satIdx = i;
    if (wd === 1 && tueIdx < 0) tueIdx = i;
  }
  expect(res.hourlyKwh[satIdx]! / res.hourlyKwh[tueIdx]!).toBeCloseTo(2, 9);
});

test("(e) weekend calcolato sul giorno LOCALE (a cavallo di mezzanotte)", () => {
  const { ts, months } = fullYearAxis();
  // 2023-06-30 23:00 UTC è venerdì UTC; a Roma (CEST +2) è sabato 01:00 → weekend LOCALE.
  const boundary = Date.UTC(2023, 5, 30, 23);
  const bIdx = ts.indexOf(boundary);
  expect(bIdx).toBeGreaterThanOrEqual(0);
  expect(localHourWeekday(boundary, "UTC").weekday).toBe(4); // venerdì in UTC
  expect(localHourWeekday(boundary, "Europe/Rome").weekday).toBe(5); // sabato a Roma

  // Un'ora feriale certa di giugno (martedì 2023-06-06 12:00 UTC → Roma martedì 14:00).
  const weekdayTs = Date.UTC(2023, 5, 6, 12);
  const wIdx = ts.indexOf(weekdayTs);
  expect(localHourWeekday(weekdayTs, "Europe/Rome").weekday).toBe(1);

  const rome = expandMonthlyTemplate(template(new Array(12).fill(10), 2), ts, months, "Europe/Rome");
  const utc = expandMonthlyTemplate(template(new Array(12).fill(10), 2), ts, months, "UTC");

  // In Europe/Rome la ora di confine è weekend → 2× la feriale (rinormalizzazione = scalare unico nel mese).
  expect(rome.hourlyKwh[bIdx]! / rome.hourlyKwh[wIdx]!).toBeCloseTo(2, 9);
  // In UTC quella stessa ora è feriale (venerdì) → rapporto 1.
  expect(utc.hourlyKwh[bIdx]! / utc.hourlyKwh[wIdx]!).toBeCloseTo(1, 9);
});

test("(f) shape custom di 24 valori accettata, totale mensile preservato", () => {
  const { ts, months } = fullYearAxis();
  const custom = new Array(24).fill(0.5);
  custom[12] = 5; // picco a mezzogiorno
  const months12: MonthlyTemplate = {
    months: new Array(12).fill(0).map(() => ({ dailyKwh: 10, shape: custom.slice() })),
    weekendFactor: 1,
  };
  const res = expandMonthlyTemplate(months12, ts, months, "UTC");
  const janSum = res.hourlyKwh.reduce((s, v, i) => s + (months[i] === 1 ? v : 0), 0);
  expect(janSum).toBeCloseTo(10 * 31, 5);
  // il picco a mezzogiorno deve dare valori più alti dell'ora di notte
  expect(res.hourlyKwh[12]!).toBeGreaterThan(res.hourlyKwh[3]!);
  expect(validateCanonical(res, 8760)).toBeNull();
});

test("nightHeavy: notte alta, giorno bassa", () => {
  expect(DAY_SHAPES.nightHeavy[3]).toBeGreaterThan(DAY_SHAPES.nightHeavy[12]!);
  expect(DAY_SHAPES.nightHeavy.length).toBe(24);
});
