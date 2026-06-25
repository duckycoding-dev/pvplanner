import { boolFlag, mountOutputToQuery, numParam, techOutputToQuery } from "../config/pvgisConventions.ts";
import type { QueryParams } from "./urlBuilder.ts";

/**
 * Inverse mapping: reconstruct the query params that are DERIVABLE from a PVGIS
 * output `inputs` block. Used to round-trip-validate urlBuilder against the
 * existing data files (output names differ from query names). Only the params
 * recorded in `inputs` are reconstructed; tool constants (pvcalculation,
 * components, fixed, global, ...) are asserted separately.
 */

function dig(root: unknown, keys: string[]): unknown {
  let cur: unknown = root;
  for (const k of keys) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function num(root: unknown, keys: string[]): number {
  const v = dig(root, keys);
  if (typeof v !== "number") throw new Error(`expected number at ${keys.join(".")}, got ${typeof v}`);
  return v;
}

function str(root: unknown, keys: string[]): string {
  const v = dig(root, keys);
  if (typeof v !== "string") throw new Error(`expected string at ${keys.join(".")}, got ${typeof v}`);
  return v;
}

function bool(root: unknown, keys: string[]): boolean {
  const v = dig(root, keys);
  if (typeof v !== "boolean") throw new Error(`expected boolean at ${keys.join(".")}, got ${typeof v}`);
  return v;
}

function commonFromInputs(inputs: unknown): QueryParams {
  return {
    lat: numParam(num(inputs, ["location", "latitude"])),
    lon: numParam(num(inputs, ["location", "longitude"])),
    raddatabase: str(inputs, ["meteo_data", "radiation_db"]),
    usehorizon: boolFlag(bool(inputs, ["meteo_data", "use_horizon"])),
  };
}

export function hourlyParamsFromFile(file: unknown): QueryParams {
  const inputs = dig(file, ["inputs"]);
  return {
    ...commonFromInputs(inputs),
    peakpower: numParam(num(inputs, ["pv_module", "peak_power"])),
    pvtechchoice: techOutputToQuery(str(inputs, ["pv_module", "technology"])),
    mountingplace: mountOutputToQuery(str(inputs, ["mounting_system", "fixed", "type"])),
    loss: numParam(num(inputs, ["pv_module", "system_loss"])),
    angle: numParam(num(inputs, ["mounting_system", "fixed", "slope", "value"])),
    aspect: numParam(num(inputs, ["mounting_system", "fixed", "azimuth", "value"])),
    startyear: numParam(num(inputs, ["meteo_data", "year_min"])),
    endyear: numParam(num(inputs, ["meteo_data", "year_max"])),
  };
}

export function powerParamsFromFile(file: unknown): QueryParams {
  const inputs = dig(file, ["inputs"]);
  // PVcalc does not send start/endyear (full DB range) -> not reconstructed here.
  return {
    ...commonFromInputs(inputs),
    peakpower: numParam(num(inputs, ["pv_module", "peak_power"])),
    pvtechchoice: techOutputToQuery(str(inputs, ["pv_module", "technology"])),
    mountingplace: mountOutputToQuery(str(inputs, ["mounting_system", "fixed", "type"])),
    loss: numParam(num(inputs, ["pv_module", "system_loss"])),
    angle: numParam(num(inputs, ["mounting_system", "fixed", "slope", "value"])),
    aspect: numParam(num(inputs, ["mounting_system", "fixed", "azimuth", "value"])),
  };
}

export function dailyParamsFromFile(file: unknown): QueryParams {
  const inputs = dig(file, ["inputs"]);
  return {
    ...commonFromInputs(inputs),
    angle: numParam(num(inputs, ["plane", "fixed", "slope", "value"])),
    aspect: numParam(num(inputs, ["plane", "fixed", "azimuth", "value"])),
  };
}

export function monthlyParamsFromFile(file: unknown): QueryParams {
  const inputs = dig(file, ["inputs"]);
  return {
    ...commonFromInputs(inputs),
    angle: numParam(num(inputs, ["plane", "fixed_inclined", "slope", "value"])),
    // MRcalc has no `aspect` param (South only); the file records azimuth 0 implicitly.
    startyear: numParam(num(inputs, ["meteo_data", "year_min"])),
    endyear: numParam(num(inputs, ["meteo_data", "year_max"])),
  };
}
