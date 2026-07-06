/**
 * Template mensili → forma canonica. L'utente dà, per ogni mese, quanti kWh/giorno
 * consuma e una "sagoma" del giorno (preset o 24 valori custom); il template viene
 * espanso sull'asse orario del dataset, distribuendo il totale mensile secondo la
 * sagoma, con un fattore weekend applicato ai giorni LOCALI. Funzione pura.
 */
import { localHourWeekday } from "../time/localTime.ts";
import type { CanonicalConsumption } from "./canonical.ts";

export type DayShapeKey = "flat" | "morningEvening" | "daytimeWfh" | "nightHeavy";

// Sagome adimensionali (ora locale 0..23): normalizzate in espansione, contano solo i rapporti.
// morningEvening/daytimeWfh riusano i profili di houseLoad.ts (copiati: moduli indipendenti).
const BASE_WEEKDAY = [
  0.4, 0.35, 0.35, 0.35, 0.4, 0.6, 1.0, 1.3, 1.0, 0.8, 0.8, 0.9,
  1.1, 1.0, 0.8, 0.8, 0.9, 1.2, 1.6, 1.6, 1.4, 1.1, 0.8, 0.5,
];
const WFH_DAYTIME = [
  0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.5, 0.5, 0.5,
  0.8, 0.6, 0.5, 0.5, 0.4, 0.2, 0, 0, 0, 0, 0, 0,
];

const FLAT: number[] = new Array<number>(24).fill(1);
const MORNING_EVENING: number[] = BASE_WEEKDAY.slice();
const DAYTIME_WFH: number[] = BASE_WEEKDAY.map((v, h) => v + WFH_DAYTIME[h]!);
// notte alta / giorno bassa / sera media: 1.6 (0-7), 0.8 (8-17), 1.2 (18-23).
const NIGHT_HEAVY: number[] = Array.from({ length: 24 }, (_, h) => (h < 8 ? 1.6 : h < 18 ? 0.8 : 1.2));

export const DAY_SHAPES: Record<DayShapeKey, readonly number[]> = {
  flat: FLAT,
  morningEvening: MORNING_EVENING,
  daytimeWfh: DAYTIME_WFH,
  nightHeavy: NIGHT_HEAVY,
};

export interface MonthlyTemplate {
  /** 12 elementi (gennaio..dicembre). `shape` = preset o 24 pesi custom (avanzato). */
  months: { dailyKwh: number; shape: DayShapeKey | number[] }[];
  /** Moltiplicatore dei giorni di weekend (LOCALI). Default 1. */
  weekendFactor: number;
}

function shapeWeights(shape: DayShapeKey | number[]): readonly number[] {
  return Array.isArray(shape) ? shape : DAY_SHAPES[shape];
}

/**
 * Espande il template sull'asse orario del dataset. Per ogni ora: peso grezzo =
 * sagoma[ora locale] × (weekendFactor se giorno locale ∈ {sab,dom}). Poi ogni mese
 * viene rinormalizzato così che il suo totale = dailyKwh_mese × giorni_del_mese
 * (giorni = ore del mese / 24 sull'asse UTC), indipendentemente dal weekendFactor.
 */
export function expandMonthlyTemplate(
  t: MonthlyTemplate,
  timestampsUtc: readonly number[],
  months: readonly number[],
  timeZone: string,
): CanonicalConsumption {
  const n = timestampsUtc.length;
  const raw = new Array<number>(n).fill(0);
  const rawSumByMonth = new Array<number>(13).fill(0); // index 1..12
  const hoursByMonth = new Array<number>(13).fill(0);

  for (let i = 0; i < n; i++) {
    const m = months[i]!;
    const local = localHourWeekday(timestampsUtc[i]!, timeZone);
    const spec = t.months[m - 1];
    const weights = spec ? shapeWeights(spec.shape) : FLAT;
    const isWeekend = local.weekday >= 5;
    const w = (weights[local.hour] ?? 0) * (isWeekend ? t.weekendFactor : 1);
    raw[i] = w;
    rawSumByMonth[m]! += w;
    hoursByMonth[m]! += 1;
  }

  // Target per mese = dailyKwh × giorni del mese (giorni = ore/24 sull'asse UTC).
  const scale = new Array<number>(13).fill(0);
  for (let m = 1; m <= 12; m++) {
    const spec = t.months[m - 1];
    const daily = spec ? spec.dailyKwh : 0;
    const target = daily * (hoursByMonth[m]! / 24);
    const s = rawSumByMonth[m]!;
    scale[m] = s > 0 ? target / s : 0;
  }

  const hourlyKwh = new Array<number>(n);
  let annual = 0;
  for (let i = 0; i < n; i++) {
    const v = raw[i]! * scale[months[i]!]!;
    hourlyKwh[i] = v;
    annual += v;
  }

  return {
    hourlyKwh,
    meta: { source: "monthly", label: "Template mensili", annualKwh: annual, coveragePct: 100 },
  };
}
