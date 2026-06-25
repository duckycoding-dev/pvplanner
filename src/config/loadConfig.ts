import { readJson } from "../io/readJson.ts";
import { fromRoot } from "../paths.ts";
import { loadProducts } from "../products/loadProducts.ts";
import { validateSystemConfig, type ResolvedConfig, type ResolvedFalda } from "./schema.ts";

/**
 * Load + validate config.json, read product specs, and derive per-falda values
 * (peakpower_kw, dataDir). This is the single entry point for "what system are
 * we analyzing".
 */
export async function loadConfig(configPath: string = fromRoot("config.json")): Promise<ResolvedConfig> {
  const raw = await readJson(configPath);
  const cfg = validateSystemConfig(raw);
  const products = await loadProducts(cfg.products);
  const moduleWp = products.module.peak_power_wp;

  const resolvedFalde: ResolvedFalda[] = cfg.falde.map((f) => ({
    ...f,
    peakpower_kw: (f.panel_count * moduleWp) / 1000,
    dataDir: fromRoot("data", "falde", String(f.azimuth)),
  }));

  return {
    ...cfg,
    module: products.module,
    inverter: products.inverter,
    battery: products.battery,
    resolvedFalde,
  };
}
