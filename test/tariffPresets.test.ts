import { expect, test } from "bun:test";
import { priceForHour } from "../src/core/economics/tariff.ts";
import { defaultTariff, f1f2f3Tariff, parseTariff, serializeTariff, validateTariff } from "../web/src/lib/tariffPresets.ts";

test("default tariff is monorario (default price everywhere)", () => {
  const t = defaultTariff();
  expect(t.bands.length).toBe(0);
  expect(priceForHour(t, 3, 6)).toBe(t.defaultBuyPrice);
});

test("F1/F2/F3 preset prices the canonical slots", () => {
  const t = f1f2f3Tariff();
  const f1 = t.bands.find((b) => b.name === "F1")!.buyPrice;
  const f2 = t.bands.find((b) => b.name === "F2")!.buyPrice;
  expect(priceForHour(t, 10, 2)).toBe(f1); // Wed 10:00 = F1
  expect(priceForHour(t, 20, 0)).toBe(f2); // Mon 20:00 = F2
  expect(priceForHour(t, 21, 5)).toBe(f2); // Sat 21:00 = F2
  expect(priceForHour(t, 3, 6)).toBe(t.defaultBuyPrice); // Sun night = F3
});

test("serialize → parse round-trips and validate passes", () => {
  const t = f1f2f3Tariff();
  const back = parseTariff(serializeTariff(t));
  expect(back.bands.length).toBe(t.bands.length);
  expect(validateTariff(back)).toBeNull();
  expect(validateTariff({ ...t, defaultBuyPrice: -1 })).toContain("default");
});
