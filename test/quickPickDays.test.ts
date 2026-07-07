import { expect, test } from "bun:test";
import { combineSeries, quickPickDays } from "../web/src/lib/quickPickDays.ts";

/** Serie oraria di `days` giorni con i totali giornalieri dati (tutto nella prima ora). */
function hourlyFromDaily(daily: number[]): number[] {
  const out = new Array<number>(daily.length * 24).fill(0);
  daily.forEach((v, d) => {
    out[d * 24] = v;
  });
  return out;
}

test("maxClipping è null quando il clipping è zero tutto l'anno (bottone da disabilitare)", () => {
  const picks = quickPickDays({
    productionPracticalKwh: hourlyFromDaily([1, 2, 3]),
    clippingKwh: hourlyFromDaily([0, 0, 0]),
  });
  expect(picks.maxClipping).toBeNull();
  expect(picks.maxProduction).toBe(2);
  expect(picks.minProduction).toBe(0);
});

test("maxClipping trova il giorno col clipping massimo", () => {
  const picks = quickPickDays({
    productionPracticalKwh: hourlyFromDaily([1, 1, 1]),
    clippingKwh: hourlyFromDaily([0, 0.5, 0.2]),
  });
  expect(picks.maxClipping).toBe(1);
});

test("combineSeries somma elemento per elemento (lunghezze diverse tollerate)", () => {
  expect(combineSeries([1, 2, 3], [10, 20])).toEqual([11, 22, 3]);
});

test("scenario confronto: baseline senza clipping ma A+B clippano → giorno giusto, non 0", () => {
  // Riproduce il bug: la baseline ha clipping zero (→ prima era sempre giorno 0);
  // le serie per-sistema clippano al giorno 2.
  const clipA = hourlyFromDaily([0, 0, 0.4]);
  const clipB = hourlyFromDaily([0, 0, 0.1]);
  const prod = hourlyFromDaily([1, 1, 1]);
  const picks = quickPickDays({
    productionPracticalKwh: combineSeries(prod, prod),
    clippingKwh: combineSeries(clipA, clipB),
  });
  expect(picks.maxClipping).toBe(2);
});
