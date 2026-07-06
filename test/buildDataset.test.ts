import { expect, test } from "bun:test";
import { buildDataset, type FetchProgress } from "../web/src/lib/buildDataset.ts";
import type { WizardInputs } from "../web/src/lib/setupTypes.ts";

const HOUR_MS = 3600 * 1000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** PVGIS "YYYYMMDD:HHMM" (minute fixed at :10, as in real seriescalc). */
function pvgisTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}:${pad2(d.getUTCHours())}10`;
}

/** A synthetic seriescalc JSON spanning [yearFrom, yearTo], each row with power P (W). */
function makeSeriescalc(yearFrom: number, yearTo: number, p: number, t2m = 15): unknown {
  const hourly: unknown[] = [];
  for (let y = yearFrom; y <= yearTo; y++) {
    const start = Date.UTC(y, 0, 1, 0);
    const hours = isLeap(y) ? 8784 : 8760;
    for (let h = 0; h < hours; h++) {
      const ms = start + h * HOUR_MS;
      hourly.push({ time: pvgisTime(ms), P: p, T2m: t2m, Int: 0 });
    }
  }
  return { outputs: { hourly } };
}

const BASE_INPUTS: WizardInputs = {
  location: { latitude: 45.4, longitude: 9.19, label: "Milano" },
  timeZone: "Europe/Rome",
  radiationDb: "PVGIS-SARAH3",
  useHorizon: true,
  mounting: "building",
  systemLossPct: 14,
  years: { from: 2023, to: 2023 },
  falde: [
    { id: "sud", azimuth: 0, tilt: 30, panelCount: 10, wp: 400 }, // 4 kWp
    { id: "est", azimuth: -90, tilt: 20, panelCount: 5, wp: 400 }, // 2 kWp
  ],
};

/** fetch mock that records URLs and serves per-falda JSON keyed by the `aspect` param. */
function mockFetch(pByAzimuth: Record<number, number>, yearFrom: number, yearTo: number) {
  const calls: string[] = [];
  const fn: typeof fetch = ((input: string | URL | Request) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(urlStr);
    const aspect = Number(new URL(urlStr, "http://x").searchParams.get("aspect"));
    const p = pByAzimuth[aspect] ?? 0;
    return Promise.resolve(new Response(JSON.stringify(makeSeriescalc(yearFrom, yearTo, p)), { status: 200 }));
  }) as typeof fetch;
  return { fn, calls };
}

// --- (a) correct URLs for 2 falde ---------------------------------------------

test("buildDataset requests one correct /api/pvgis URL per falda", async () => {
  const { fn, calls } = mockFetch({ 0: 800, [-90]: 500 }, 2023, 2023);
  await buildDataset(BASE_INPUTS, () => {}, fn);

  expect(calls.length).toBe(2);

  const u0 = new URL(calls[0]!, "http://x");
  expect(u0.pathname).toBe("/api/pvgis");
  expect(Object.fromEntries(u0.searchParams)).toEqual({
    tool: "seriescalc",
    lat: "45.4",
    lon: "9.19",
    raddatabase: "PVGIS-SARAH3",
    usehorizon: "1",
    outputformat: "json",
    browser: "0",
    pvcalculation: "1",
    peakpower: "4",
    mountingplace: "building",
    loss: "14",
    angle: "30",
    aspect: "0",
    startyear: "2023",
    endyear: "2023",
    components: "1",
  });

  const u1 = new URL(calls[1]!, "http://x");
  expect(Object.fromEntries(u1.searchParams)).toMatchObject({
    peakpower: "2",
    angle: "20",
    aspect: "-90",
  });
});

// --- (b) progress order --------------------------------------------------------

test("buildDataset emits progress in order: start/done per falda then building", async () => {
  const { fn } = mockFetch({ 0: 800, [-90]: 500 }, 2023, 2023);
  const events: FetchProgress[] = [];
  await buildDataset(BASE_INPUTS, (p) => events.push(p), fn);

  expect(events).toEqual([
    { kind: "falda-start", id: "sud", index: 0, total: 2 },
    { kind: "falda-done", id: "sud" },
    { kind: "falda-start", id: "est", index: 1, total: 2 },
    { kind: "falda-done", id: "est" },
    { kind: "building" },
  ]);
});

// --- (c) viz shape & scaling ---------------------------------------------------

test("buildDataset viz: consumptionSource none, per-falda P/1000, zero load", async () => {
  const { fn } = mockFetch({ 0: 800, [-90]: 500 }, 2023, 2023);
  const { viz } = await buildDataset(BASE_INPUTS, () => {}, fn);

  expect(viz.meta.consumptionSource).toBe("none");
  expect(viz.meta.consumptionNote).toBe("");
  expect(viz.meta.year).toBe(2023);
  expect(viz.meta.yearLabel).toBe("2023");
  expect(viz.hourly.timestampsUtc.length).toBe(8760);

  const sud = viz.hourly.falde.find((f) => f.id === "sud")!;
  const est = viz.hourly.falde.find((f) => f.id === "est")!;
  expect(sud.productionKwh[0]).toBe(0.8);
  expect(est.productionKwh[0]).toBe(0.5);
  expect(sud.peakKwp).toBe(4);
  expect(est.peakKwp).toBe(2);

  // combined practical = 0.8 + 0.5, no clipping (acCap = round(4+2) = 6 kW).
  expect(viz.meta.acCapKw).toBe(6);
  expect(viz.hourly.productionPracticalKwh[0]).toBeCloseTo(1.3, 6);

  expect(viz.hourly.loadKwh.every((x) => x === 0)).toBe(true);
  expect(viz.meta.batteryTotalKwh).toBe(0);
  expect(viz.meta.batteryCoupling).toBe("dc");
  expect(viz.meta.incentive).toEqual({ mode: "percent", value: 50, years: 10 });
});

test("buildDataset returns hourlyT2m from falda[0] post typical-year", async () => {
  const { fn } = mockFetch({ 0: 800, [-90]: 500 }, 2023, 2023);
  const { hourlyT2m } = await buildDataset(BASE_INPUTS, () => {}, fn);
  expect(hourlyT2m.length).toBe(8760);
  expect(hourlyT2m[0]).toBe(15);
});

// --- (d) file-drop path (no fetch for covered falda) ---------------------------

test("buildDataset skips fetch for a falda provided via files map", async () => {
  const { fn, calls } = mockFetch({ [-90]: 500 }, 2023, 2023);
  const files = new Map<string, unknown>([["sud", makeSeriescalc(2023, 2023, 800)]]);
  const events: FetchProgress[] = [];
  const { viz } = await buildDataset(BASE_INPUTS, (p) => events.push(p), fn, files);

  // only "est" was fetched
  expect(calls.length).toBe(1);
  expect(new URL(calls[0]!, "http://x").searchParams.get("aspect")).toBe("-90");
  // progress still emitted for both
  expect(events).toEqual([
    { kind: "falda-start", id: "sud", index: 0, total: 2 },
    { kind: "falda-done", id: "sud" },
    { kind: "falda-start", id: "est", index: 1, total: 2 },
    { kind: "falda-done", id: "est" },
    { kind: "building" },
  ]);
  const sud = viz.hourly.falde.find((f) => f.id === "sud")!;
  expect(sud.productionKwh[0]).toBe(0.8);
});

// --- (e) non-ok fetch → reject with status -------------------------------------

test("buildDataset rejects with status when PVGIS responds non-ok", async () => {
  const fn: typeof fetch = (() =>
    Promise.resolve(new Response("Message: location over the sea", { status: 500 }))) as typeof fetch;
  await expect(buildDataset(BASE_INPUTS, () => {}, fn)).rejects.toThrow(/500/);
  await expect(buildDataset(BASE_INPUTS, () => {}, fn)).rejects.toThrow(/over the sea/);
});

// --- (f) multi-year → typical year + label -------------------------------------

test("buildDataset averages a multi-year request into a single typical year", async () => {
  const inputs: WizardInputs = { ...BASE_INPUTS, years: { from: 2022, to: 2023 } };
  const { fn, calls } = mockFetch({ 0: 800, [-90]: 500 }, 2022, 2023);
  const { viz, hourlyT2m } = await buildDataset(inputs, () => {}, fn);

  expect(new URL(calls[0]!, "http://x").searchParams.get("startyear")).toBe("2022");
  expect(new URL(calls[0]!, "http://x").searchParams.get("endyear")).toBe("2023");
  expect(viz.hourly.timestampsUtc.length).toBe(8760);
  expect(hourlyT2m.length).toBe(8760);
  expect(viz.meta.year).toBe(2022); // axis = first non-leap year in range
  expect(viz.meta.yearLabel).toBe("media 2022–2023"); // en-dash
});
