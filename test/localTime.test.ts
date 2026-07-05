import { expect, test } from "bun:test";
import { localHourWeekday } from "../src/core/time/localTime.ts";

test("ora legale estiva: Europe/Rome = UTC+2", () => {
  // 2023-07-01 05:00 UTC → 07:00 a Roma (CEST)
  const t = Date.UTC(2023, 6, 1, 5);
  expect(localHourWeekday(t, "Europe/Rome")).toEqual({ hour: 7, weekday: 5 }); // sabato
});

test("ora solare invernale: Europe/Rome = UTC+1", () => {
  // 2023-01-02 05:00 UTC → 06:00 a Roma (CET), lunedì
  const t = Date.UTC(2023, 0, 2, 5);
  expect(localHourWeekday(t, "Europe/Rome")).toEqual({ hour: 6, weekday: 0 });
});

test("il weekday segue il giorno LOCALE a cavallo di mezzanotte", () => {
  // 2023-07-01 22:00 UTC (sabato) → 2023-07-02 00:00 a Roma (domenica)
  const t = Date.UTC(2023, 6, 1, 22);
  expect(localHourWeekday(t, "Europe/Rome")).toEqual({ hour: 0, weekday: 6 });
});

test("timezone diverse danno ore diverse", () => {
  const t = Date.UTC(2023, 6, 1, 5);
  expect(localHourWeekday(t, "UTC").hour).toBe(5);
  expect(localHourWeekday(t, "Europe/Athens").hour).toBe(8);
});
