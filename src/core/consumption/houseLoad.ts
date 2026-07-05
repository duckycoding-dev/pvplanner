import type { ConsumptionSeries } from "../types.ts";
import type { ConsumptionContext } from "./ConsumptionSource.ts";
import { localHourWeekday } from "../time/localTime.ts";

/**
 * Physically-grounded synthetic load for a heat-pump house with a thermal buffer.
 *
 * Heating: annual thermal demand = area × specific demand, distributed hour-by-hour
 * ∝ heating-degree-hours from the site's real T2m, divided by an outdoor-temperature
 * COP curve (anchored to the datasheet), then rescaled so the seasonal efficiency
 * equals the heat pump's SCOP. The thermal buffer is modelled as a few-hour smoothing
 * of the heating draw plus small standby losses. DHW = per-person thermal / DHW COP,
 * in morning/evening blocks (tank-in-tank). Base load = appliances/lighting with a
 * weekday/weekend shape, with a daytime plateau for any work-from-home occupant.
 *
 * Pure: no fs/network/Date.now. Day-of-week and local hour are DST-correct for ctx.timeZone.
 */
export interface HouseParams {
  heatedAreaM2: number;
  specificHeatDemandKwhM2y: number; // thermal kWh per m² per year
  heatingBaseTempC: number; // HDH base temperature
  occupants: number;
  wfhOccupants: number; // occupants home during weekdays
  heatPumpScop: number; // seasonal COP (sets heating electric magnitude)
  copRef: number; // COP at copRefOutdoorC and the flow temperature
  copRefOutdoorC: number;
  flowTempC: number; // heating water flow temperature
  dhwCop: number;
  dhwKwhPerPersonY: number; // thermal
  baseLoadAnnualKwh: number;
  standbyLossPct: number; // tank standby losses, on heating+DHW thermal
  bufferSmoothingHours: number; // thermal-buffer inertia window for heating
}

export const HOUSE_DEFAULTS: HouseParams = {
  heatedAreaM2: 250,
  specificHeatDemandKwhM2y: 90,
  heatingBaseTempC: 16,
  occupants: 2,
  wfhOccupants: 0,
  heatPumpScop: 4.84,
  copRef: 4.5,
  copRefOutdoorC: 7,
  flowTempC: 35,
  dhwCop: 2.8,
  dhwKwhPerPersonY: 700,
  baseLoadAnnualKwh: 3000,
  standbyLossPct: 4,
  bufferSmoothingHours: 3,
};

// Dimensionless hourly weights (local hour 0..23).
const BASE_WEEKDAY = [
  0.4, 0.35, 0.35, 0.35, 0.4, 0.6, 1.0, 1.3, 1.0, 0.8, 0.8, 0.9,
  1.1, 1.0, 0.8, 0.8, 0.9, 1.2, 1.6, 1.6, 1.4, 1.1, 0.8, 0.5,
];
const BASE_WEEKEND = [
  0.45, 0.4, 0.35, 0.35, 0.4, 0.5, 0.7, 0.9, 1.1, 1.2, 1.2, 1.3,
  1.5, 1.3, 1.1, 1.0, 1.1, 1.3, 1.55, 1.5, 1.35, 1.1, 0.85, 0.55,
];
// Extra weekday daytime load per work-from-home occupant (laptop, lunch on induction…).
const WFH_DAYTIME = [
  0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.5, 0.5, 0.5,
  0.8, 0.6, 0.5, 0.5, 0.4, 0.2, 0, 0, 0, 0, 0, 0,
];
// DHW reheat blocks (morning + evening), small trickle otherwise.
const DHW_DAILY = [
  0.1, 0.1, 0.1, 0.1, 0.15, 0.6, 1.3, 1.4, 0.8, 0.3, 0.2, 0.2,
  0.3, 0.25, 0.2, 0.2, 0.3, 0.7, 1.4, 1.5, 1.1, 0.6, 0.3, 0.15,
];

function sum(xs: ReadonlyArray<number>): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}
function scaleToTotal(arr: number[], total: number): void {
  const s = sum(arr) || 1;
  const k = total / s;
  for (let i = 0; i < arr.length; i++) arr[i] = arr[i]! * k;
}
/** Centered moving average that preserves the series total (buffer inertia). */
function smoothPreserving(arr: number[], window: number): number[] {
  if (window <= 1) return arr.slice();
  const half = Math.floor(window / 2);
  const out = new Array<number>(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let s = 0;
    let c = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < arr.length) {
        s += arr[j]!;
        c++;
      }
    }
    out[i] = s / c;
  }
  scaleToTotal(out, sum(arr));
  return out;
}

