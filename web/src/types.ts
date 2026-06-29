export interface ScenarioMetrics {
  selfConsumedKwh: number;
  selfConsumptionRate: number;
  selfSufficiency: number;
  importKwh: number;
  exportKwh: number;
}

export interface MonthRow {
  month: number;
  prodTheoreticalKwh: number;
  prodPracticalKwh: number;
  clippingKwh: number;
  nb: { selfConsumedKwh: number; importKwh: number; exportKwh: number };
  wb: { selfConsumedKwh: number; importKwh: number; exportKwh: number; dischargeKwh: number };
}

export interface FaldaHourly {
  id: string;
  azimuth: number;
  peakKwp: number;
  productionKwh: number[];
}

export interface Hourly {
  timestampsUtc: number[];
  months: number[];
  localHour: number[];
  weekday: number[];
  falde: FaldaHourly[];
  productionTheoreticalKwh: number[];
  productionPracticalKwh: number[];
  clippingKwh: number[];
  loadKwh: number[];
  nb: { selfConsumedKwh: number[]; importKwh: number[]; exportKwh: number[] };
  wb: {
    selfConsumedKwh: number[];
    importKwh: number[];
    exportKwh: number[];
    chargeKwh: number[];
    dischargeKwh: number[];
    socKwh: number[];
  };
}

export interface Viz {
  meta: {
    year: number;
    hoursInYear: number;
    acCapKw: number;
    batteryUsableKwh: number;
    batteryTotalKwh: number;
    batteryUsablePct: number;
    batteryPortKw: number;
    batteryRoundTrip: number;
    consumptionAnnualKwh: number;
    installationCostEur: number;
    incentive: { mode: "percent" | "fixed"; value: number; years: number };
    falde: { id: string; azimuth: number; peakKwp: number; panelCount: number; wp: number }[];
    consumptionSource: string;
    consumptionNote: string;
  };
  annual: {
    production: {
      theoreticalKwh: number;
      practicalKwh: number;
      clippingLossKwh: number;
      clippingPct: number;
      clippedHours: number;
      peakKw: number;
      multiyearKwh: number;
    };
    noBattery: ScenarioMetrics;
    withBattery: ScenarioMetrics & {
      battery: { throughputKwh: number; equivalentCycles: number; roundTripLossKwh: number };
    };
    delta: {
      selfConsumedKwh: number;
      selfSufficiencyPoints: number;
      importReductionKwh: number;
      exportReductionKwh: number;
    };
  };
  monthly: MonthRow[];
  hourly: Hourly;
}

export type Scenario = "con" | "senza" | "entrambi";
export type Tab = "annuale" | "mensile" | "giorno" | "confronto" | "glossario";
