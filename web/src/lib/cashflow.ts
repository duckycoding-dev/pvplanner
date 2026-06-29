export interface CashflowInput {
  capex: number; // upfront installation cost
  annualSaving: number; // bill avoided per year vs "senza FV"
  incentiveTotal: number; // total incentive amount
  incentiveYears: number; // returned linearly over N years (1 = immediate)
  years: number; // projection horizon
}

/**
 * Cumulative cash flow vs "not installing anything": index 0 = −capex, then each year
 * adds the annual saving plus the incentive instalment for the first N years. Mirrors
 * `paybackYears` exactly, so the curve crosses zero at the payback year. Length = years + 1.
 */
export function cashflowSeries(input: CashflowInput): number[] {
  const incYears = Math.max(1, Math.round(input.incentiveYears));
  const incPerYear = input.incentiveTotal / incYears;
  let cum = 0 - input.capex; // 0 - 0 = +0 (avoid -0 for a zero CAPEX)
  const out: number[] = [cum];
  for (let y = 1; y <= input.years; y++) {
    cum += input.annualSaving + (y <= incYears ? incPerYear : 0);
    out.push(cum);
  }
  return out;
}
