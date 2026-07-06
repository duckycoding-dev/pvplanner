/**
 * Adapter del metodo parametrico: HouseParams + dataset → forma canonica, tramite il
 * modello fisico deterministico `syntheticHouseLoad` (docs/07-consumi.md). NESSUNA
 * generazione LLM a runtime: solo il modello fisico. La temperatura oraria del sito
 * viene da `setup.hourlyT2m` (serie reale del sito, NON presente nel viz).
 */
import { type HouseParams, syntheticHouseLoad } from "../../../src/core/consumption/houseLoad.ts";
import type { CanonicalConsumption } from "../../../src/core/consumption/canonical.ts";
import type { StoredSetup } from "./setupTypes.ts";

/** Testo obbligatorio: la stima parametrica non è misurata (vedi vincoli globali Fase 2). */
export const PARAMETRIC_DISCLAIMER =
  "Stima approssimativa calcolata dai parametri inseriti: non sono dati reali, usala come ordine di grandezza.";

export function parametricConsumption(house: HouseParams, setup: StoredSetup): CanonicalConsumption {
  const series = syntheticHouseLoad(
    {
      timestampsUtc: setup.viz.hourly.timestampsUtc,
      months: setup.viz.hourly.months,
      t2m: setup.hourlyT2m, // serie reale del sito, non da viz
      timeZone: setup.inputs.timeZone,
    },
    house,
  );
  return {
    hourlyKwh: [...series.loadKwh],
    meta: {
      source: "parametric",
      label: "Stima parametrica",
      annualKwh: series.annualKwh,
      coveragePct: 100,
      disclaimer: PARAMETRIC_DISCLAIMER,
    },
  };
}
