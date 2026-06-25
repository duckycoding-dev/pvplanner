import { MONTHS } from "../units.ts";
import type {
  CombinedProduction,
  FaldaProduction,
  HourlySeries,
  MonthlyCombined,
  PowerSeries,
  ProductionResult,
} from "../types.ts";
import { combineProduction } from "./combine.ts";
import { applyAcCap } from "./clipping.ts";

const CLIP_EPS = 1e-9;

export interface BuildProductionInput {
  hourly: HourlySeries[];
  power: PowerSeries[];
  acCapKw: number;
  year: number;
}

function sum(xs: ReadonlyArray<number>): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

/** Aggregate an hourly series into 12 monthly totals using the per-row month. */
function monthlyTotals(values: ReadonlyArray<number>, months: ReadonlyArray<number>): number[] {
  const out = new Array<number>(MONTHS).fill(0);
  for (let i = 0; i < values.length; i++) {
    const m = months[i];
    if (m === undefined || m < 1 || m > MONTHS) continue;
    out[m - 1] = (out[m - 1] ?? 0) + (values[i] ?? 0);
  }
  return out;
}

/**
 * Build the full production model from per-falda hourly + multi-year series.
 * Pure: takes already-loaded data, returns a structured result.
 */
export function buildProductionSeries(input: BuildProductionInput): ProductionResult {
  const { hourly, power, acCapKw, year } = input;
  if (hourly.length === 0) throw new Error("buildProductionSeries: no hourly falde provided");

  const n = hourly[0]!.productionKwh.length;
  for (const h of hourly) {
    if (h.productionKwh.length !== n) {
      throw new Error(`buildProductionSeries: falda "${h.id}" has ${h.productionKwh.length} rows, expected ${n}`);
    }
  }
  const months = hourly[0]!.months;
  const powerById = new Map(power.map((p) => [p.id, p]));

  const falde: FaldaProduction[] = hourly.map((h) => {
    const pw = powerById.get(h.id);
    return {
      id: h.id,
      azimuth: h.azimuth,
      peakKwp: h.peakKwp,
      annualKwh: sum(h.productionKwh),
      monthlyKwh: monthlyTotals(h.productionKwh, h.months),
      multiyear: {
        annualKwh: pw?.annualKwh ?? 0,
        monthlyKwh: pw ? [...pw.monthlyKwh] : new Array<number>(MONTHS).fill(0),
        yearMin: pw?.yearMin ?? 0,
        yearMax: pw?.yearMax ?? 0,
      },
    };
  });

  // Combined (theoretical) then inverter AC clipping.
  const theoreticalKwh = combineProduction(hourly.map((h) => h.productionKwh));
  const { practicalKwh, clippingLossKwh } = applyAcCap(theoreticalKwh, acCapKw);

  const theoreticalTotal = sum(theoreticalKwh);
  const practicalTotal = sum(practicalKwh);
  const clippingTotal = sum(clippingLossKwh);
  let clippedHours = 0;
  let peakKw = 0;
  for (let i = 0; i < theoreticalKwh.length; i++) {
    const t = theoreticalKwh[i] ?? 0;
    if (t > peakKw) peakKw = t;
    if ((clippingLossKwh[i] ?? 0) > CLIP_EPS) clippedHours++;
  }

  const monTheo = monthlyTotals(theoreticalKwh, months);
  const monPrac = monthlyTotals(practicalKwh, months);
  const monClip = monthlyTotals(clippingLossKwh, months);
  const monthly: MonthlyCombined[] = Array.from({ length: MONTHS }, (_, k) => ({
    month: k + 1,
    theoreticalKwh: monTheo[k] ?? 0,
    practicalKwh: monPrac[k] ?? 0,
    clippingLossKwh: monClip[k] ?? 0,
  }));

  const multiyearMonthly = new Array<number>(MONTHS).fill(0);
  for (const f of falde) {
    for (let k = 0; k < MONTHS; k++) multiyearMonthly[k] = (multiyearMonthly[k] ?? 0) + (f.multiyear.monthlyKwh[k] ?? 0);
  }
  const multiyearAnnual = falde.reduce((s, f) => s + f.multiyear.annualKwh, 0);

  const combined: CombinedProduction = {
    annual: {
      theoreticalKwh: theoreticalTotal,
      practicalKwh: practicalTotal,
      clippingLossKwh: clippingTotal,
      clippingPct: theoreticalTotal > 0 ? (clippingTotal / theoreticalTotal) * 100 : 0,
      clippedHours,
      peakKw,
    },
    monthly,
    multiyear: { annualKwh: multiyearAnnual, monthlyKwh: multiyearMonthly },
    hourly: { theoreticalKwh, practicalKwh, clippingLossKwh },
  };

  return {
    year,
    hoursInYear: n,
    acCapKw,
    falde,
    combined,
    notes: [
      "La P oraria PVGIS è già al netto di temperatura e perdite di sistema (14%): non vengono ri-applicate.",
      "Il clipping è calcolato solo sul COMBINATO vs il tetto AC dell'inverter (unica uscita AC).",
      "Aggregazione mensile per mese UTC; l'effetto bordo notturno è trascurabile per la produzione.",
      "Il dato multi-anno (2005-2023) è la somma per-falda da PVcalc: nessun clipping modellato (aggregati mensili).",
    ],
  };
}
