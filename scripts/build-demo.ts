#!/usr/bin/env bun
/**
 * Build the committed demo dataset (Roma).
 *
 *   1. Load config.demo.json.
 *   2. Download the PVGIS data into data/demo/<azimuth>/ if not already present.
 *   3. Run the full production + battery-simulation analysis.
 *   4. Write web/viz.demo.json (the dataset the SPA ships with).
 *
 * Both web/viz.demo.json and data/demo/ are committed, so the app and tests
 * work on a fresh clone without any PVGIS calls.
 */
import { existsSync } from "node:fs";
import { fromRoot } from "../src/paths.ts";
import { loadConfig } from "../src/config/loadConfig.ts";
import { runDownload } from "../src/fetch/download.ts";
import { analyzeProduction } from "../src/app/analyzeProduction.ts";
import { analyzeSimulation } from "../src/app/analyzeSimulation.ts";
import { writeVizJson } from "../src/export/writeVizJson.ts";

const cfg = await loadConfig(fromRoot("config.demo.json"));

const missing = cfg.resolvedFalde.some(
  (f) => !existsSync(`${f.dataDir}/hourly.json`) || !existsSync(`${f.dataDir}/power.json`),
);

if (missing) {
  console.log("Downloading demo PVGIS data into data/demo/ ...\n");
  await runDownload(cfg, { write: true, dryRun: false });
  console.log("");
} else {
  console.log("Demo data already present — skipping download.\n");
}

const analysis = await analyzeProduction(cfg);
const sim = await analyzeSimulation(cfg, analysis);

const outPath = fromRoot("web", "viz.demo.json");
await writeVizJson(analysis, sim, cfg, outPath);

const a = analysis.result.combined.annual;
console.log(`Demo analysis — ${cfg.location.latitude}, ${cfg.location.longitude} (${analysis.result.year})`);
console.log(`  practical production : ${a.practicalKwh.toFixed(0)} kWh`);
console.log(`  consumption          : ${sim.consumption.annualKwh.toFixed(0)} kWh`);
console.log(`\nWrote ${outPath}`);
