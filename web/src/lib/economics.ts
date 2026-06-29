import type { Viz } from "../types.ts";
import { paybackYears } from "../../../src/core/economics/payback.ts";

/** Shared incentive policy: a % of CAPEX or a fixed €, returned over N years. */
export type Incentive = { mode: "percent" | "fixed"; value: number; years: number };

export function defaultIncentive(viz: Viz): Incentive {
  return { ...viz.meta.incentive };
}

export function incentiveTotalEur(incentive: Incentive, capexEur: number): number {
  return incentive.mode === "percent" ? (capexEur * incentive.value) / 100 : incentive.value;
}

/** Payback (years, or null) of a system vs "no PV", from its CAPEX and the two net bills. */
export function systemPaybackYears(
  capexEur: number,
  systemNetEur: number,
  noPvNetEur: number,
  incentive: Incentive,
): number | null {
  return paybackYears({
    capexEur,
    annualSavingEur: noPvNetEur - systemNetEur,
    incentiveEur: incentiveTotalEur(incentive, capexEur),
    incentiveYears: incentive.years,
  });
}
