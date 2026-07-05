/** Domain types shared by the pure core. No fs/Bun dependencies here. */

/** One falda's hourly production for a single year (UTC axis). */
export interface HourlySeries {
  id: string;
  azimuth: number;
  peakKwp: number;
  timestampsUtc: readonly number[]; // epoch ms (minute :10 dropped)
  months: readonly number[]; // 1..12 per row (from UTC timestamp)
  productionKwh: readonly number[]; // P / 1000
  t2m: readonly number[]; // ambient temperature [°C] (for synthetic load shaping)
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

// ---------------------------------------------------------------------------
// Consumption + battery simulation (Step 3)
// ---------------------------------------------------------------------------

export interface ConsumptionSeries {
  loadKwh: readonly number[];
  months: readonly number[];
  annualKwh: number;
  source: string;
  notes: string[];
}

export interface BatteryConfig {
  usableKwh: number;
  chargeEff: number; // √(roundTrip)
  dischargeEff: number; // √(roundTrip)
  pMaxKw: number; // charge/discharge power cap (= kWh/h)
  initialSoCFraction: number; // 0..1
  socConvergence: boolean;
}

export interface ScenarioHourly {
  productionKwh: number[]; // practical production (after clipping)
  loadKwh: number[];
  selfConsumedKwh: number[]; // direct + battery-to-load
  importKwh: number[];
  exportKwh: number[];
  chargeKwh: number[]; // 0 for no-battery
  dischargeKwh: number[]; // 0 for no-battery
  recoveredClipKwh: number[]; // clipped energy charged on the DC bus (0 for AC/no-battery)
  socKwh: number[]; // 0 for no-battery
}

export interface AnnualMetrics {
  productionKwh: number;
  consumptionKwh: number;
  selfConsumedKwh: number;
  selfConsumptionRate: number; // selfConsumed / production
  selfSufficiency: number; // selfConsumed / consumption
  importKwh: number;
  exportKwh: number;
  battery?: {
    throughputKwh: number; // Σ discharge
    equivalentCycles: number; // throughput / usable
    roundTripLossKwh: number; // Σ charge − Σ discharge
    recoveredClipKwh: number; // Σ clipped energy recovered into the battery (DC coupling)
    usableKwh: number;
  };
}

export interface MonthlyScenario {
  month: number;
  selfConsumedKwh: number;
  importKwh: number;
  exportKwh: number;
  dischargeKwh: number;
}

export interface ScenarioResult {
  scenario: "no-battery" | "with-battery";
  metrics: AnnualMetrics;
  monthly: MonthlyScenario[];
  hourly: ScenarioHourly;
  convergencePasses?: number;
}

export interface ComparisonResult {
  withoutBattery: ScenarioResult;
  withBattery: ScenarioResult;
  delta: {
    selfConsumedKwh: number;
    selfConsumptionRatePoints: number; // percentage points
    selfSufficiencyPoints: number; // percentage points
    importReductionKwh: number;
    exportReductionKwh: number;
  };
  notes: string[];
}
