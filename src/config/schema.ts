import type { BatterySpec, InverterSpec, ModuleSpec } from "../products/types.ts";

// ---------------------------------------------------------------------------
// Config interfaces — config.json is the single source of truth for the system.
// ---------------------------------------------------------------------------

export interface LocationConfig {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface PvgisConfig {
  base_url: string;
  radiation_db: string; // -> raddatabase
  pvtechchoice: string; // already a query value, e.g. "crystSi2025"
  mountingplace: string; // already a query value, e.g. "building"
  system_loss_percent: number; // -> loss
  use_horizon: boolean; // -> usehorizon
  single_year: number; // year for seriescalc
  components: boolean; // seriescalc components flag
  /** Root dir (relative to project) holding per-falda data subfolders. Default "data/falde". */
  data_root?: string;
}

export interface ProductsConfig {
  module: string; // path relative to project root
  inverter: string;
  battery: string;
}

export interface FaldaConfig {
  id: string;
  azimuth: number; // PVGIS aspect: 0=S, 90=W, -90=E
  tilt: number; // -> angle
  panel_count: number; // peakpower is derived from this × module Wp
}

export interface ConsumptionCsvConfig {
  path: string;
  timestamp_column: string;
  value_column: string;
  value_unit: "W" | "kW" | "Wh" | "kWh";
  timestamp_format?: string;
  timestamp_timezone?: string;
  delimiter?: string;
  has_header?: boolean;
}

/** House/heating parameters for the physically-grounded synthetic load (all optional → defaults). */
export interface HouseConfig {
  heated_area_m2?: number;
  specific_heat_demand_kwh_m2y?: number;
  heating_base_temp_c?: number;
  occupants?: number;
  wfh_occupants?: number;
  heat_pump_scop?: number;
  heat_pump_cop_ref?: number;
  heat_pump_cop_ref_outdoor_c?: number;
  heat_pump_flow_temp_c?: number;
  dhw_cop?: number;
  dhw_kwh_per_person_y?: number;
  base_load_annual_kwh?: number;
  storage_standby_loss_pct?: number;
  buffer_smoothing_hours?: number;
}

export interface ConsumptionConfig {
  source: "csv" | "synthetic";
  annual_kwh_target?: number;
  timezone?: string;
  csv?: ConsumptionCsvConfig;
  house?: HouseConfig;
}

export interface IncentiveConfig {
  mode: "percent" | "fixed"; // % of CAPEX, or a fixed € amount
  value: number;
  years: number; // returned linearly over N years (1 = immediate)
}

export interface EconomicsConfig {
  installation_cost_eur: number; // baseline system CAPEX
  incentive: IncentiveConfig;
}

/** Simulation-wide knobs not tied to a product datasheet. */
export interface SimulationConfig {
  /** Battery coupling: "dc" = hybrid inverter (clip can charge), "ac" = separate battery inverter. */
  battery_coupling?: "dc" | "ac";
  /** AC-to-AC round-trip efficiency (0..1]. */
  battery_round_trip?: number;
}

export interface SystemConfig {
  location: LocationConfig;
  timezone: string;
  pvgis: PvgisConfig;
  products: ProductsConfig;
  falde: FaldaConfig[];
  consumption: ConsumptionConfig;
  simulation?: SimulationConfig;
  economics?: EconomicsConfig;
}

// ---------------------------------------------------------------------------
// Resolved config — produced by loadConfig after reading product specs.
// ---------------------------------------------------------------------------

export interface ResolvedFalda extends FaldaConfig {
  /** Derived: panel_count × module.peak_power_wp / 1000. */
  peakpower_kw: number;
  /** Absolute path of this falda's data dir (data/falde/<azimuth>). */
  dataDir: string;
}

export interface ResolvedConfig extends SystemConfig {
  module: ModuleSpec;
  inverter: InverterSpec;
  battery: BatterySpec;
  resolvedFalde: ResolvedFalda[];
}

// ---------------------------------------------------------------------------
// Hand-rolled validation (no external deps).
// ---------------------------------------------------------------------------

function asObject(v: unknown, ctx: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new Error(`config: ${ctx} must be an object`);
  }
  return v as Record<string, unknown>;
}

function asNumber(v: unknown, ctx: string): number {
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`config: ${ctx} must be a number`);
  return v;
}

function asString(v: unknown, ctx: string): string {
  if (typeof v !== "string" || v.length === 0) throw new Error(`config: ${ctx} must be a non-empty string`);
  return v;
}

function asBoolean(v: unknown, ctx: string): boolean {
  if (typeof v !== "boolean") throw new Error(`config: ${ctx} must be a boolean`);
  return v;
}

function asArray(v: unknown, ctx: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`config: ${ctx} must be an array`);
  return v;
}

