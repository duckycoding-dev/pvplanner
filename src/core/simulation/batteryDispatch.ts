import type { BatteryConfig } from "../types.ts";

export interface DispatchHourDcOptions {
  /** Clipped PV energy available for DC-side charging this hour (kWh). */
  clipAvailKwh: number;
  /** Remaining inverter AC output headroom for discharge (kW); Infinity for AC coupling. */
  dischargeHeadroomKw: number;
}

export interface DispatchResult {
  charge: number; // energy taken into the battery (AC surplus + recovered clip)
  discharge: number; // AC energy delivered from the battery to load
  newSoc: number;
  exportKwh: number;
  importKwh: number;
  battToLoad: number; // === discharge
  recoveredClipKwh: number; // part of `charge` drawn from otherwise-clipped energy (DC coupling)
}

/**
 * Greedy self-consumption dispatch for one hour (Δt = 1h).
 * Charge surplus (plus, with DC coupling, clipped energy), discharge to cover
 * deficit; charge & discharge are mutually exclusive within an hour. With DC
 * coupling the discharge shares the inverter's AC cap with PV output, and the
 * rare clip+deficit hour (load above the AC cap) charges from clip while the
 * grid covers the deficit — the saturated inverter forbids discharging anyway.
 */
export function dispatchHour(
  surplus: number,
  deficit: number,
  soc: number,
  batt: BatteryConfig,
  dc?: DispatchHourDcOptions,
): DispatchResult {
  let charge = 0;
  let discharge = 0;
  let exportKwh = 0;
  let importKwh = 0;
  let battToLoad = 0;
  let recoveredClipKwh = 0;
  let newSoc = soc;
  const clipAvail = dc?.clipAvailKwh ?? 0;

  if (surplus > 0 || clipAvail > 0) {
    const roomAc = (batt.usableKwh - soc) / batt.chargeEff; // energy that fits
    charge = Math.min(surplus + clipAvail, batt.pMaxKw, Math.max(0, roomAc));
    recoveredClipKwh = Math.min(charge, clipAvail); // clip first: it is otherwise lost
    newSoc = soc + charge * batt.chargeEff;
    exportKwh = Math.max(0, surplus - (charge - recoveredClipKwh));
    importKwh = deficit; // > 0 only in the rare clip+deficit hour
  } else if (deficit > 0) {
    const headroom = dc?.dischargeHeadroomKw ?? Number.POSITIVE_INFINITY;
    const availAc = soc * batt.dischargeEff; // AC energy the battery can deliver
    discharge = Math.min(deficit, batt.pMaxKw, Math.max(0, availAc), Math.max(0, headroom));
    newSoc = soc - discharge / batt.dischargeEff;
    importKwh = deficit - discharge;
    battToLoad = discharge;
  }

  return { charge, discharge, newSoc, exportKwh, importKwh, battToLoad, recoveredClipKwh };
}
