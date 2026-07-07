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

/** Le due serie orarie (8760) da cui derivano i quick-pick. `Hourly` le soddisfa
 *  strutturalmente; la vista confronto passa le serie per-sistema combinate. */
export interface QuickPickSeries {
  productionPracticalKwh: number[];
  clippingKwh: number[];
}

export interface QuickPicks {
  /** null ⇒ nessun clipping in tutto l'anno: il bottone va disabilitato
   *  (l'argmax su una serie di zeri punterebbe al 1° gennaio). */
  maxClipping: number | null;
  maxProduction: number;
  minProduction: number;
}

/** Day indices for handy jump-to days. */
export function quickPickDays(h: QuickPickSeries): QuickPicks {
  const days = Math.floor(h.productionPracticalKwh.length / 24);
  const clip = dailySums(h.clippingKwh, days);
  const prod = dailySums(h.productionPracticalKwh, days);
  const hasClip = clip.some((v) => v > 0);
  return {
    maxClipping: hasClip ? argmax(clip) : null,
    maxProduction: argmax(prod),
    minProduction: argmin(prod),
  };
}

/** Somma elemento per elemento (serie A+B della vista confronto). */
export function combineSeries(a: readonly number[], b: readonly number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}
