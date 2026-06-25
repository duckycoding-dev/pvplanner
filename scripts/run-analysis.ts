#!/usr/bin/env bun
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { writeProductionOutputs } from "../src/export/writeProductionOutputs.ts";

const cfg = await loadConfig();
const analysis = await analyzeProduction(cfg);
const { result } = analysis;
const a = result.combined.annual;

console.log(`Production analysis — year ${result.year} (${result.hoursInYear} h), AC cap ${result.acCapKw} kW\n`);
for (const f of result.falde) {
  console.log(
    `  ${f.id.padEnd(6)} (az ${String(f.azimuth).padStart(3)})  ${result.year}: ${f.annualKwh.toFixed(0)} kWh` +
      `   multi-year: ${f.multiyear.annualKwh.toFixed(0)} kWh`,
  );
}
console.log("");
console.log(`  Combined theoretical : ${a.theoreticalKwh.toFixed(1)} kWh`);
console.log(`  Combined practical   : ${a.practicalKwh.toFixed(1)} kWh (after ${result.acCapKw} kW AC cap)`);
console.log(`  Clipping loss        : ${a.clippingLossKwh.toFixed(1)} kWh (${a.clippingPct.toFixed(2)}%), ${a.clippedHours} h`);
console.log(`  Peak combined        : ${a.peakKw.toFixed(2)} kW`);
console.log("");

const written = await writeProductionOutputs(analysis);
console.log("Wrote:");
for (const p of written) console.log(`  ${p}`);
