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
  single_year: number; // year for seriescalc / MRcalc / generic
  components: boolean; // seriescalc components flag
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

export interface ConsumptionConfig {
  source: "csv" | "synthetic";
  annual_kwh_target?: number;
  timezone?: string;
  csv?: ConsumptionCsvConfig;
}

export interface SystemConfig {
  location: LocationConfig;
  timezone: string;
  pvgis: PvgisConfig;
  products: ProductsConfig;
  falde: FaldaConfig[];
  consumption: ConsumptionConfig;
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
  const consumption: ConsumptionConfig = {
    source,
    ...(consObj["annual_kwh_target"] === undefined
      ? {}
      : { annual_kwh_target: asNumber(consObj["annual_kwh_target"], "consumption.annual_kwh_target") }),
    ...(consObj["timezone"] === undefined
      ? {}
      : { timezone: asString(consObj["timezone"], "consumption.timezone") }),
  };

  return {
    location,
    timezone: asString(root["timezone"], "timezone"),
    pvgis,
    products,
    falde,
    consumption,
  };
}
