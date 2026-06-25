import type { ConsumptionSeries } from "../types.ts";
import type { ConsumptionContext } from "./ConsumptionSource.ts";

/**
 * Synthetic placeholder load for a heat-pump-heated household (winter-heavy).
 * Heating ∝ heating-degree-hours / COP from the site's T2m; plus a flatter base
 * load with morning/evening peaks. Scaled to an annual target. Replace with real
 * data when available.
 */

const HEATING_SHARE = 0.65;
const BASE_SHARE = 0.35;
const T_BASE_C = 16; // heating threshold
const CET_OFFSET_HOURS = 1; // approx local hour for daily shape (DST ignored — placeholder)
const DEFAULT_ANNUAL_KWH = 7000;

// Dimensionless daily weights by local hour (0..23).
const BASE_DAILY = [
  0.5, 0.45, 0.4, 0.4, 0.45, 0.6, 0.9, 1.2, 1.1, 0.9, 0.85, 0.9,
  1.0, 0.9, 0.8, 0.85, 1.0, 1.3, 1.6, 1.6, 1.4, 1.1, 0.8, 0.6,
];
const HEAT_DAILY = [
  1.1, 1.1, 1.1, 1.1, 1.15, 1.25, 1.3, 1.25, 1.0, 0.85, 0.8, 0.8,
  0.8, 0.8, 0.85, 0.9, 1.0, 1.15, 1.2, 1.2, 1.15, 1.1, 1.1, 1.1,
];

function cop(t: number): number {
  return Math.min(4.5, Math.max(1.8, 2.0 + 0.08 * t));
}

function localHour(tsUtc: number): number {
  const h = new Date(tsUtc).getUTCHours() + CET_OFFSET_HOURS;
  return ((h % 24) + 24) % 24;
}

function sum(xs: ReadonlyArray<number>): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

export function syntheticHeatPumpLoad(ctx: ConsumptionContext): ConsumptionSeries {
  const n = ctx.timestampsUtc.length;
  const target = ctx.annualKwhTarget ?? DEFAULT_ANNUAL_KWH;

  const rawBase = new Array<number>(n);
  const rawHeat = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const lh = localHour(ctx.timestampsUtc[i]!);
    const t = ctx.t2m[i] ?? T_BASE_C;
    rawBase[i] = BASE_DAILY[lh]!;
    const hdh = Math.max(0, T_BASE_C - t);
    rawHeat[i] = (hdh / cop(t)) * HEAT_DAILY[lh]!;
  }

  const baseScale = (target * BASE_SHARE) / (sum(rawBase) || 1);
  const heatScale = (target * HEATING_SHARE) / (sum(rawHeat) || 1);

  const loadKwh = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    loadKwh[i] = rawBase[i]! * baseScale + rawHeat[i]! * heatScale;
  }

  return {
    loadKwh,
    months: ctx.months,
    annualKwh: sum(loadKwh),
    source: "synthetic-heat-pump-placeholder",
    notes: [
      `Profilo sintetico segnaposto: ${Math.round(HEATING_SHARE * 100)}% riscaldamento (pompa di calore, HDH/COP su T2m) + ${Math.round(BASE_SHARE * 100)}% base, scalato a ${target} kWh/anno.`,
      "Ora locale approssimata (CET, no DST) per la sagoma giornaliera. Da sostituire con dati reali.",
    ],
  };
}
