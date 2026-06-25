/**
 * PVGIS v5.3 conventions: tool names and the value transforms between a PVGIS
 * output `inputs` block and the corresponding query-string parameters.
 *
 * Param NAME mapping (output -> query) is documented in docs/01-downloader-pvgis.md
 * and applied in fetch/urlBuilder.ts. Here we only encode the VALUE transforms
 * that differ between the two representations.
 */

export const PVGIS_TOOLS = {
  hourly: "seriescalc",
  power: "PVcalc",
  daily: "DRcalc",
  monthly: "MRcalc",
} as const;

export type PvgisToolKey = keyof typeof PVGIS_TOOLS;

/** PV technology: output label -> query value (`pvtechchoice`). */
export const TECH_OUTPUT_TO_QUERY: Readonly<Record<string, string>> = {
  "c-Si": "crystSi",
  "c-Si2025": "crystSi2025",
  CIS: "CIS",
  CdTe: "CdTe",
  Unknown: "Unknown",
};

/** Mounting: output `type` -> query value (`mountingplace`). */
export const MOUNT_OUTPUT_TO_QUERY: Readonly<Record<string, string>> = {
  "building-integrated": "building",
  "free-standing": "free",
};

export function techOutputToQuery(outputTechnology: string): string {
  const q = TECH_OUTPUT_TO_QUERY[outputTechnology];
  if (q === undefined) throw new Error(`Unknown PV technology in data: "${outputTechnology}"`);
  return q;
}

export function mountOutputToQuery(outputType: string): string {
  const q = MOUNT_OUTPUT_TO_QUERY[outputType];
  if (q === undefined) throw new Error(`Unknown mounting type in data: "${outputType}"`);
  return q;
}

export function boolFlag(value: boolean): "1" | "0" {
  return value ? "1" : "0";
}

/** Format a number for a PVGIS query value (no locale, no trailing noise). */
export function numParam(value: number): string {
  return String(value);
}
