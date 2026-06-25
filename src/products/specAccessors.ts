import type { BatterySpec, InverterSpec } from "./types.ts";

/** Inverter AC output ceiling (kW) — the clipping limit. */
export function inverterAcCapKw(inverter: InverterSpec): number {
  const grid = (inverter as { output_ac_grid?: { nominal_power_kw?: unknown } }).output_ac_grid;
  const v = grid?.nominal_power_kw;
  if (typeof v !== "number") {
    throw new Error("inverter spec: missing numeric output_ac_grid.nominal_power_kw");
  }
  return v;
}

/** Inverter battery-port max charge/discharge power (kW). */
export function inverterBatteryPortKw(inverter: InverterSpec): number {
  const bi = (inverter as { battery_input?: { max_charge_discharge_power_kw?: unknown } }).battery_input;
  const v = bi?.max_charge_discharge_power_kw;
  if (typeof v !== "number") {
    throw new Error("inverter spec: missing numeric battery_input.max_charge_discharge_power_kw");
  }
  return v;
}

/** Battery usable energy (kWh). */
export function batteryUsableKwh(battery: BatterySpec): number {
  const v = (battery as { usable_energy_kwh?: unknown }).usable_energy_kwh;
  if (typeof v !== "number") {
    throw new Error("battery spec: missing numeric usable_energy_kwh");
  }
  return v;
}
