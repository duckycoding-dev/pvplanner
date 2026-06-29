import type { Viz } from "../types.ts";
import type { SystemResult } from "../../../src/core/comparison/computeSystem.ts";
import { aggregateCost, type CostResult, type Tariff } from "../../../src/core/economics/tariff.ts";

/** Cost of one baseline scenario (con/senza) from viz.hourly under a tariff. */
export function scenarioCost(viz: Viz, scenario: "con" | "senza", tariff: Tariff): CostResult {
  const s = scenario === "con" ? viz.hourly.wb : viz.hourly.nb;
  return aggregateCost(s.importKwh, s.exportKwh, viz.hourly.localHour, viz.hourly.weekday, viz.hourly.months, tariff);
}

/** Cost of a recomputed system (A or B in the comparison) under a tariff. */
export function systemCost(viz: Viz, r: SystemResult, tariff: Tariff): CostResult {
  return aggregateCost(
    r.hourly.importKwh,
    r.hourly.exportKwh,
    viz.hourly.localHour,
    viz.hourly.weekday,
    viz.hourly.months,
    tariff,
  );
}

/** Annual battery value for the baseline = net(no-battery) − net(with-battery). */
export function batterySavingEur(viz: Viz, tariff: Tariff): number {
  return scenarioCost(viz, "senza", tariff).annual.netCost - scenarioCost(viz, "con", tariff).annual.netCost;
}

/** Cost with no PV at all: the whole load is imported, nothing exported. */
export function noPvCost(viz: Viz, tariff: Tariff): CostResult {
  const zeros = viz.hourly.loadKwh.map(() => 0);
  return aggregateCost(viz.hourly.loadKwh, zeros, viz.hourly.localHour, viz.hourly.weekday, viz.hourly.months, tariff);
}
