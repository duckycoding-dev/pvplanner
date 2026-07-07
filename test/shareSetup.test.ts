import { expect, test } from "bun:test";
import {
  type SharedConfig,
  buildSharedConfig,
  decodeShare,
  encodeShare,
  parseSharedConfig,
  serializeSharedConfig,
} from "../web/src/lib/shareSetup.ts";
import type { WizardInputs, ConsumptionSpec } from "../web/src/lib/setupTypes.ts";
import type { SystemConfigB } from "../web/src/lib/systemConfig.ts";
import type { Tariff } from "../../src/core/economics/tariff.ts";
import type { Incentive } from "../web/src/lib/economics.ts";

function makeWizard(nFalde = 1): WizardInputs {
  const falde = Array.from({ length: nFalde }, (_, i) => ({
    id: `falda-${i + 1}`,
    azimuth: i * 45 - 45,
    tilt: 30,
    panelCount: 10 + i,
    wp: 450,
  }));
  return {
    location: { latitude: 41.902, longitude: 12.496, label: "Roma, Italia" },
    timeZone: "Europe/Rome",
    radiationDb: "PVGIS-SARAH3",
    useHorizon: true,
    mounting: "building",
    systemLossPct: 14,
    years: { from: 2020, to: 2020 },
    falde,
  };
}

function makeSystem(label: string, wizard: WizardInputs): SystemConfigB {
  return {
    label,
    falde: wizard.falde.map((f) => ({ id: f.id, azimuth: f.azimuth, panelCount: f.panelCount, wp: f.wp })),
    acCapKw: 6,
    batteryTotalKwh: 10,
    batteryUsablePct: 90,
    roundTrip: 0.9,
    coupling: "dc",
    installationCostEur: 15000,
  };
}

function makeTariff(): Tariff {
  return { label: "Monorario", bands: [], defaultBuyPrice: 0.25, sellPrice: 0.1 };
}

function makeIncentive(): Incentive {
  return { mode: "percent", value: 50, years: 10 };
}

function makeConfig(nFalde = 1, consumption?: ConsumptionSpec): SharedConfig {
  const wizard = makeWizard(nFalde);
  return buildSharedConfig({
    wizard,
    consumption,
    systemA: makeSystem("Sistema A", wizard),
    systemB: makeSystem("Sistema B", wizard),
    tariff: makeTariff(),
    incentive: makeIncentive(),
  });
}

const monthlySpec: ConsumptionSpec = {
  method: "monthly",
  template: {
    months: Array.from({ length: 12 }, () => ({ dailyKwh: 10, shape: "morningEvening" as const })),
    weekendFactor: 1,
  },
};

const parametricSpec: ConsumptionSpec = {
  method: "parametric",
  house: {
    heatedAreaM2: 120,
    specificHeatDemandKwhM2y: 90,
    occupants: 3,
    wfhOccupants: 1,
    heatPumpScop: 3.5,
    dhwKwhPerPersonY: 700,
    baseLoadAnnualKwh: 2500,
    heatingBaseTempC: 15,
    copRef: 4.5,
    copRefOutdoorC: 7,
    flowTempC: 35,
    dhwCop: 2.8,
    standbyLossPct: 4,
    bufferSmoothingHours: 3,
  },
};

test("round-trip encode/decode senza consumi", async () => {
  const c = makeConfig(1);
  const encoded = await encodeShare(c);
  const back = await decodeShare(encoded);
  expect(back).toEqual(c);
  expect(back.consumption).toBeUndefined();
});

test("round-trip con consumi monthly", async () => {
  const c = makeConfig(2, monthlySpec);
  const back = await decodeShare(await encodeShare(c));
  expect(back).toEqual(c);
  expect(back.consumption?.method).toBe("monthly");
});

test("round-trip con consumi parametric", async () => {
  const c = makeConfig(1, parametricSpec);
  const back = await decodeShare(await encodeShare(c));
  expect(back).toEqual(c);
  expect(back.consumption?.method).toBe("parametric");
});

test("il CSV non è mai incluso (scartato da buildSharedConfig)", async () => {
  const csvSpec: ConsumptionSpec = { method: "csv", filename: "consumi.csv" };
  const c = makeConfig(1, csvSpec);
  expect(c.consumption).toBeUndefined();
  const back = await decodeShare(await encodeShare(c));
  expect(back.consumption).toBeUndefined();
});

test("l'encoded è base64url (niente + / =)", async () => {
  const encoded = await encodeShare(makeConfig(3, monthlySpec));
  expect(encoded).not.toContain("+");
  expect(encoded).not.toContain("/");
  expect(encoded).not.toContain("=");
  expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
});

test("encoded < 2000 caratteri per un setup a 3 falde", async () => {
  const encoded = await encodeShare(makeConfig(3, monthlySpec));
  expect(encoded.length).toBeLessThan(2000);
});

test("decodeShare tollera il prefisso #s= / s=", async () => {
  const c = makeConfig(1);
  const encoded = await encodeShare(c);
  expect(await decodeShare(`#s=${encoded}`)).toEqual(c);
  expect(await decodeShare(`s=${encoded}`)).toEqual(c);
});

test("hash corrotto → throw", async () => {
  await expect(decodeShare("questo-non-e-un-payload-valido!!!")).rejects.toThrow();
  await expect(decodeShare("####")).rejects.toThrow();
});

test("import file JSON round-trip", () => {
  const c = makeConfig(2, parametricSpec);
  const json = serializeSharedConfig(c);
  expect(json).toContain("\n"); // leggibile (pretty)
  expect(parseSharedConfig(json)).toEqual(c);
});

test("parseSharedConfig: versione ignota → throw", () => {
  const c = makeConfig(1) as unknown as Record<string, unknown>;
  c["v"] = 2;
  expect(() => parseSharedConfig(JSON.stringify(c))).toThrow();
});

test("parseSharedConfig: wizard non valido → throw", () => {
  const c = makeConfig(1);
  c.wizard.location.latitude = 999;
  expect(() => parseSharedConfig(serializeSharedConfig(c))).toThrow();
});

test("parseSharedConfig: JSON illeggibile → throw", () => {
  expect(() => parseSharedConfig("{non json")).toThrow();
});

test("parseSharedConfig scarta un consumo csv iniettato a mano", () => {
  const c = makeConfig(1) as unknown as Record<string, unknown>;
  c["consumption"] = { method: "csv", filename: "x.csv" };
  const parsed = parseSharedConfig(JSON.stringify(c));
  expect(parsed.consumption).toBeUndefined();
});
