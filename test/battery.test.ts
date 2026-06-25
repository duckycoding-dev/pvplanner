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
