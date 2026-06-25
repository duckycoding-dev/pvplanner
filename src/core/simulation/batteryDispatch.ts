import type { BatteryConfig } from "../types.ts";

export interface DispatchResult {
  charge: number; // AC energy taken from surplus into the battery
  discharge: number; // AC energy delivered from the battery to load
  newSoc: number;
  exportKwh: number;
  importKwh: number;
  battToLoad: number; // === discharge
}

/**
 * Greedy self-consumption dispatch for one hour (Δt = 1h).
 * Charge surplus, discharge to cover deficit; charge & discharge are mutually
 * exclusive within an hour. Efficiencies and the power cap are respected so SoC
 * stays in [0, usableKwh].
 */
export function dispatchHour(surplus: number, deficit: number, soc: number, batt: BatteryConfig): DispatchResult {
  let charge = 0;
  let discharge = 0;
  let exportKwh = 0;
  let importKwh = 0;
  let battToLoad = 0;
  let newSoc = soc;

  if (surplus > 0) {
    const roomAc = (batt.usableKwh - soc) / batt.chargeEff; // AC energy that fits
    charge = Math.min(surplus, batt.pMaxKw, Math.max(0, roomAc));
    newSoc = soc + charge * batt.chargeEff;
    exportKwh = surplus - charge;
  } else if (deficit > 0) {
    const availAc = soc * batt.dischargeEff; // AC energy the battery can deliver
    discharge = Math.min(deficit, batt.pMaxKw, Math.max(0, availAc));
    newSoc = soc - discharge / batt.dischargeEff;
    importKwh = deficit - discharge;
    battToLoad = discharge;
  }

  return { charge, discharge, newSoc, exportKwh, importKwh, battToLoad };
}
