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

/**
 * First (fractional) year at which the cumulative cash flow of series `a` crosses `b`
 * — i.e. the difference a−b changes sign. Returns null if they never cross (one stays
 * ahead the whole horizon) or are identical. Used to mark when one system overtakes the other.
 */
export function firstCrossover(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  for (let y = 1; y < n; y++) {
    const prev = (a[y - 1] ?? 0) - (b[y - 1] ?? 0);
    const cur = (a[y] ?? 0) - (b[y] ?? 0);
    if (prev === 0) continue; // ignore a shared starting point
    if (cur === 0) return y;
    if (prev * cur < 0) return y - 1 + Math.abs(prev) / (Math.abs(prev) + Math.abs(cur));
  }
  return null;
}
