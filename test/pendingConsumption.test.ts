import { expect, test } from "bun:test";
import { buildPendingSetup, type PendingConsumptionState } from "../web/src/lib/pendingConsumption.ts";
import { HOUSE_DEFAULTS } from "../src/core/consumption/houseLoad.ts";
import type { MonthlyTemplate } from "../src/core/consumption/monthlyTemplate.ts";
import type { CanonicalConsumption } from "../src/core/consumption/canonical.ts";
import type { StoredSetup } from "../web/src/lib/setupTypes.ts";
import type { Viz } from "../web/src/types.ts";

// web/viz.json (personale, gitignored) se esiste, altrimenti il demo tracciato.
const vizFile = Bun.file("web/viz.json");
const baseViz = (await ((await vizFile.exists()) ? vizFile : Bun.file("web/viz.demo.json")).json()) as Viz;

function makeSetup(hourlyT2m: number[] = []): StoredSetup {
  const viz = structuredClone(baseViz);
  return {
    version: 1,
    savedAt: 111,
    inputs: { timeZone: viz.meta.timeZone },
    viz,
    hourlyT2m,
  } as unknown as StoredSetup;
}

const template: MonthlyTemplate = {
  months: Array.from({ length: 12 }, () => ({ dailyKwh: 10, shape: "morningEvening" as const })),
  weekendFactor: 1,
};

function state(p: Partial<PendingConsumptionState>): PendingConsumptionState {
  return { method: "monthly", template, house: HOUSE_DEFAULTS, csv: null, ...p };
}

test("monthly valido → StoredSetup con consumi applicati", () => {
  const setup = makeSetup();
  const out = buildPendingSetup(setup, state({ method: "monthly" }));
  expect(out).not.toBeNull();
  expect(out!.consumption?.spec).toEqual({ method: "monthly", template });
  expect(out!.viz.hourly.loadKwh.some((v) => v > 0)).toBe(true);
});

test("parametric senza hourlyT2m → null (equivale a Salta)", () => {
  const setup = makeSetup([]);
  expect(buildPendingSetup(setup, state({ method: "parametric" }))).toBeNull();
});

test("parametric con T2m → StoredSetup applicato", () => {
  const setup = makeSetup(new Array(baseViz.hourly.loadKwh.length).fill(12));
  const out = buildPendingSetup(setup, state({ method: "parametric" }));
  expect(out).not.toBeNull();
  expect(out!.consumption?.spec).toEqual({ method: "parametric", house: HOUSE_DEFAULTS });
});

test("csv senza file caricato → null", () => {
  expect(buildPendingSetup(makeSetup(), state({ method: "csv", csv: null }))).toBeNull();
});

test("csv con risultato valido → StoredSetup applicato", () => {
  const setup = makeSetup();
  const n = setup.viz.hourly.loadKwh.length;
  const result: CanonicalConsumption = {
    hourlyKwh: new Array(n).fill(0.4),
    meta: { source: "csv", label: "CSV c.csv", annualKwh: 0.4 * n, coveragePct: 100 },
  };
  const out = buildPendingSetup(setup, state({ method: "csv", csv: { filename: "c.csv", result } }));
  expect(out).not.toBeNull();
  expect(out!.consumption?.spec).toEqual({ method: "csv", filename: "c.csv" });
});
