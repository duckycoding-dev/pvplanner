import { expandMonthlyTemplate, type MonthlyTemplate } from "../../../src/core/consumption/monthlyTemplate.ts";
import type { HouseParams } from "../../../src/core/consumption/houseLoad.ts";
import { type CanonicalConsumption, validateCanonical } from "../../../src/core/consumption/canonical.ts";
import { parametricConsumption } from "./parametricConsumption.ts";
import { applyConsumption } from "./applyConsumption.ts";
import type { ConsumptionSpec, StoredSetup } from "./setupTypes.ts";

/** Stato corrente dell'editor consumi (metodo attivo + form dei tre metodi). */
export interface PendingConsumptionState {
  method: "csv" | "monthly" | "parametric";
  template: MonthlyTemplate;
  house: HouseParams;
  csv: { filename: string; result: CanonicalConsumption } | null;
}

/**
 * Candidato «consumi correnti» del wizard: ciò che il bottone «Fine» applica.
 * null = niente di valido da applicare (equivale a «Salta»). Non lancia mai:
 * qualunque errore del modello/validazione degrada a null.
 */
export function buildPendingSetup(setup: StoredSetup, s: PendingConsumptionState): StoredSetup | null {
  try {
    let spec: ConsumptionSpec;
    let result: CanonicalConsumption;
    if (s.method === "monthly") {
      spec = { method: "monthly", template: s.template };
      result = expandMonthlyTemplate(s.template, setup.viz.hourly.timestampsUtc, setup.viz.hourly.months, setup.inputs.timeZone);
    } else if (s.method === "parametric") {
      if (setup.hourlyT2m.length === 0) return null;
      spec = { method: "parametric", house: s.house };
      result = parametricConsumption(s.house, setup);
    } else {
      if (s.csv === null) return null;
      spec = { method: "csv", filename: s.csv.filename };
      result = s.csv.result;
    }
    if (validateCanonical(result, setup.viz.hourly.timestampsUtc.length) !== null) return null;
    return applyConsumption(setup, spec, result);
  } catch {
    return null;
  }
}
