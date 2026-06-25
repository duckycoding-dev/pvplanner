import type { Hourly } from "../types.ts";

function dailySums(values: number[], days: number): number[] {
  const out = new Array<number>(days).fill(0);
  for (let d = 0; d < days; d++) {
    let s = 0;
    for (let i = 0; i < 24; i++) s += values[d * 24 + i] ?? 0;
    out[d] = s;
  }
  return out;
}

function argmax(xs: number[]): number {
  let bi = 0;
  let bv = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if ((xs[i] ?? 0) > bv) {
      bv = xs[i] ?? 0;
      bi = i;
    }
  }
  return bi;
}

function argmin(xs: number[]): number {
  let bi = 0;
  let bv = Infinity;
  for (let i = 0; i < xs.length; i++) {
    if ((xs[i] ?? 0) < bv) {
      bv = xs[i] ?? 0;
      bi = i;
    }
  }
  return bi;
}

export interface QuickPicks {
  maxClipping: number;
  maxProduction: number;
  minProduction: number;
}

/** Day indices for handy jump-to days. */
export function quickPickDays(h: Hourly): QuickPicks {
  const days = Math.floor(h.productionPracticalKwh.length / 24);
  const clip = dailySums(h.clippingKwh, days);
  const prod = dailySums(h.productionPracticalKwh, days);
  return {
    maxClipping: argmax(clip),
    maxProduction: argmax(prod),
    minProduction: argmin(prod),
  };
}
