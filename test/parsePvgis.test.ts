import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/loadConfig.ts";
import { loadFaldaHourly } from "../src/io/loadFaldaHourly.ts";
import { loadPower } from "../src/io/loadPower.ts";
import { readJson } from "../src/io/readJson.ts";
import { parseFaldaHourly } from "../src/core/pvgis/parseHourly.ts";
import { parsePower } from "../src/core/pvgis/parsePower.ts";

const META = { id: "est", azimuth: -45, peakKwp: 5.115 };

/** Build a synthetic outputs.hourly array. All rows share `timeStr` (only the
 *  year matters for the row-count check); `pOverrides` sets P at given indices. */
function hourlyRows(count: number, timeStr: string, pOverrides: Record<number, number> = {}): unknown[] {
  const rows = new Array<unknown>(count);
  for (let i = 0; i < count; i++) {
    rows[i] = { time: timeStr, P: pOverrides[i] ?? 1000, T2m: 20, Int: 0 };
  }
  return rows;
}

// --- (a) golden equivalence with the fs loaders --------------------------------

test("parseFaldaHourly(readJson) deep-equals loadFaldaHourly for both falde", async () => {
  const cfg = await loadConfig();
  for (const falda of cfg.resolvedFalde) {
    const path = `${falda.dataDir}/hourly.json`;
    const file = await readJson(path);
    const meta = { id: falda.id, azimuth: falda.azimuth, peakKwp: falda.peakpower_kw };
    const { series } = parseFaldaHourly(file, meta, path);
    const golden = await loadFaldaHourly(falda);
    expect(series).toEqual(golden);
  }
});

test("parsePower(readJson) deep-equals loadPower for both falde", async () => {
  const cfg = await loadConfig();
  for (const falda of cfg.resolvedFalde) {
    const path = `${falda.dataDir}/power.json`;
    const file = await readJson(path);
    const series = parsePower(file, { id: falda.id, azimuth: falda.azimuth }, path);
    const golden = await loadPower(falda);
    expect(series).toEqual(golden);
  }
});

// --- (b) error / edge behavior -------------------------------------------------

test("parseFaldaHourly throws with sourceLabel when outputs.hourly is missing", () => {
  expect(() => parseFaldaHourly({ outputs: {} }, META, "MY_LABEL")).toThrow(/MY_LABEL/);
});

test("parseFaldaHourly throws on unexpected row count (9000)", () => {
  const file = { outputs: { hourly: hourlyRows(9000, "20190101:0010") } };
  expect(() => parseFaldaHourly(file, META, "MY_LABEL")).toThrow(/MY_LABEL/);
});

test("parseFaldaHourly accepts a single leap year (8784 rows)", () => {
  const file = { outputs: { hourly: hourlyRows(8784, "20200101:0010") } };
  expect(() => parseFaldaHourly(file, META, "x")).not.toThrow();
});

test("parseFaldaHourly accepts multi-year concat of consecutive years (8760 + 8784)", () => {
  // 2019 (non-leap, 8760) + 2020 (leap, 8784) = 17544
  const file = { outputs: { hourly: hourlyRows(8760 + 8784, "20190101:0010") } };
  const { series } = parseFaldaHourly(file, META, "x");
  expect(series.productionKwh.length).toBe(17544);
});

test("parseFaldaHourly clamps negative P to 0 and counts them", () => {
  const file = { outputs: { hourly: hourlyRows(8760, "20190101:0010", { 5: -500, 6: -100 }) } };
  const { series, negativesClamped } = parseFaldaHourly(file, META, "x");
  expect(negativesClamped).toBe(2);
  expect(series.productionKwh[5]).toBe(0);
  expect(series.productionKwh[6]).toBe(0);
});

test("parsePower throws with sourceLabel when monthly.fixed is missing", () => {
  expect(() => parsePower({ outputs: {} }, { id: "est", azimuth: -45 }, "MY_LABEL")).toThrow(/MY_LABEL/);
});
