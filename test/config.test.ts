import { expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config/loadConfig.ts";
import { fromRoot } from "../src/paths.ts";
import { hasPersonalConfig } from "./helpers/personalConfig.ts";

// Golden calibrato sul config personale (2 falde est/ovest × 11 pannelli):
// skippato su clone fresco / fallback demo, dove config.json non esiste.
test.skipIf(!hasPersonalConfig)("loadConfig derives peakpower (11 × 465 / 1000 = 5.115) and dataDir per falda", async () => {
  const cfg = await loadConfig();
  expect(cfg.resolvedFalde.length).toBe(2);

  const est = cfg.resolvedFalde.find((f) => f.id === "est");
  const ovest = cfg.resolvedFalde.find((f) => f.id === "ovest");
  expect(est).toBeDefined();
  expect(ovest).toBeDefined();

  expect(est!.peakpower_kw).toBeCloseTo(5.115, 6);
  expect(ovest!.peakpower_kw).toBeCloseTo(5.115, 6);
  expect(est!.azimuth).toBe(-45);
  expect(ovest!.azimuth).toBe(45);
  expect(est!.dataDir.endsWith("/data/falde/-45")).toBe(true);
  expect(ovest!.dataDir.endsWith("/data/falde/45")).toBe(true);
});

test("module nameplate is 465 Wp", async () => {
  const cfg = await loadConfig();
  expect(cfg.module.peak_power_wp).toBe(465);
});

test("blocco simulation: coupling e round-trip letti da config", async () => {
  const cfg = await loadConfig();
  expect(cfg.simulation?.battery_coupling).toBe("dc");
  expect(cfg.simulation?.battery_round_trip).toBeCloseTo(0.9, 9);
});

test("pvgis.data_root risolve dataDir sotto la root indicata (config.demo.json → data/demo)", async () => {
  const cfg = await loadConfig(fromRoot("config.demo.json"));
  expect(cfg.pvgis.data_root).toBe("data/demo");
  for (const f of cfg.resolvedFalde) {
    expect(f.dataDir).toBe(fromRoot("data", "demo", String(f.azimuth)));
    expect(f.dataDir.endsWith("/data/demo/0")).toBe(true);
  }
});

test("data_root assente → dataDir default sotto data/falde", async () => {
  // Build a config WITHOUT pvgis.data_root and confirm dataDir defaults to data/falde/<azimuth>.
  const base = (await Bun.file(fromRoot("config.demo.json")).json()) as {
    pvgis: Record<string, unknown>;
    falde: { azimuth: number }[];
  };
  delete base.pvgis.data_root;
  const tmp = join(tmpdir(), `config-noroot-${process.pid}.json`);
  await Bun.write(tmp, JSON.stringify(base));
  const cfg = await loadConfig(tmp);
  expect(cfg.pvgis.data_root).toBeUndefined();
  const az = cfg.falde[0]!.azimuth;
  expect(cfg.resolvedFalde[0]!.dataDir).toBe(fromRoot("data", "falde", String(az)));
});

test("config.demo.json: sistema Roma completo (falda sud, consumi, economics)", async () => {
  const cfg = await loadConfig(fromRoot("config.demo.json"));
  expect(cfg.location.latitude).toBeCloseTo(41.902, 3);
  expect(cfg.location.longitude).toBeCloseTo(12.496, 3);
  const sud = cfg.resolvedFalde.find((f) => f.id === "sud")!;
  expect(sud).toBeDefined();
  // peakpower derives from the shared datasheet (465 Wp) × 10 panels.
  expect(sud.peakpower_kw).toBeCloseTo((10 * cfg.module.peak_power_wp) / 1000, 6);
  expect(cfg.consumption.source).toBe("synthetic");
  expect(cfg.consumption.house?.heated_area_m2).toBe(150);
  expect(cfg.economics?.installation_cost_eur).toBe(8000);
  expect(cfg.economics?.incentive.value).toBe(50);
  expect(cfg.economics?.incentive.years).toBe(10);
});
