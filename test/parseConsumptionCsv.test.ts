import { expect, test } from "bun:test";
import { type CsvParseOptions, parseConsumptionCsv } from "../src/core/consumption/parseCsv.ts";

/** UTC hourly axis of `hours` starting at the given UTC instant. months from UTC. */
function axis(startUtc: number, hours: number): { timestampsUtc: number[]; months: number[] } {
  const timestampsUtc: number[] = [];
  const months: number[] = [];
  for (let i = 0; i < hours; i++) {
    const t = startUtc + i * 3_600_000;
    timestampsUtc.push(t);
    months.push(new Date(t).getUTCMonth() + 1);
  }
  return { timestampsUtc, months };
}

function opts(a: { timestampsUtc: number[]; months: number[] }, timeZone = "UTC"): CsvParseOptions {
  return { timeZone, timestampsUtc: a.timestampsUtc, months: a.months };
}

function iso(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:00`;
}

test("(a) file orario ISO completo → coverage 100 e valori esatti", () => {
  const a = axis(Date.UTC(2023, 2, 10, 0), 24);
  const lines = a.timestampsUtc.map((t, i) => `${iso(t)},${(i + 1) * 0.5}`);
  const out = parseConsumptionCsv(lines.join("\n"), "casa.csv", opts(a));
  expect(out.result.meta.coveragePct).toBe(100);
  expect(out.result.meta.source).toBe("csv");
  expect(out.result.hourlyKwh[0]).toBeCloseTo(0.5, 9);
  expect(out.result.hourlyKwh[23]).toBeCloseTo(12, 9);
  expect(out.result.meta.annualKwh).toBeCloseTo(a.timestampsUtc.reduce((s, _t, i) => s + (i + 1) * 0.5, 0), 6);
  expect(out.warnings.length).toBe(0);
});

test("(b) quartorario → somma per ora", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 2); // 2 ore feriali
  const rows: string[] = [];
  for (let h = 0; h < 2; h++) {
    for (const mm of [0, 15, 30, 45]) {
      const p = (n: number) => String(n).padStart(2, "0");
      rows.push(`2023-01-03 ${p(h)}:${p(mm)},0.25`);
    }
  }
  const out = parseConsumptionCsv(rows.join("\n"), "q.csv", opts(a));
  expect(out.result.hourlyKwh[0]).toBeCloseTo(1.0, 9); // 4 × 0.25
  expect(out.result.hourlyKwh[1]).toBeCloseTo(1.0, 9);
  expect(out.result.meta.coveragePct).toBe(100);
});

test("(c) delimitatore ; con virgola decimale", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 3);
  const rows = a.timestampsUtc.map((t) => `${iso(t)};1,5`);
  const out = parseConsumptionCsv(rows.join("\n"), "d.csv", opts(a));
  expect(out.result.hourlyKwh[0]).toBeCloseTo(1.5, 9);
  expect(out.result.meta.coveragePct).toBe(100);
});

test("(d) header presente → prima riga scartata", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 3);
  const rows = ["timestamp,kWh", ...a.timestampsUtc.map((t) => `${iso(t)},2`)];
  const out = parseConsumptionCsv(rows.join("\n"), "h.csv", opts(a));
  expect(out.result.hourlyKwh.every((v) => Math.abs(v - 2) < 1e-9)).toBe(true);
  expect(out.result.meta.coveragePct).toBe(100);
});

test("(e) anno diverso dall'asse → allineato per MM-DD-HH", () => {
  const a = axis(Date.UTC(2023, 2, 10, 0), 24); // asse 2023
  const p = (n: number) => String(n).padStart(2, "0");
  const rows = Array.from({ length: 24 }, (_, h) => `2019-03-10 ${p(h)}:00,${h}`); // dati 2019, stesso MM-DD
  const out = parseConsumptionCsv(rows.join("\n"), "y.csv", opts(a));
  expect(out.result.meta.coveragePct).toBe(100);
  expect(out.result.hourlyKwh[5]).toBeCloseTo(5, 9);
});

test("(f) buco di un giorno → riempito con media profilo, coverage < 100", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 72); // 3 giorni feriali (mar-mer-gio)
  const p = (n: number) => String(n).padStart(2, "0");
  const rows: string[] = [];
  // giorni 3 e 5 gennaio presenti, giorno 4 (indici 24..47) mancante
  for (const day of [3, 5]) {
    for (let h = 0; h < 24; h++) rows.push(`2023-01-${p(day)} ${p(h)}:00,${h + (day === 3 ? 0 : 2)}`);
  }
  const out = parseConsumptionCsv(rows.join("\n"), "gap.csv", opts(a));
  expect(out.result.meta.coveragePct).toBeCloseTo(66.7, 1);
  // ora locale 5 del giorno mancante = media di (5) e (7) = 6
  expect(out.result.hourlyKwh[24 + 5]).toBeCloseTo(6, 6);
});

test("(g) copertura 30% → throw con la percentuale", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 10);
  const p = (n: number) => String(n).padStart(2, "0");
  const rows = [0, 1, 2].map((h) => `2023-01-03 ${p(h)}:00,1`); // 3/10 = 30%
  expect(() => parseConsumptionCsv(rows.join("\n"), "low.csv", opts(a))).toThrow(/30/);
});

test("(h) formato DD/MM/YYYY", () => {
  const a = axis(Date.UTC(2023, 4, 20, 0), 3);
  const rows = ["20/05/2023 00:00,3", "20/05/2023 01:00,3", "20/05/2023 02:00,3"];
  const out = parseConsumptionCsv(rows.join("\n"), "eu.csv", opts(a));
  expect(out.result.meta.coveragePct).toBe(100);
  expect(out.result.hourlyKwh[0]).toBeCloseTo(3, 9);
});

test("(i) riga malformata → warning e scartata, non throw", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 4);
  const rows = [
    "2023-01-03 00:00,1",
    "2023-01-03 01:00,abc", // valore non numerico
    "2023-01-03 02:00,1",
    "2023-01-03 03:00,1",
  ];
  const out = parseConsumptionCsv(rows.join("\n"), "bad.csv", opts(a));
  expect(out.warnings.length).toBeGreaterThan(0);
  expect(out.warnings.some((w) => w.toLowerCase().includes("scart"))).toBe(true);
  // 3/4 ore reali = 75%, l'ora 1 riempita dal profilo
  expect(out.result.meta.coveragePct).toBeCloseTo(75, 1);
});
