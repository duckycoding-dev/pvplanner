import type { Viz } from "../types.ts";
import type { SystemResult } from "../../../src/core/comparison/computeSystem.ts";

export interface ComparePoint {
  hour: number;
  load: number; // shared between A and B
  prodA: number;
  prodB: number;
  selfA: number;
  selfB: number;
  socA: number;
  socB: number;
  temp?: number;
}

/** Slice the 24 hours of a day into A-vs-B chart points (practical production, coverage, SoC). */
export function sliceCompareDay(a: SystemResult, b: SystemResult, viz: Viz, dayIndex: number): ComparePoint[] {
  const start = dayIndex * 24;
  const pts: ComparePoint[] = [];
  for (let i = 0; i < 24; i++) {
    const j = start + i;
    pts.push({
      hour: i,
      load: viz.hourly.loadKwh[j] ?? 0,
      prodA: a.production.hourly.practicalKwh[j] ?? 0,
      prodB: b.production.hourly.practicalKwh[j] ?? 0,
      selfA: a.hourly.selfConsumedKwh[j] ?? 0,
      selfB: b.hourly.selfConsumedKwh[j] ?? 0,
      socA: a.hourly.socKwh[j] ?? 0,
      socB: b.hourly.socKwh[j] ?? 0,
      temp: viz.hourly.t2m?.[j],
    });
  }
  return pts;
}
