import type { Hourly } from "../types.ts";

export interface DayPoint {
  hour: number;
  prodTheoretical: number;
  prodPractical: number;
  clipping: number;
  load: number;
  nbSelf: number;
  nbImport: number;
  nbExport: number;
  wbSelf: number;
  wbImport: number;
  wbExport: number;
  charge: number;
  discharge: number;
  soc: number;
}

export function dayCount(h: Hourly): number {
  return Math.floor(h.productionPracticalKwh.length / 24);
}

/** Slice the 24 hours of a given day (UTC axis) into chart-ready points. */
export function sliceDay(h: Hourly, dayIndex: number): DayPoint[] {
  const start = dayIndex * 24;
  const points: DayPoint[] = [];
  for (let i = 0; i < 24; i++) {
    const j = start + i;
    points.push({
      hour: i,
      prodTheoretical: h.productionTheoreticalKwh[j] ?? 0,
      prodPractical: h.productionPracticalKwh[j] ?? 0,
      clipping: h.clippingKwh[j] ?? 0,
      load: h.loadKwh[j] ?? 0,
      nbSelf: h.nb.selfConsumedKwh[j] ?? 0,
      nbImport: h.nb.importKwh[j] ?? 0,
      nbExport: h.nb.exportKwh[j] ?? 0,
      wbSelf: h.wb.selfConsumedKwh[j] ?? 0,
      wbImport: h.wb.importKwh[j] ?? 0,
      wbExport: h.wb.exportKwh[j] ?? 0,
      charge: h.wb.chargeKwh[j] ?? 0,
      discharge: h.wb.dischargeKwh[j] ?? 0,
      soc: h.wb.socKwh[j] ?? 0,
    });
  }
  return points;
}
