import { expect, test } from "bun:test";
import { buildBatteryConfig } from "../src/core/simulation/battery.ts";
import { dispatchHour } from "../src/core/simulation/batteryDispatch.ts";

test("buildBatteryConfig splits round-trip into √ each way", () => {
  const b = buildBatteryConfig({ usableKwh: 10, pMaxKw: 6, roundTrip: 0.9 });
  expect(b.chargeEff).toBeCloseTo(Math.sqrt(0.9), 9);
  expect(b.dischargeEff).toBeCloseTo(Math.sqrt(0.9), 9);
});

const LOSSLESS = buildBatteryConfig({ usableKwh: 10, pMaxKw: 6, roundTrip: 1 });

test("charge capped by power", () => {
  const d = dispatchHour(8, 0, 0, LOSSLESS);
  expect(d.charge).toBe(6);
  expect(d.newSoc).toBe(6);
  expect(d.exportKwh).toBe(2);
});

test("charge capped by remaining capacity", () => {
  const d = dispatchHour(5, 0, 8, LOSSLESS);
  expect(d.charge).toBeCloseTo(2, 9);
  expect(d.newSoc).toBeCloseTo(10, 9);
  expect(d.exportKwh).toBeCloseTo(3, 9);
});

test("discharge covers deficit within soc and power cap", () => {
  const d = dispatchHour(0, 3, 5, LOSSLESS);
  expect(d.discharge).toBe(3);
  expect(d.newSoc).toBe(2);
  expect(d.battToLoad).toBe(3);
  expect(d.importKwh).toBe(0);
});

test("discharge capped by soc", () => {
  const d = dispatchHour(0, 5, 2, LOSSLESS);
  expect(d.discharge).toBeCloseTo(2, 9);
  expect(d.importKwh).toBeCloseTo(3, 9);
  expect(d.newSoc).toBeCloseTo(0, 9);
});

test("lossy charge stores less than it takes", () => {
  const lossy = buildBatteryConfig({ usableKwh: 10, pMaxKw: 6, roundTrip: 0.81 }); // eff 0.9
  const d = dispatchHour(5, 0, 0, lossy);
  expect(d.charge).toBeCloseTo(5, 9);
  expect(d.newSoc).toBeCloseTo(4.5, 9);
});

test("DC: il clipping carica la batteria (recovered)", () => {
  const d = dispatchHour(0, 0, 0, LOSSLESS, { clipAvailKwh: 4, dischargeHeadroomKw: Infinity });
  expect(d.charge).toBe(4);
  expect(d.recoveredClipKwh).toBe(4);
  expect(d.exportKwh).toBe(0);
  expect(d.newSoc).toBe(4);
});

test("DC: la carica preferisce il clipping, il surplus residuo va in export", () => {
  // surplus 2 + clip 3, pMax 4 → charge 4 (3 dal clip + 1 dal surplus), export 1
  const batt = buildBatteryConfig({ usableKwh: 10, pMaxKw: 4, roundTrip: 1 });
  const d = dispatchHour(2, 0, 0, batt, { clipAvailKwh: 3, dischargeHeadroomKw: Infinity });
  expect(d.charge).toBe(4);
  expect(d.recoveredClipKwh).toBe(3);
  expect(d.exportKwh).toBeCloseTo(1, 9);
});

test("DC: la scarica è limitata dall'headroom AC dell'inverter", () => {
  const d = dispatchHour(0, 5, 10, LOSSLESS, { clipAvailKwh: 0, dischargeHeadroomKw: 2 });
  expect(d.discharge).toBe(2);
  expect(d.importKwh).toBe(3);
});

test("DC: ora rara clip+deficit (carico sopra il tetto AC): carica dal clip, deficit dalla rete", () => {
  const d = dispatchHour(0, 3, 0, LOSSLESS, { clipAvailKwh: 4, dischargeHeadroomKw: 0 });
  expect(d.charge).toBe(4);
  expect(d.recoveredClipKwh).toBe(4);
  expect(d.importKwh).toBe(3);
  expect(d.discharge).toBe(0);
});

test("senza opzioni DC il comportamento è invariato e recovered=0", () => {
  const d = dispatchHour(8, 0, 0, LOSSLESS);
  expect(d.charge).toBe(6);
  expect(d.recoveredClipKwh).toBe(0);
});
