import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/loadConfig.ts";
import { fromRoot } from "../src/paths.ts";
import { readJson } from "../src/io/readJson.ts";
import { buildUrl, dailyParams, hourlyParams, monthlyParams, powerParams, type QueryParams } from "../src/fetch/urlBuilder.ts";
import {
  dailyParamsFromFile,
  hourlyParamsFromFile,
  monthlyParamsFromFile,
  powerParamsFromFile,
} from "../src/fetch/paramsFromInputs.ts";

/** Every key reconstructed from the file's inputs must equal the builder's value. */
function expectSubset(built: QueryParams, reconstructed: QueryParams): void {
  for (const [k, v] of Object.entries(reconstructed)) {
    expect(`${k}=${built[k]}`).toBe(`${k}=${v}`);
  }
}

test("hourly params round-trip against existing files (both falde)", async () => {
  const cfg = await loadConfig();
  for (const falda of cfg.resolvedFalde) {
    const file = await readJson(`${falda.dataDir}/hourly.json`);
    expectSubset(hourlyParams(cfg, falda), hourlyParamsFromFile(file));
  }
});

test("power params round-trip against existing files", async () => {
  const cfg = await loadConfig();
  for (const falda of cfg.resolvedFalde) {
    const file = await readJson(`${falda.dataDir}/power.json`);
    expectSubset(powerParams(cfg, falda), powerParamsFromFile(file));
  }
});

test("daily params round-trip (12 months × both falde)", async () => {
  const cfg = await loadConfig();
  for (const falda of cfg.resolvedFalde) {
    for (let m = 1; m <= 12; m++) {
      const nn = String(m).padStart(2, "0");
      const file = await readJson(`${falda.dataDir}/daily_${nn}.json`);
      expectSubset(dailyParams(cfg, falda, m), dailyParamsFromFile(file));
    }
  }
});

test("monthly generic params round-trip", async () => {
  const cfg = await loadConfig();
  const file = await readJson(fromRoot("data", "generic", "monthly.json"));
  expectSubset(monthlyParams(cfg), monthlyParamsFromFile(file));
});

test("hourly params have the expected fixed values (est, az -45)", async () => {
  const cfg = await loadConfig();
  const est = cfg.resolvedFalde.find((f) => f.id === "est")!;
  const p = hourlyParams(cfg, est);
  expect(p.pvcalculation).toBe("1");
  expect(p.components).toBe("1");
  expect(p.pvtechchoice).toBe("crystSi2025");
  expect(p.mountingplace).toBe("building");
  expect(p.aspect).toBe("-45");
  expect(p.angle).toBe("25");
  expect(p.peakpower).toBe("5.115");
  expect(p.loss).toBe("14");
  expect(p.startyear).toBe("2023");
  expect(p.endyear).toBe("2023");
});

test("daily/power/monthly carry their tool-specific flags", async () => {
  const cfg = await loadConfig();
  const est = cfg.resolvedFalde.find((f) => f.id === "est")!;
  const d = dailyParams(cfg, est, 6);
  expect(d.month).toBe("6");
  expect(d.localtime).toBe("1");
  expect(d.global).toBe("1");
  expect(d.showtemperatures).toBe("1");
  expect(d.peakpower).toBeUndefined();

  const pw = powerParams(cfg, est);
  expect(pw.fixed).toBe("1");
  expect(pw.startyear).toBeUndefined(); // full DB range
  expect(pw.pvcalculation).toBeUndefined();

  const mo = monthlyParams(cfg);
  expect(mo.selectrad).toBe("1");
  expect(mo.aspect).toBeUndefined(); // MRcalc has no aspect param (South only)
  expect(mo.d2g).toBe("1");
  expect(mo.avtemp).toBe("1");
});

test("buildUrl forms a valid PVGIS URL", () => {
  const url = buildUrl("https://re.jrc.ec.europa.eu/api/v5_3", "seriescalc", { lat: "41.902", aspect: "-45" });
  expect(url).toBe("https://re.jrc.ec.europa.eu/api/v5_3/seriescalc?lat=41.902&aspect=-45");
});
