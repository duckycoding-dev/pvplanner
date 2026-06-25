import { mkdir } from "node:fs/promises";
import { fromRoot } from "../paths.ts";
import { MONTHS } from "../core/units.ts";
import type { ProductionAnalysis } from "../app/analyzeProduction.ts";
import { toCsv, type CsvCell } from "./toCsv.ts";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Write production.json + summary/monthly/hourly CSVs to outDir. Returns written paths. */
export async function writeProductionOutputs(
  analysis: ProductionAnalysis,
  outDir = fromRoot("output"),
): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const { result, hourly } = analysis;
  const written: string[] = [];

  // 1) production.json — analytical summary (without the big hourly arrays).
  const jsonObj = {
    year: result.year,
    hoursInYear: result.hoursInYear,
    acCapKw: result.acCapKw,
    falde: result.falde,
    combined: {
      annual: result.combined.annual,
      monthly: result.combined.monthly,
      multiyear: result.combined.multiyear,
    },
    notes: result.notes,
  };
  const jsonPath = `${outDir}/production.json`;
  await Bun.write(jsonPath, JSON.stringify(jsonObj, null, 2));
  written.push(jsonPath);

  // 2) production_summary.csv — metric,value
  const a = result.combined.annual;
  const summaryRows: CsvCell[][] = [
    ["year", result.year],
    ["hours_in_year", result.hoursInYear],
    ["ac_cap_kw", result.acCapKw],
  ];
  for (const f of result.falde) {
    summaryRows.push([`${f.id}_peak_kwp`, f.peakKwp]);
    summaryRows.push([`${f.id}_annual_kwh_${result.year}`, round2(f.annualKwh)]);
    summaryRows.push([`${f.id}_annual_kwh_multiyear`, round2(f.multiyear.annualKwh)]);
  }
  summaryRows.push(
    [`combined_theoretical_kwh_${result.year}`, round2(a.theoreticalKwh)],
    [`combined_practical_kwh_${result.year}`, round2(a.practicalKwh)],
    [`combined_clipping_kwh_${result.year}`, round2(a.clippingLossKwh)],
    ["combined_clipping_pct", round2(a.clippingPct)],
    ["combined_clipped_hours", a.clippedHours],
    ["combined_peak_kw", round2(a.peakKw)],
    ["combined_multiyear_kwh", round2(result.combined.multiyear.annualKwh)],
  );
  const summaryPath = `${outDir}/production_summary.csv`;
  await Bun.write(summaryPath, toCsv(["metric", "value"], summaryRows));
  written.push(summaryPath);

  // 3) production_monthly.csv — one row per month
  const monthlyHeaders = [
    "month",
    ...result.falde.map((f) => `${f.id}_kwh_${result.year}`),
    "combined_theoretical_kwh",
    "combined_practical_kwh",
    "combined_clipping_kwh",
    ...result.falde.map((f) => `${f.id}_kwh_multiyear`),
    "combined_multiyear_kwh",
  ];
  const monthlyRows: CsvCell[][] = [];
  for (let k = 0; k < MONTHS; k++) {
    const mc = result.combined.monthly[k]!;
    monthlyRows.push([
      k + 1,
      ...result.falde.map((f) => round2(f.monthlyKwh[k] ?? 0)),
      round2(mc.theoreticalKwh),
      round2(mc.practicalKwh),
      round2(mc.clippingLossKwh),
      ...result.falde.map((f) => round2(f.multiyear.monthlyKwh[k] ?? 0)),
      round2(result.combined.multiyear.monthlyKwh[k] ?? 0),
    ]);
  }
  const monthlyPath = `${outDir}/production_monthly.csv`;
  await Bun.write(monthlyPath, toCsv(monthlyHeaders, monthlyRows));
  written.push(monthlyPath);

  // 4) production_hourly.csv — 8760 rows (UTC timestamp + per-falda + combined)
  const ts = hourly[0]?.timestampsUtc ?? [];
  const ch = result.combined.hourly;
  const hourlyHeaders = [
    "timestamp_utc",
    ...hourly.map((h) => `${h.id}_kwh`),
    "theoretical_kwh",
    "practical_kwh",
    "clipping_kwh",
  ];
  const hourlyRows: CsvCell[][] = [];
  for (let i = 0; i < ts.length; i++) {
    hourlyRows.push([
      new Date(ts[i]!).toISOString(),
      ...hourly.map((h) => round2(h.productionKwh[i] ?? 0)),
      round2(ch.theoreticalKwh[i] ?? 0),
      round2(ch.practicalKwh[i] ?? 0),
      round2(ch.clippingLossKwh[i] ?? 0),
    ]);
  }
  const hourlyPath = `${outDir}/production_hourly.csv`;
  await Bun.write(hourlyPath, toCsv(hourlyHeaders, hourlyRows));
  written.push(hourlyPath);

  return written;
}
