import { existsSync } from "node:fs";
import { readJson } from "../io/readJson.ts";
import { fromRoot } from "../paths.ts";
import { loadProducts } from "../products/loadProducts.ts";
import { validateSystemConfig, type ResolvedConfig, type ResolvedFalda } from "./schema.ts";

/**
 * Resolve the default config path. Personal setup lives in `config.json`
 * (git-ignored). On a fresh clone that file is absent, so we fall back to the
 * committed `config.demo.json` (Roma demo dataset) with a warning, so that the
 * app and the test suite still run out of the box.
 */
function resolveDefaultConfigPath(): string {
  const personal = fromRoot("config.json");
  if (existsSync(personal)) return personal;
  const demo = fromRoot("config.demo.json");
  if (existsSync(demo)) {
    console.warn("config.json not found — falling back to config.demo.json (Roma demo dataset).");
    return demo;
  }
  return personal; // let readJson surface the missing-file error
}

/**
 * Load + validate config.json, read product specs, and derive per-falda values
 * (peakpower_kw, dataDir). This is the single entry point for "what system are
 * we analyzing".
 */
export async function loadConfig(configPath: string = resolveDefaultConfigPath()): Promise<ResolvedConfig> {
  const raw = await readJson(configPath);
  const cfg = validateSystemConfig(raw);
  const products = await loadProducts(cfg.products);
  const moduleWp = products.module.peak_power_wp;

  const dataRoot = cfg.pvgis.data_root ?? "data/falde";
  const resolvedFalde: ResolvedFalda[] = cfg.falde.map((f) => ({
    ...f,
    peakpower_kw: (f.panel_count * moduleWp) / 1000,
    dataDir: fromRoot(dataRoot, String(f.azimuth)),
  }));

  return {
    ...cfg,
    module: products.module,
    inverter: products.inverter,
    battery: products.battery,
    resolvedFalde,
  };
}
