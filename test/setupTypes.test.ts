import { expect, test } from "bun:test";
import type { Viz } from "../web/src/types.ts";
import {
  type StoredSetup,
  type WizardInputs,
  parseStoredSetup,
  validateWizardInputs,
} from "../web/src/lib/setupTypes.ts";

function makeInputs(): WizardInputs {
  return {
    location: { latitude: 45.46, longitude: 9.19, label: "Milano" },
    timeZone: "Europe/Rome",
    radiationDb: "PVGIS-SARAH3",
    useHorizon: true,
    mounting: "building",
    systemLossPct: 14,
    years: { from: 2020, to: 2020 },
    falde: [{ id: "sud", azimuth: 0, tilt: 30, panelCount: 12, wp: 400 }],
  };
}

// Minimal fake viz — parseStoredSetup does not deep-validate it.
function makeViz(): Viz {
  return { meta: {}, annual: {}, monthly: [], hourly: {} } as unknown as Viz;
}

function makeStored(): StoredSetup {
  return {
    version: 1,
    savedAt: 1_700_000_000_000,
    inputs: makeInputs(),
    viz: makeViz(),
    hourlyT2m: [10, 11, 12],
  };
}

test("valido → null", () => {
  expect(validateWizardInputs(makeInputs())).toBeNull();
});

// validateWizardInputs ora ritorna CHIAVI i18n (tradotte al render dal chiamante).

test("latitudine fuori range", () => {
  const i = makeInputs();
  i.location.latitude = 91;
  expect(validateWizardInputs(i)).toBe("validate.wizard.lat");
});

test("longitudine fuori range", () => {
  const i = makeInputs();
  i.location.longitude = -181;
  expect(validateWizardInputs(i)).toBe("validate.wizard.lon");
});

test("fuso orario non valido", () => {
  const i = makeInputs();
  i.timeZone = "Mars/Olympus";
  expect(validateWizardInputs(i)).toBe("validate.wizard.timezone");
});

test("azimuth fuori range", () => {
  const i = makeInputs();
  i.falde[0]!.azimuth = 200;
  expect(validateWizardInputs(i)).toBe("validate.wizard.faldaAzimuth");
});

test("tilt fuori range", () => {
  const i = makeInputs();
  i.falde[0]!.tilt = 95;
  expect(validateWizardInputs(i)).toBe("validate.wizard.faldaTilt");
});

test("panelCount < 1", () => {
  const i = makeInputs();
  i.falde[0]!.panelCount = 0;
  expect(validateWizardInputs(i)).toBe("validate.wizard.faldaPanelCount");
});

test("panelCount non intero", () => {
  const i = makeInputs();
  i.falde[0]!.panelCount = 3.5;
  expect(validateWizardInputs(i)).toBe("validate.wizard.faldaPanelCount");
});

test("wp fuori range", () => {
  const i = makeInputs();
  i.falde[0]!.wp = 40;
  expect(validateWizardInputs(i)).toBe("validate.wizard.faldaWp");
});

test("systemLossPct fuori range", () => {
  const i = makeInputs();
  i.systemLossPct = 50;
  expect(validateWizardInputs(i)).toBe("validate.wizard.systemLoss");
});

test("anni fuori intervallo per il db", () => {
  const i = makeInputs();
  i.years = { from: 2004, to: 2004 };
  expect(validateWizardInputs(i)).toBe("validate.wizard.yearsRange");
});

test("from > to", () => {
  const i = makeInputs();
  i.years = { from: 2021, to: 2020 };
  expect(validateWizardInputs(i)).toBe("validate.wizard.yearsOrder");
});

test("nessuna falda", () => {
  const i = makeInputs();
  i.falde = [];
  expect(validateWizardInputs(i)).toBe("validate.wizard.faldeMin");
});

test("id falda vuoto", () => {
  const i = makeInputs();
  i.falde[0]!.id = "";
  expect(validateWizardInputs(i)).toBe("validate.wizard.faldaIdEmpty");
});

test("id falde duplicati", () => {
  const i = makeInputs();
  i.falde = [
    { id: "sud", azimuth: 0, tilt: 30, panelCount: 12, wp: 400 },
    { id: "sud", azimuth: 90, tilt: 30, panelCount: 12, wp: 400 },
  ];
  expect(validateWizardInputs(i)).toBe("validate.wizard.faldaIdDup");
});

test("parseStoredSetup: round-trip di un setup valido", () => {
  const s = makeStored();
  const parsed = parseStoredSetup(JSON.stringify(s));
  expect(parsed.version).toBe(1);
  expect(parsed.savedAt).toBe(s.savedAt);
  expect(parsed.inputs.location.label).toBe("Milano");
  expect(parsed.hourlyT2m).toEqual([10, 11, 12]);
});

test("parseStoredSetup: version ≠ 1 → throw", () => {
  const bad = { ...makeStored(), version: 2 };
  expect(() => parseStoredSetup(JSON.stringify(bad))).toThrow();
});

test("parseStoredSetup: JSON illeggibile → throw", () => {
  expect(() => parseStoredSetup("{not json")).toThrow();
});

test("parseStoredSetup: inputs mancante → throw", () => {
  const bad = { version: 1, savedAt: 1, viz: makeViz(), hourlyT2m: [] };
  expect(() => parseStoredSetup(JSON.stringify(bad))).toThrow();
});

test("parseStoredSetup: hourlyT2m non array → throw", () => {
  const bad = { ...makeStored(), hourlyT2m: "nope" };
  expect(() => parseStoredSetup(JSON.stringify(bad))).toThrow();
});

test("parseStoredSetup: savedAt non numero → throw", () => {
  const bad = { ...makeStored(), savedAt: "ieri" };
  expect(() => parseStoredSetup(JSON.stringify(bad))).toThrow();
});
