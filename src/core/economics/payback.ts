export interface PaybackInput {
  capexEur: number; // upfront installation cost
  annualSavingEur: number; // bill avoided per year vs the reference
  incentiveEur: number; // total incentive amount
  incentiveYears: number; // returned linearly over N years (1 = immediate)
  horizonYears?: number; // give up after this many years (default 40)
}

/**
 * Simple payback (years) from a cumulative cash flow: −capex upfront, then each
 * year + annual saving + the incentive instalment (for the first N years).
 * Returns the fractional year the cumulative flow turns non-negative, or null if
 * it never does within the horizon. Ignores inflation and panel degradation.
 */
export function paybackYears(input: PaybackInput): number | null {
  const horizon = input.horizonYears ?? 40;
  const incYears = Math.max(1, Math.round(input.incentiveYears));
  const incPerYear = input.incentiveEur / incYears;

  let cum = -input.capexEur;
  if (cum >= 0) return 0;

  for (let y = 1; y <= horizon; y++) {
    const inflow = input.annualSavingEur + (y <= incYears ? incPerYear : 0);
    if (inflow <= 0) continue; // no progress this year
    const prev = cum;
    cum += inflow;
    if (cum >= 0) return y - 1 + -prev / inflow;
  }
  return null;
}
