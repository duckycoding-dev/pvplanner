import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/loadConfig.ts";

test("loadConfig derives peakpower (11 × 465 / 1000 = 5.115) and dataDir per falda", async () => {
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
