/** Domain types shared by the pure core. No fs/Bun dependencies here. */

/** One falda's hourly production for a single year (UTC axis). */
export interface HourlySeries {
  id: string;
  azimuth: number;
  peakKwp: number;
  timestampsUtc: readonly number[]; // epoch ms (minute :10 dropped)
  months: readonly number[]; // 1..12 per row (from UTC timestamp)
  productionKwh: readonly number[]; // P / 1000
  reconstructedCount: number; // rows with Int === 1
}

/** One falda's multi-year monthly reference (from PVcalc power.json). */
export interface PowerSeries {
  id: string;
  azimuth: number;
  annualKwh: number; // E_y
  monthlyKwh: readonly number[]; // 12 × E_m
  yearMin: number;
  yearMax: number;
}

export interface FaldaProduction {
  id: string;
  azimuth: number;
  peakKwp: number;
  annualKwh: number; // single-year (hourly) sum
  monthlyKwh: number[]; // 12, single-year
  multiyear: { annualKwh: number; monthlyKwh: number[]; yearMin: number; yearMax: number };
}

export interface MonthlyCombined {
  month: number;
  theoreticalKwh: number;
  practicalKwh: number;
  clippingLossKwh: number;
}

export interface CombinedProduction {
  annual: {
    theoreticalKwh: number;
    practicalKwh: number;
    clippingLossKwh: number;
    clippingPct: number;
    clippedHours: number;
    peakKw: number;
  };
  monthly: MonthlyCombined[];
  /** Sum of falde multi-year (no clipping modeled on monthly aggregates). */
  multiyear: { annualKwh: number; monthlyKwh: number[] };
  hourly: {
    theoreticalKwh: number[];
    practicalKwh: number[];
    clippingLossKwh: number[];
  };
}

export interface ProductionResult {
  year: number;
  hoursInYear: number;
  acCapKw: number;
  falde: FaldaProduction[];
  combined: CombinedProduction;
  notes: string[];
}
