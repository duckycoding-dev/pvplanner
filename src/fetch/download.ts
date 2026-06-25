import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { PVGIS_TOOLS, type PvgisToolKey } from "../config/pvgisConventions.ts";
import { fromRoot } from "../paths.ts";
import type { ResolvedConfig } from "../config/schema.ts";
import { fetchJson, sleep } from "./pvgisClient.ts";
import { buildUrl, dailyParams, hourlyParams, monthlyParams, powerParams } from "./urlBuilder.ts";

export interface DownloadJob {
  toolKey: PvgisToolKey;
  tool: string;
  label: string;
  url: string;
  outPath: string;
}

/** Build the full list of download jobs (one per output file) for a system. */
export function buildJobs(cfg: ResolvedConfig): DownloadJob[] {
  const base = cfg.pvgis.base_url;
  const jobs: DownloadJob[] = [];

  for (const falda of cfg.resolvedFalde) {
    jobs.push({
      toolKey: "hourly",
      tool: PVGIS_TOOLS.hourly,
      label: `${falda.id} (az ${falda.azimuth}) hourly`,
      url: buildUrl(base, PVGIS_TOOLS.hourly, hourlyParams(cfg, falda)),
      outPath: `${falda.dataDir}/hourly.json`,
    });
    jobs.push({
      toolKey: "power",
      tool: PVGIS_TOOLS.power,
      label: `${falda.id} (az ${falda.azimuth}) power`,
      url: buildUrl(base, PVGIS_TOOLS.power, powerParams(cfg, falda)),
      outPath: `${falda.dataDir}/power.json`,
    });
    for (let month = 1; month <= 12; month++) {
      const nn = String(month).padStart(2, "0");
      jobs.push({
        toolKey: "daily",
        tool: PVGIS_TOOLS.daily,
        label: `${falda.id} (az ${falda.azimuth}) daily_${nn}`,
        url: buildUrl(base, PVGIS_TOOLS.daily, dailyParams(cfg, falda, month)),
        outPath: `${falda.dataDir}/daily_${nn}.json`,
      });
    }
  }

  jobs.push({
    toolKey: "monthly",
    tool: PVGIS_TOOLS.monthly,
    label: "generic monthly (az 0 reference)",
    url: buildUrl(base, PVGIS_TOOLS.monthly, monthlyParams(cfg)),
    outPath: fromRoot("data", "generic", "monthly.json"),
  });

  return jobs;
}

export interface RunOptions {
  write: boolean;
  dryRun: boolean;
  only?: Set<string>;
  delayMs?: number;
}

/** Execute the download jobs: dry-run prints URLs; write saves to data/. */
export async function runDownload(cfg: ResolvedConfig, opts: RunOptions): Promise<void> {
  const delayMs = opts.delayMs ?? 300;
  let jobs = buildJobs(cfg);
  if (opts.only && opts.only.size > 0) {
    jobs = jobs.filter((j) => opts.only!.has(j.toolKey));
  }

  for (const [i, job] of jobs.entries()) {
    if (opts.dryRun) {
      console.log(`[dry-run] ${job.label}\n  GET ${job.url}\n  -> ${job.outPath}`);
      continue;
    }
    const data = await fetchJson(job.url);
    if (opts.write) {
      await mkdir(dirname(job.outPath), { recursive: true });
      await Bun.write(job.outPath, JSON.stringify(data));
      console.log(`✓ wrote ${job.label} -> ${job.outPath}`);
    }
    if (i < jobs.length - 1) await sleep(delayMs);
  }
}
