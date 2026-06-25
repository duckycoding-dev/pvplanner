import type { InverterSpec } from "./types.ts";

/** Inverter AC output ceiling (kW) — the clipping limit. */
export function inverterAcCapKw(inverter: InverterSpec): number {
  const grid = (inverter as { output_ac_grid?: { nominal_power_kw?: unknown } }).output_ac_grid;
  const v = grid?.nominal_power_kw;
  if (typeof v !== "number") {
    throw new Error("inverter spec: missing numeric output_ac_grid.nominal_power_kw");
  }
  return v;
}