export function validateSystemConfig(raw: unknown): SystemConfig {
  const root = asObject(raw, "root");

  const locObj = asObject(root["location"], "location");
  const location: LocationConfig = {
    latitude: asNumber(locObj["latitude"], "location.latitude"),
    longitude: asNumber(locObj["longitude"], "location.longitude"),
    ...(locObj["elevation"] === undefined
      ? {}
      : { elevation: asNumber(locObj["elevation"], "location.elevation") }),
  };

  const pvgisObj = asObject(root["pvgis"], "pvgis");
  const pvgis: PvgisConfig = {
    base_url: asString(pvgisObj["base_url"], "pvgis.base_url"),
    radiation_db: asString(pvgisObj["radiation_db"], "pvgis.radiation_db"),
    pvtechchoice: asString(pvgisObj["pvtechchoice"], "pvgis.pvtechchoice"),
    mountingplace: asString(pvgisObj["mountingplace"], "pvgis.mountingplace"),
    system_loss_percent: asNumber(pvgisObj["system_loss_percent"], "pvgis.system_loss_percent"),
    use_horizon: asBoolean(pvgisObj["use_horizon"], "pvgis.use_horizon"),
    single_year: asNumber(pvgisObj["single_year"], "pvgis.single_year"),
    components: asBoolean(pvgisObj["components"], "pvgis.components"),
    ...(pvgisObj["data_root"] === undefined
      ? {}
      : { data_root: asString(pvgisObj["data_root"], "pvgis.data_root") }),
  };

  const prodObj = asObject(root["products"], "products");
  const products: ProductsConfig = {
    module: asString(prodObj["module"], "products.module"),
    inverter: asString(prodObj["inverter"], "products.inverter"),
    battery: asString(prodObj["battery"], "products.battery"),
  };

  const faldeRaw = asArray(root["falde"], "falde");
  if (faldeRaw.length === 0) throw new Error("config: falde must have at least one entry");
  const falde: FaldaConfig[] = faldeRaw.map((f, i) => {
    const o = asObject(f, `falde[${i}]`);
    return {
      id: asString(o["id"], `falde[${i}].id`),
      azimuth: asNumber(o["azimuth"], `falde[${i}].azimuth`),
      tilt: asNumber(o["tilt"], `falde[${i}].tilt`),
      panel_count: asNumber(o["panel_count"], `falde[${i}].panel_count`),
    };
  });

  const consObj = asObject(root["consumption"], "consumption");
  const source = asString(consObj["source"], "consumption.source");
  if (source !== "csv" && source !== "synthetic") {
    throw new Error(`config: consumption.source must be "csv" or "synthetic"`);
  }
  let house: HouseConfig | undefined;
  if (consObj["house"] !== undefined) {
    const h = asObject(consObj["house"], "consumption.house");
    const keys = [
      "heated_area_m2",
      "specific_heat_demand_kwh_m2y",
      "heating_base_temp_c",
      "occupants",
      "wfh_occupants",
      "heat_pump_scop",
      "heat_pump_cop_ref",
      "heat_pump_cop_ref_outdoor_c",
      "heat_pump_flow_temp_c",
      "dhw_cop",
      "dhw_kwh_per_person_y",
      "base_load_annual_kwh",
      "storage_standby_loss_pct",
      "buffer_smoothing_hours",
    ] as const;
    house = {};
    for (const k of keys) {
      if (h[k] !== undefined) house[k] = asNumber(h[k], `consumption.house.${k}`);
    }
  }

  const consumption: ConsumptionConfig = {
    source,
    ...(consObj["annual_kwh_target"] === undefined
      ? {}
      : { annual_kwh_target: asNumber(consObj["annual_kwh_target"], "consumption.annual_kwh_target") }),
    ...(consObj["timezone"] === undefined
      ? {}
      : { timezone: asString(consObj["timezone"], "consumption.timezone") }),
    ...(house === undefined ? {} : { house }),
  };

  let simulation: SimulationConfig | undefined;
  if (root["simulation"] !== undefined) {
    const s = asObject(root["simulation"], "simulation");
    simulation = {};
    if (s["battery_coupling"] !== undefined) {
      const c = asString(s["battery_coupling"], "simulation.battery_coupling");
      if (c !== "dc" && c !== "ac") throw new Error('config: simulation.battery_coupling must be "dc" or "ac"');
      simulation.battery_coupling = c;
    }
    if (s["battery_round_trip"] !== undefined) {
      const rt = asNumber(s["battery_round_trip"], "simulation.battery_round_trip");
      if (rt <= 0 || rt > 1) throw new Error("config: simulation.battery_round_trip must be in (0, 1]");
      simulation.battery_round_trip = rt;
    }
  }

  let economics: EconomicsConfig | undefined;
  if (root["economics"] !== undefined) {
    const e = asObject(root["economics"], "economics");
    const inc = asObject(e["incentive"], "economics.incentive");
    const mode = asString(inc["mode"], "economics.incentive.mode");
    if (mode !== "percent" && mode !== "fixed") {
      throw new Error('config: economics.incentive.mode must be "percent" or "fixed"');
    }
    economics = {
      installation_cost_eur: asNumber(e["installation_cost_eur"], "economics.installation_cost_eur"),
      incentive: {
        mode,
        value: asNumber(inc["value"], "economics.incentive.value"),
        years: asNumber(inc["years"], "economics.incentive.years"),
      },
    };
  }

  return {
    location,
    timezone: asString(root["timezone"], "timezone"),
    pvgis,
    products,
    falde,
    consumption,
    ...(simulation === undefined ? {} : { simulation }),
    ...(economics === undefined ? {} : { economics }),
  };
}
