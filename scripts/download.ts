#!/usr/bin/env bun
import { loadConfig } from "../src/config/loadConfig.ts";
import { runDownload } from "../src/fetch/download.ts";
import { validateDownload } from "../src/fetch/validateDownload.ts";

function fmt(v: unknown): string {
  return typeof v === "number" ? String(v) : JSON.stringify(v);
}

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  let only: Set<string> | undefined;
  let delayMs: number | undefined;
  let configPath: string | undefined;
  for (const a of argv) {
    if (a === "--validate" || a === "--dry-run" || a === "--write") flags.add(a);
    else if (a.startsWith("--only=")) {
      only = new Set(a.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean));
    } else if (a.startsWith("--delay=")) {
      delayMs = Number(a.slice("--delay=".length));
    } else if (a.startsWith("--config=")) {
      configPath = a.slice("--config=".length);
    } else {
      console.error(`Unknown argument: ${a}`);
      console.error("Usage: bun scripts/download.ts [--validate|--dry-run|--write] [--only=hourly,power] [--delay=ms] [--config=PATH]");
      process.exit(2);
    }
  }
  return { flags, only, delayMs, configPath };
}

const { flags, only, delayMs, configPath } = parseArgs(process.argv.slice(2));
const cfg = configPath ? await loadConfig(configPath) : await loadConfig();

const mode = flags.has("--write") ? "write" : flags.has("--dry-run") ? "dry-run" : "validate";

if (mode === "validate") {
  console.log("PVGIS download validation — non-destructive (fetch fresh, diff vs existing data/)\n");
  const outcomes = await validateDownload(cfg, { only, delayMs });
  let failed = 0;
  for (const o of outcomes) {
    console.log(`[${o.pass ? "PASS" : "FAIL"}] ${o.job.label}${o.note ? `  (${o.note})` : ""}`);
    if (!o.pass) {
      failed++;
      if (o.diffs.length === 0 && o.note) console.log(`    ${o.note}`);
      for (const d of o.diffs.slice(0, 8)) {
        console.log(`    diff @ ${d.path}: expected ${fmt(d.expected)} got ${fmt(d.actual)}`);
      }
      if (o.diffs.length > 8) console.log(`    ... +${o.diffs.length - 8} more diffs`);
    }
  }
  console.log(`\n${outcomes.length - failed}/${outcomes.length} PASS`);
  process.exit(failed === 0 ? 0 : 1);
} else if (mode === "dry-run") {
  await runDownload(cfg, { write: false, dryRun: true, only, delayMs });
} else {
  console.log("Downloading PVGIS data into data/ (OVERWRITES existing files)\n");
  await runDownload(cfg, { write: true, dryRun: false, only, delayMs });
  console.log("\nDone.");
}