export function syntheticHouseLoad(ctx: ConsumptionContext, p: HouseParams): ConsumptionSeries {
  const n = ctx.timestampsUtc.length;
  const standby = 1 + p.standbyLossPct / 100;

  const local = ctx.timestampsUtc.map((t) => localHourWeekday(t, ctx.timeZone));

  // COP(outdoor) curve: Carnot shape anchored to the datasheet point (copRef @ copRefOutdoorC).
  const tHotK = p.flowTempC + 3 + 273.15; // condenser ≈ flow + small approach
  const carnot = (toutC: number): number => {
    const tInK = toutC + 273.15;
    return tInK >= tHotK - 1 ? 60 : tHotK / (tHotK - tInK);
  };
  const eta = p.copRef / carnot(p.copRefOutdoorC);
  const cop = (toutC: number): number => Math.min(5.5, Math.max(1.5, eta * carnot(toutC)));

  // --- Heating: HDH distribution / COP curve, magnitude set by SCOP ---
  const heatThermalTotal = p.heatedAreaM2 * p.specificHeatDemandKwhM2y * standby;
  const hdh = new Array<number>(n);
  let hdhSum = 0;
  for (let i = 0; i < n; i++) {
    const t = ctx.t2m[i] ?? p.heatingBaseTempC;
    hdh[i] = Math.max(0, p.heatingBaseTempC - t);
    hdhSum += hdh[i]!;
  }
  const heatElec = new Array<number>(n).fill(0);
  if (hdhSum > 0) {
    for (let i = 0; i < n; i++) {
      const thermal = (heatThermalTotal * hdh[i]!) / hdhSum;
      heatElec[i] = thermal / cop(ctx.t2m[i] ?? p.heatingBaseTempC);
    }
    scaleToTotal(heatElec, heatThermalTotal / p.heatPumpScop); // seasonal efficiency = SCOP
  }
  const heatSmoothed = smoothPreserving(heatElec, p.bufferSmoothingHours);

  // --- DHW: per-person thermal / DHW COP, morning+evening blocks ---
  const dhwElecTotal = (p.occupants * p.dhwKwhPerPersonY * standby) / p.dhwCop;
  const dhw = new Array<number>(n);
  for (let i = 0; i < n; i++) dhw[i] = DHW_DAILY[local[i]!.hour]!;
  scaleToTotal(dhw, dhwElecTotal);

  // --- Base load: weekday/weekend shape + work-from-home daytime plateau ---
  const base = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const lh = local[i]!.hour;
    const weekend = local[i]!.weekday >= 5;
    base[i] = weekend ? BASE_WEEKEND[lh]! : BASE_WEEKDAY[lh]! + p.wfhOccupants * WFH_DAYTIME[lh]!;
  }
  scaleToTotal(base, p.baseLoadAnnualKwh);

  const loadKwh = new Array<number>(n);
  for (let i = 0; i < n; i++) loadKwh[i] = heatSmoothed[i]! + dhw[i]! + base[i]!;

  const heatTot = Math.round(sum(heatSmoothed));
  const dhwTot = Math.round(sum(dhw));
  const baseTot = Math.round(sum(base));
  return {
    loadKwh,
    months: ctx.months,
    annualKwh: sum(loadKwh),
    source: "synthetic-house",
    notes: [
      `Profilo sintetico V2 (PDC + puffer): riscaldamento ${heatTot} + ACS ${dhwTot} + base ${baseTot} = ${Math.round(
        sum(loadKwh),
      )} kWh/anno elettrici.`,
      `Riscaldamento: ${Math.round(heatThermalTotal)} kWh termici (${p.heatedAreaM2} m² × ${p.specificHeatDemandKwhM2y} kWh/m²·anno, +${p.standbyLossPct}% perdite accumulo) a SCOP ${p.heatPumpScop}, distribuito sui gradi-ora reali del sito; puffer = smoothing ${p.bufferSmoothingHours} h.`,
      `ACS: ${p.occupants} persone × ${p.dhwKwhPerPersonY} kWh term a COP ${p.dhwCop}; base ${p.baseLoadAnnualKwh} kWh (${p.wfhOccupants} in smart-working → plateau diurno feriale).`,
      "Caldaia a gas (backup giorni più freddi) non modellata: l'elettrico è quindi prudenziale (un filo alto).",
    ],
  };
}
