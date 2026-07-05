import { readJson } from "../io/readJson.ts";
import type { ResolvedConfig } from "../config/schema.ts";
import { buildJobs, type DownloadJob } from "./download.ts";
import { fetchJson, sleep } from "./pvgisClient.ts";

export interface Diff {
  path: string;
  expected: unknown;
  actual: unknown;
}

const MAX_DIFFS = 50;

/** Relative tolerance for floating comparisons (PVGIS may vary in the last digits). */
function tol(expected: number): number {
  return 1e-6 + 1e-4 * Math.abs(expected);
}

/** Deep-compare two parsed JSON values; numbers within tolerance, the rest exact. */
export function numericDeepDiff(actual: unknown, expected: unknown, path = "", out: Diff[] = []): Diff[] {
  if (out.length >= MAX_DIFFS) return out;

  if (typeof expected === "number") {
    if (typeof actual !== "number" || Math.abs(actual - expected) > tol(expected)) {
      out.push({ path, expected, actual });
    }
    return out;
  }
  if (expected === null || typeof expected === "string" || typeof expected === "boolean") {
    if (actual !== expected) out.push({ path, expected, actual });
    return out;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      out.push({ path, expected: `array[${expected.length}]`, actual: typeof actual });
      return out;
    }
    if (actual.length !== expected.length) {
      out.push({ path: `${path}.length`, expected: expected.length, actual: actual.length });
    }
    const n = Math.min(actual.length, expected.length);
    for (let i = 0; i < n; i++) {
      numericDeepDiff(actual[i], expected[i], `${path}[${i}]`, out);
      if (out.length >= MAX_DIFFS) break;
    }
    return out;
  }
  if (typeof expected === "object") {
    if (typeof actual !== "object" || actual === null || Array.isArray(actual)) {
      out.push({ path, expected: "object", actual: actual === null ? "null" : typeof actual });
      return out;
    }
    const e = expected as Record<string, unknown>;
    const a = actual as Record<string, unknown>;
    for (const k of Object.keys(e)) {
      numericDeepDiff(a[k], e[k], path ? `${path}.${k}` : k, out);
      if (out.length >= MAX_DIFFS) break;
    }
    return out;
  }
  return out;
}

/** Human-readable headline metric per tool (sanity check shown alongside PASS/FAIL). */
function headline(job: DownloadJob, data: unknown): string {
  const outputs = (data as { outputs?: unknown }).outputs;
  if (job.toolKey === "hourly") {
    const hourly = (outputs as { hourly?: Array<{ P?: number }> })?.hourly;
    if (Array.isArray(hourly)) {
      const sum = hourly.reduce((s, r) => s + (typeof r.P === "number" ? r.P : 0), 0);
      return `ΣP = ${(sum / 1000).toFixed(1)} kWh, rows = ${hourly.length}`;
    }
  }
  if (job.toolKey === "power") {
    const ey = (outputs as { totals?: { fixed?: { E_y?: number } } })?.totals?.fixed?.E_y;
    if (typeof ey === "number") return `E_y = ${ey.toFixed(1)} kWh`;
  }
  return "";
}

export interface ValidationOutcome {
  job: DownloadJob;
  pass: boolean;
  diffs: Diff[];
  note: string;
}

export interface ValidateOptions {
  delayMs?: number;
  only?: Set<string>;
}

/** Fetch each file fresh and diff it against the existing on-disk baseline. Non-destructive. */
export async function validateDownload(cfg: ResolvedConfig, opts: ValidateOptions = {}): Promise<ValidationOutcome[]> {
  const delayMs = opts.delayMs ?? 300;
  let jobs = buildJobs(cfg);
  if (opts.only && opts.only.size > 0) jobs = jobs.filter((j) => opts.only!.has(j.toolKey));

  const outcomes: ValidationOutcome[] = [];
  for (const [i, job] of jobs.entries()) {
    let expected: unknown;
    try {
      expected = await readJson(job.outPath);
    } catch {
      outcomes.push({ job, pass: false, diffs: [], note: "no baseline file to diff against" });
      if (i < jobs.length - 1) await sleep(delayMs);
      continue;
    }
    const actual = await fetchJson(job.url);
    const diffs = numericDeepDiff(actual, expected, "");
    outcomes.push({ job, pass: diffs.length === 0, diffs, note: headline(job, actual) });
    if (i < jobs.length - 1) await sleep(delayMs);
  }
  return outcomes;
}
