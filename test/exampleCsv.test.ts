import { expect, test } from "bun:test";
import { detectEDistribuzione, parseEDistribuzione } from "../src/core/consumption/parseEDistribuzione.ts";
import { parseConsumptionCsv } from "../src/core/consumption/parseCsv.ts";
import type { CsvParseOptions } from "../src/core/consumption/parseCsv.ts";

/** I CSV di esempio in examples/ devono restare caricabili dal flusso reale dell'UI. */

function yearAxis(year: number): CsvParseOptions {
  const timestampsUtc: number[] = [];
  const months: number[] = [];
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  for (let t = start; t < end; t += 3_600_000) {
    timestampsUtc.push(t);
    months.push(new Date(t).getUTCMonth() + 1);
  }
  return { timeZone: "Europe/Rome", timestampsUtc, months };
}

const opts = yearAxis(2023);

test("esempio orario generico: parser generico, copertura piena", async () => {
  const text = await Bun.file("examples/consumi-esempio-orario.csv").text();
  expect(detectEDistribuzione(text)).toBe(false);
  const out = parseConsumptionCsv(text, "consumi-esempio-orario.csv", opts);
  // File pulito: nessun avviso (l'ora inesistente del DST non è nel file; l'ora
  // duplicata d'autunno lascia un buco riempito in silenzio dal profilo).
  expect(out.warnings).toEqual([]);
  expect(out.result.meta.coveragePct).toBeGreaterThan(99.9);
  expect(out.result.meta.annualKwh).toBeGreaterThan(3000);
  expect(out.result.meta.annualKwh).toBeLessThan(6000);
});

test("esempio e-distribuzione wide: detect + somma quarti", async () => {
  const text = await Bun.file("examples/consumi-esempio-edistribuzione.csv").text();
  expect(detectEDistribuzione(text)).toBe(true);
  const out = parseEDistribuzione(text, "consumi-esempio-edistribuzione.csv", opts);
  expect(out.warnings).toEqual([]);
  expect(out.result.meta.coveragePct).toBeGreaterThan(99.9);
  expect(out.result.meta.annualKwh).toBeGreaterThan(3000);
  expect(out.result.meta.annualKwh).toBeLessThan(6000);
});
