import { expect, test } from "bun:test";
import { detectEDistribuzione, parseEDistribuzione } from "../src/core/consumption/parseEDistribuzione.ts";
import type { CsvParseOptions } from "../src/core/consumption/parseCsv.ts";

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
function opts(a: { timestampsUtc: number[]; months: number[] }): CsvParseOptions {
  return { timeZone: "UTC", timestampsUtc: a.timestampsUtc, months: a.months };
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** Header wide: "Giorno" + 96 colonne quarto-orarie 00:00-00:15 … */
function quarterHeaders(): string {
  const cols: string[] = ["Giorno"];
  for (let q = 0; q < 96; q++) {
    const startMin = q * 15;
    const endMin = startMin + 15;
    const hh = p2(Math.floor(startMin / 60));
    const mm = p2(startMin % 60);
    const eh = p2(Math.floor(endMin / 60) % 24);
    const em = p2(endMin % 60);
    cols.push(`${hh}:${mm}-${eh}:${em}`);
  }
  return cols.join(";");
}

function wideFixture(days: number[]): string {
  const lines = ["POD;IT001E12345678", quarterHeaders()];
  for (const d of days) {
    lines.push(`03/01/2023`.replace("03", p2(d)) + ";" + new Array(96).fill("0,25").join(";"));
  }
  return lines.join("\n");
}

function longFixture(days: number[]): string {
  const lines = ["POD;IT001E12345678", "Data;Ora;Consumo"];
  for (const d of days) {
    for (let h = 0; h < 24; h++) lines.push(`${p2(d)}/01/2023;${p2(h)}:00;1,0`);
  }
  return lines.join("\n");
}

test("detect: wide con POD + Giorno + colonne orarie → true", () => {
  expect(detectEDistribuzione(wideFixture([3]))).toBe(true);
});

test("detect: long con POD + curva → true", () => {
  expect(detectEDistribuzione("POD;IT001E123\nCurva di carico\nData;Ora;Consumo\n03/01/2023;00:00;1,0")).toBe(true);
});

test("detect: CSV generico (timestamp,kWh) → false", () => {
  expect(detectEDistribuzione("timestamp,kWh\n2023-01-03 00:00,1\n2023-01-03 01:00,2")).toBe(false);
});

test("detect: file senza POD → false (conservativo)", () => {
  expect(detectEDistribuzione("Giorno;00:00-00:15\n03/01/2023;0,25")).toBe(false);
});

test("wide: somma dei 96 quarti in 24 ore, virgola decimale", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 72); // 3 giorni
  const out = parseEDistribuzione(wideFixture([3, 4, 5]), "edist.csv", opts(a));
  expect(out.result.meta.coveragePct).toBe(100);
  expect(out.result.meta.source).toBe("csv");
  // ogni ora = 4 × 0,25 = 1,0
  for (const v of out.result.hourlyKwh) expect(v).toBeCloseTo(1.0, 9);
  expect(out.result.meta.annualKwh).toBeCloseTo(72, 6);
});

test("wide: celle vuote non fanno scalare i quarti (ora vuota = buco, le altre restano allineate)", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 72); // 3 giorni
  // Giorno 3: ora 2 interamente vuota (4 celle), ora 5 con un quarto vuoto su 4.
  const quarters = new Array<string>(96).fill("0,25");
  for (let q = 2 * 4; q < 3 * 4; q++) quarters[q] = "";
  quarters[5 * 4] = "";
  const lines = ["POD;IT001E12345678", quarterHeaders(), "03/01/2023;" + quarters.join(";")];
  for (const d of [4, 5]) lines.push(`${p2(d)}/01/2023;` + new Array(96).fill("0,25").join(";"));
  const out = parseEDistribuzione(lines.join("\n"), "edist-buchi.csv", opts(a));

  // Ora 2 del giorno 3 = buco reale → copertura 71/72.
  expect(out.result.meta.coveragePct).toBeCloseTo((71 / 72) * 100, 1);
  // Ora 5 = 3 quarti presenti (0,75), con warning; ore successive NON scalate (1,0).
  expect(out.result.hourlyKwh[5]).toBeCloseTo(0.75, 9);
  for (let h = 6; h < 24; h++) expect(out.result.hourlyKwh[h]).toBeCloseTo(1.0, 9);
  expect(out.warnings.some((w) => w.includes("quarti mancanti"))).toBe(true);
  // Il buco (ora 2) è riempito dal profilo dei dati presenti, non lasciato NaN.
  expect(Number.isFinite(out.result.hourlyKwh[2]!)).toBe(true);
});

test("long: Data;Ora;Consumo → ora corretta", () => {
  const a = axis(Date.UTC(2023, 0, 3, 0), 72);
  const out = parseEDistribuzione(longFixture([3, 4, 5]), "edist-long.csv", opts(a));
  expect(out.result.meta.coveragePct).toBe(100);
  for (const v of out.result.hourlyKwh) expect(v).toBeCloseTo(1.0, 9);
});
