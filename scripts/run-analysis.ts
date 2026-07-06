#!/usr/bin/env bun
import { loadConfig } from "../src/config/loadConfig.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { analyzeSimulation } from "../src/app/analyzeSimulation.ts";
import { writeProductionOutputs } from "../src/export/writeProductionOutputs.ts";
import { writeSimulationOutputs } from "../src/export/writeSimulationOutputs.ts";
import { writeVizJson } from "../src/export/writeVizJson.ts";

const configArg = process.argv.slice(2).find((a) => a.startsWith("--config="));
const configPath = configArg ? configArg.slice("--config=".length) : undefined;
const cfg = configPath ? await loadConfig(configPath) : await loadConfig();
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

// --- Battery simulation (consumption + with/without comparison) ---
const sim = await analyzeSimulation(cfg, analysis);
const cmp = sim.comparison;
const wo = cmp.withoutBattery.metrics;
const wb = cmp.withBattery.metrics;

console.log(`\nBattery simulation — load: ${sim.consumption.annualKwh.toFixed(0)} kWh (${sim.consumption.source})\n`);
console.log("  metric                  no-battery   with-battery");
console.log(`  self-consumption rate   ${(wo.selfConsumptionRate * 100).toFixed(1).padStart(8)}%   ${(wb.selfConsumptionRate * 100).toFixed(1).padStart(9)}%`);
console.log(`  self-sufficiency        ${(wo.selfSufficiency * 100).toFixed(1).padStart(8)}%   ${(wb.selfSufficiency * 100).toFixed(1).padStart(9)}%`);
console.log(`  import from grid (kWh)   ${wo.importKwh.toFixed(0).padStart(8)}    ${wb.importKwh.toFixed(0).padStart(8)}`);
console.log(`  export to grid (kWh)     ${wo.exportKwh.toFixed(0).padStart(8)}    ${wb.exportKwh.toFixed(0).padStart(8)}`);
console.log(`  battery cycles/yr        ${"-".padStart(8)}    ${(wb.battery?.equivalentCycles ?? 0).toFixed(0).padStart(8)}`);
console.log(`\n  Battery effect: +${cmp.delta.selfSufficiencyPoints.toFixed(1)} pts self-sufficiency, ` +
  `−${cmp.delta.importReductionKwh.toFixed(0)} kWh imported/yr (SoC converged in ${cmp.withBattery.convergencePasses} pass).`);

const writtenSim = await writeSimulationOutputs(sim, analysis);
const vizPath = await writeVizJson(analysis, sim, cfg);

console.log("\nWrote:");
for (const p of [...written, ...writtenSim, vizPath]) console.log(`  ${p}`);
