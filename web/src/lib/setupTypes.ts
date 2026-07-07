import { ALLOWED_YEARS } from "../../../src/core/pvgis/allowedYears.ts";
import type { CanonicalConsumption } from "../../../src/core/consumption/canonical.ts";
import type { MonthlyTemplate } from "../../../src/core/consumption/monthlyTemplate.ts";
import type { HouseParams } from "../../../src/core/consumption/houseLoad.ts";
import type { Viz } from "../types.ts";

/** Inputs raccolti dal wizard di setup (Fase 1). */
export interface WizardInputs {
  location: { latitude: number; longitude: number; label: string };
  timeZone: string; // IANA
  radiationDb: keyof typeof ALLOWED_YEARS;
  useHorizon: boolean;
  mounting: "building" | "free";
  systemLossPct: number;
  years: { from: number; to: number }; // from === to → anno singolo
  falde: { id: string; azimuth: number; tilt: number; panelCount: number; wp: number }[];
}

export interface StoredSetup {
  version: 1;
  savedAt: number;
  inputs: WizardInputs;
  viz: Viz; // il tipo Viz è in web/src/types.ts
  /** Serie T2m oraria del sito (asse = viz.hourly.timestampsUtc, da falda[0]).
   *  NON è nel viz: serve alla Fase 2 (modello consumi parametrico). */
  hourlyT2m: number[];
  /** Consumi applicati al dataset (Fase 2). Opzionale: i setup di Fase 1 non lo hanno.
   *  Il CSV grezzo NON si salva: solo la spec del metodo + il risultato canonico. */
  consumption?: { spec: ConsumptionSpec; result: CanonicalConsumption };
}

/** Come sono stati inseriti i consumi. Il risultato canonico è salvato a parte in `consumption.result`. */
export type ConsumptionSpec =
  | { method: "csv"; filename: string } // il CSV grezzo NON si salva: solo il risultato
  | { method: "monthly"; template: MonthlyTemplate }
  | { method: "parametric"; house: HouseParams };

/**
 * Valida gli input del wizard. Ritorna una CHIAVE i18n sul primo problema trovato,
 * oppure null se tutto è valido; il chiamante traduce con `t()` al render. I dettagli
 * dinamici (id falda, fuso, intervallo anni) sono omessi dai messaggi per restare
 * traducibili senza interpolazione — vedi web/src/i18n.
 */
export function validateWizardInputs(i: WizardInputs): string | null {
  const { latitude, longitude } = i.location;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return "validate.wizard.lat";
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return "validate.wizard.lon";
  }

  if (!Intl.supportedValuesOf("timeZone").includes(i.timeZone)) {
    return "validate.wizard.timezone";
  }

  if (i.systemLossPct < 0 || i.systemLossPct > 40) {
    return "validate.wizard.systemLoss";
  }

  const range = ALLOWED_YEARS[i.radiationDb];
  if (range === undefined) {
    return "validate.wizard.radiationDb";
  }
  if (i.years.from < range.min || i.years.from > range.max || i.years.to < range.min || i.years.to > range.max) {
    return "validate.wizard.yearsRange";
  }
  if (i.years.from > i.years.to) {
    return "validate.wizard.yearsOrder";
  }

  if (i.falde.length < 1) {
    return "validate.wizard.faldeMin";
  }
  const seen = new Set<string>();
  for (const f of i.falde) {
    if (f.id.trim().length === 0) {
      return "validate.wizard.faldaIdEmpty";
    }
    if (seen.has(f.id)) {
      return "validate.wizard.faldaIdDup";
    }
    seen.add(f.id);
    if (f.azimuth < -180 || f.azimuth > 180) {
      return "validate.wizard.faldaAzimuth";
    }
    if (f.tilt < 0 || f.tilt > 90) {
      return "validate.wizard.faldaTilt";
    }
    if (!Number.isInteger(f.panelCount) || f.panelCount < 1) {
      return "validate.wizard.faldaPanelCount";
    }
    if (f.wp < 50 || f.wp > 1000) {
      return "validate.wizard.faldaWp";
    }
  }

  return null;
}

/**
 * Parse di uno StoredSetup serializzato con JSON.stringify. Verifica i campi
 * principali (version === 1, savedAt numero, inputs oggetto, viz oggetto,
 * hourlyT2m array) e lancia con messaggio chiaro se malformato. Il viz è nostro
 * output e non viene validato in profondità.
 */
export function parseStoredSetup(json: string): StoredSetup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("Setup non valido: JSON non leggibile.");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Setup non valido: atteso un oggetto.");
  }
  const o = raw as Record<string, unknown>;
  if (o["version"] !== 1) {
    throw new Error(`Setup non valido: versione ${String(o["version"])} non supportata (attesa 1).`);
  }
  if (typeof o["savedAt"] !== "number" || Number.isNaN(o["savedAt"])) {
    throw new Error("Setup non valido: 'savedAt' deve essere un numero.");
  }
  if (typeof o["inputs"] !== "object" || o["inputs"] === null) {
    throw new Error("Setup non valido: 'inputs' mancante.");
  }
  if (typeof o["viz"] !== "object" || o["viz"] === null) {
    throw new Error("Setup non valido: 'viz' mancante.");
  }
  if (!Array.isArray(o["hourlyT2m"])) {
    throw new Error("Setup non valido: 'hourlyT2m' deve essere un array.");
  }
  const setup: StoredSetup = {
    version: 1,
    savedAt: o["savedAt"],
    inputs: o["inputs"] as WizardInputs,
    viz: o["viz"] as Viz,
    hourlyT2m: o["hourlyT2m"] as number[],
  };
  // consumption è opzionale (assente nei setup di Fase 1): non validato in profondità.
  if (typeof o["consumption"] === "object" && o["consumption"] !== null) {
    setup.consumption = o["consumption"] as StoredSetup["consumption"];
  }
  return setup;
}
