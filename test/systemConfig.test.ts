import { expect, test } from "bun:test";
import type { Viz } from "../web/src/types.ts";
import {
  type SystemConfigB,
  batteryUsableKwh,
  cloneFromBaseline,
  equalsBaseline,
  equalsSystems,
  keepIfEquivalent,
  noPvConfig,
  parseSystemConfigB,
  serialize,
  totalPeakKwp,
  validateAgainstBaseline,
} from "../web/src/lib/systemConfig.ts";

function makeViz(): Viz {
  return {
    meta: {
      acCapKw: 6,
      batteryUsableKwh: 10.24,
      batteryTotalKwh: 10.24,
      batteryUsablePct: 100,
      batteryRoundTrip: 0.9,
      batteryCoupling: "dc",
      installationCostEur: 16000,
      falde: [
        { id: "est", azimuth: -45, peakKwp: 5.115, panelCount: 11, wp: 465 },
        { id: "ovest", azimuth: 45, peakKwp: 5.115, panelCount: 11, wp: 465 },
      ],
    },
  } as unknown as Viz;
}

test("cloneFromBaseline takes total + usable% from viz.meta (not a hardcoded 100)", () => {
  const cfg = cloneFromBaseline(makeViz());
  expect(cfg.batteryTotalKwh).toBeCloseTo(10.24, 2);
  expect(cfg.batteryUsablePct).toBe(100);
  expect(batteryUsableKwh(cfg)).toBeCloseTo(10.24, 2);
  expect(totalPeakKwp(cfg)).toBeCloseTo(10.23, 2);

  // a different documented usable% flows through (proves no hardcoded default)
  const viz80 = makeViz();
  viz80.meta.batteryUsablePct = 80;
  viz80.meta.batteryTotalKwh = 12.8;
  const c80 = cloneFromBaseline(viz80);
  expect(c80.batteryUsablePct).toBe(80);
  expect(batteryUsableKwh(c80)).toBeCloseTo(10.24, 2);
});

test("batteryUsableKwh = total × usable%", () => {
  const cfg = cloneFromBaseline(makeViz());
  expect(batteryUsableKwh({ ...cfg, batteryTotalKwh: 20, batteryUsablePct: 80 })).toBeCloseTo(16, 9);
  expect(batteryUsableKwh({ ...cfg, batteryTotalKwh: 0, batteryUsablePct: 100 })).toBe(0);
});

test("serialize → parse round-trips", () => {
  const cfg = cloneFromBaseline(makeViz());
  const back = parseSystemConfigB(serialize({ ...cfg, batteryTotalKwh: 15, batteryUsablePct: 90 }));
  expect(back.batteryTotalKwh).toBe(15);
  expect(back.batteryUsablePct).toBe(90);
  expect(back.falde.length).toBe(2);
});

test("parse accepts a legacy batteryUsableKwh field as total at 100%", () => {
  const cfg = parseSystemConfigB(
    JSON.stringify({ label: "x", falde: [{ id: "est", azimuth: -45, panelCount: 10, wp: 400 }], acCapKw: 6, batteryUsableKwh: 8, roundTrip: 0.9 }),
  );
  expect(cfg.batteryTotalKwh).toBe(8);
  expect(cfg.batteryUsablePct).toBe(100);
});

test("equalsBaseline ignores label, detects equipment changes; noPvConfig zeroes panels+battery", () => {
  const viz = makeViz();
  const base = cloneFromBaseline(viz);
  expect(equalsBaseline(base, viz)).toBe(true);
  expect(equalsBaseline({ ...base, label: "Altro nome" }, viz)).toBe(true); // label ignored
  expect(equalsBaseline({ ...base, batteryTotalKwh: 5 }, viz)).toBe(false);
  expect(equalsBaseline({ ...base, falde: base.falde.map((f, i) => (i === 0 ? { ...f, panelCount: 99 } : f)) }, viz)).toBe(false);

  const noPv = noPvConfig(viz);
  expect(noPv.falde.every((f) => f.panelCount === 0)).toBe(true);
  expect(noPv.batteryTotalKwh).toBe(0);
  expect(totalPeakKwp(noPv)).toBe(0);
});

test("validateAgainstBaseline accepts the clone and rejects different geometry", () => {
  const viz = makeViz();
  const cfg = cloneFromBaseline(viz);
  expect(validateAgainstBaseline(cfg, viz)).toBeNull();

  const wrongAzimuth: SystemConfigB = { ...cfg, falde: cfg.falde.map((f) => (f.id === "est" ? { ...f, azimuth: 0 } : f)) };
  expect(validateAgainstBaseline(wrongAzimuth, viz)).toBe("validate.system.faldaAzimuth");

  const missingFalda: SystemConfigB = { ...cfg, falde: [cfg.falde[0]!] };
  expect(validateAgainstBaseline(missingFalda, viz)).toBe("validate.system.geometryMismatch");

  expect(validateAgainstBaseline({ ...cfg, batteryUsablePct: 150 }, viz)).toBe("validate.system.batteryUsablePct");
});

test("coupling: default dc per file vecchi, ac se esplicito, incluso in equals", () => {
  const legacy = parseSystemConfigB(
    JSON.stringify({
      falde: [{ id: "est", azimuth: -45, panelCount: 11, wp: 465 }],
      acCapKw: 6, batteryTotalKwh: 10, batteryUsablePct: 100, roundTrip: 0.9,
    }),
  );
  expect(legacy.coupling).toBe("dc");
  const ac = parseSystemConfigB(JSON.stringify({ ...JSON.parse(serialize(legacy)), coupling: "ac" }));
  expect(ac.coupling).toBe("ac");
  expect(equalsSystems(legacy, ac)).toBe(false);
});

function makeCfg(): SystemConfigB {
  return {
    label: "Sistema A",
    falde: [{ id: "sud", azimuth: 0, panelCount: 10, wp: 450 }],
    acCapKw: 6,
    batteryTotalKwh: 10,
    batteryUsablePct: 90,
    roundTrip: 0.9,
    coupling: "dc",
    installationCostEur: 15000,
  };
}

test("keepIfEquivalent: cambia solo la label → mantiene il riferimento precedente", () => {
  const prev = makeCfg();
  const next = { ...prev, label: "Nuovo nome" };
  expect(keepIfEquivalent(prev, next)).toBe(prev);
});

test("keepIfEquivalent: cambia un campo computazionale → ritorna il nuovo", () => {
  const prev = makeCfg();
  const next = { ...prev, acCapKw: 7 };
  expect(keepIfEquivalent(prev, next)).toBe(next);
});
