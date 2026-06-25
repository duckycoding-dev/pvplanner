import { readJson } from "../io/readJson.ts";
import { fromRoot } from "../paths.ts";
import type { ProductsConfig } from "../config/schema.ts";
import type { BatterySpec, InverterSpec, ModuleSpec } from "./types.ts";

export interface LoadedProducts {
  module: ModuleSpec;
  inverter: InverterSpec;
  battery: BatterySpec;
}

/** Load the three product spec JSONs referenced by config (paths relative to project root). */
export async function loadProducts(cfg: ProductsConfig): Promise<LoadedProducts> {
  const moduleRaw = await readJson<Record<string, unknown>>(fromRoot(cfg.module));
  const wp = moduleRaw["peak_power_wp"];
  if (typeof wp !== "number" || Number.isNaN(wp)) {
    throw new Error(`Module spec "${cfg.module}": missing numeric "peak_power_wp"`);
  }
  const inverter = await readJson<InverterSpec>(fromRoot(cfg.inverter));
  const battery = await readJson<BatterySpec>(fromRoot(cfg.battery));
  return { module: moduleRaw as ModuleSpec, inverter, battery };
}
