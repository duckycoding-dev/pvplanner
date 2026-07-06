import { expect, test } from "bun:test";
import { parametricConsumption } from "../web/src/lib/parametricConsumption.ts";
import { HOUSE_DEFAULTS } from "../src/core/consumption/houseLoad.ts";
import type { StoredSetup } from "../web/src/lib/setupTypes.ts";

function fullYear(year = 2023): { ts: number[]; months: number[] } {
  const ts: number[] = [];
  const months: number[] = [];
  const end = Date.UTC(year + 1, 0, 1, 0);
  for (let t = Date.UTC(year, 0, 1, 0); t < end; t += 3_600_000) {
    ts.push(t);
    months.push(new Date(t).getUTCMonth() + 1);
  }
  return { ts, months };
}

function setupWith(t2mValue: number): StoredSetup {
  const { ts, months } = fullYear();
  const hourlyT2m = new Array(ts.length).fill(t2mValue);
  const viz = { hourly: { timestampsUtc: ts, months } };
  return {
    version: 1,
    savedAt: 0,
    inputs: { timeZone: "Europe/Rome" },
    viz,
    hourlyT2m,
  } as unknown as StoredSetup;
}

const DISCLAIMER =
  "Stima approssimativa calcolata dai parametri inseriti: non sono dati reali, usala come ordine di grandezza.";

test("totale caldo (nessun riscaldamento) = ACS + base", () => {
  const res = parametricConsumption({ ...HOUSE_DEFAULTS }, setupWith(25)); // > base temp → HDH 0
  const expDhw = (2 * 700 * 1.04) / 2.8;
  const expTotal = expDhw + 3000;
  expect(res.meta.annualKwh).toBeCloseTo(expTotal, 0);
  expect(res.hourlyKwh.length).toBe(8760);
});

test("t2m freddo (da hourlyT2m) aggiunge il riscaldamento", () => {
  const res = parametricConsumption({ ...HOUSE_DEFAULTS }, setupWith(-5)); // molto freddo → HDH grande
  const expHeat = (250 * 90 * 1.04) / 4.84;
  const expDhw = (2 * 700 * 1.04) / 2.8;
  const expTotal = expHeat + expDhw + 3000;
  expect(res.meta.annualKwh).toBeCloseTo(expTotal, 0);
});

test("meta: source parametric, coverage 100, disclaimer obbligatorio", () => {
  const res = parametricConsumption({ ...HOUSE_DEFAULTS }, setupWith(10));
  expect(res.meta.source).toBe("parametric");
  expect(res.meta.coveragePct).toBe(100);
  expect(res.meta.disclaimer).toBe(DISCLAIMER);
  expect(res.meta.label.toLowerCase()).toContain("parametric");
});
