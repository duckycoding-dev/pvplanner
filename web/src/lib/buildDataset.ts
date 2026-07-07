import { parseFaldaHourly } from "../../../src/core/pvgis/parseHourly.ts";
import { typicalYear } from "../../../src/core/pvgis/typicalYear.ts";
import { buildProductionSeries } from "../../../src/core/production/buildProductionSeries.ts";
import { buildVizObject, type VizMetaInput } from "../../../src/core/viz/buildViz.ts";
import type { HourlySeries } from "../../../src/core/types.ts";
import type { IncentiveConfig } from "../../../src/config/schema.ts";
import type { Viz } from "../types.ts";
import type { WizardInputs } from "./setupTypes.ts";

export type FetchProgress =
  | { kind: "falda-start"; id: string; index: number; total: number }
  | { kind: "falda-done"; id: string }
  | { kind: "building" };

/** Wizard incentive seed: 50% del CAPEX ripartito su 10 anni (l'utente lo edita poi). */
const WIZARD_INCENTIVE: IncentiveConfig = { mode: "percent", value: 50, years: 10 };

const EN_DASH = "–";

/** Scala di fetch: PVGIS è lineare nella potenza di picco, quindi si scarica sempre
 *  a 1 kWp per falda e i sistemi A/B riscalano le serie (runSystem). */
const FETCH_KWP = 1;

/** Seed plausibile del sistema iniziale per falda (l'utente lo edita in SystemEditor). */
const SEED_PANEL_COUNT = 10;
const SEED_WP = 450; // → 4.5 kWp/falda

/** Tetto AC di default: è un dato dell'inverter (taglia residenziale comune),
 *  non derivabile dalla potenza dei pannelli. L'utente lo corregge poi. */
const DEFAULT_AC_CAP_KW = 6;

/** Costruisce l'URL same-origin verso il proxy PVGIS per una falda. */
function seriescalcUrl(inputs: WizardInputs, falda: WizardInputs["falde"][number]): string {
  const params = new URLSearchParams({
    tool: "seriescalc",
    lat: String(inputs.location.latitude),
    lon: String(inputs.location.longitude),
    raddatabase: inputs.radiationDb,
    usehorizon: inputs.useHorizon ? "1" : "0",
    outputformat: "json",
    browser: "0",
    pvcalculation: "1",
    peakpower: String(FETCH_KWP),
    mountingplace: inputs.mounting,
    loss: String(inputs.systemLossPct),
    angle: String(falda.tilt),
    aspect: String(falda.azimuth),
    startyear: String(inputs.years.from),
    endyear: String(inputs.years.to),
    components: "1",
  });
  return `/api/pvgis?${params.toString()}`;
}

/**
 * Fetch (via /api/pvgis) + costruzione del Viz per gli input del wizard.
 * `fetchFn` è iniettabile per i test. `files` (opzionale) contiene JSON seriescalc
 * già in memoria (percorso file-drop): se una falda è presente, si salta il suo fetch.
 *
 * Le falde sono richieste in SEQUENZA (cortesia verso PVGIS). Una risposta non-ok
 * lancia un Error con status + testo PVGIS: il chiamante gestisce il retry per falda.
 *
 * Non calcola PVcalc (multi-anno) né consumi: dataset produzione-only, batteria a 0.
 * `acCapKw` è un seed fisso (6 kW: dato dell'inverter, non derivabile dalle falde);
 * il fetch è a 1 kWp/falda (PVGIS è lineare) e `meta.falde` seeda 10×450 Wp a falda:
 * l'utente imposta il sistema reale in SystemEditor, che riscala le serie.
 */
export async function buildDataset(
  inputs: WizardInputs,
  onProgress: (p: FetchProgress) => void,
  fetchFn: typeof fetch = fetch,
  files?: Map<string, unknown>,
): Promise<{ viz: Viz; hourlyT2m: number[] }> {
  const { from, to } = inputs.years;
  const hourly: HourlySeries[] = [];

  const total = inputs.falde.length;
  for (let index = 0; index < total; index++) {
    const falda = inputs.falde[index]!;
    onProgress({ kind: "falda-start", id: falda.id, index, total });

    let file: unknown;
    if (files?.has(falda.id)) {
      file = files.get(falda.id);
    } else {
      const url = seriescalcUrl(inputs, falda);
      const res = await fetchFn(url);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`PVGIS falda "${falda.id}": HTTP ${res.status} — ${body.trim()}`);
      }
      file = await res.json();
    }

    const { series } = parseFaldaHourly(file, { id: falda.id, azimuth: falda.azimuth, peakKwp: FETCH_KWP }, `PVGIS falda "${falda.id}"`);
    hourly.push(from < to ? typicalYear(series, from, to) : series);
    onProgress({ kind: "falda-done", id: falda.id });
  }

  onProgress({ kind: "building" });

  // referenceYear = anno dell'asse della serie tipica (post typical-year).
  const base = hourly[0]!;
  const referenceYear = new Date(base.timestampsUtc[0]!).getUTCFullYear();

  const result = buildProductionSeries({ hourly, power: [], acCapKw: DEFAULT_AC_CAP_KW, year: referenceYear });

  const yearLabel = from < to ? `media ${from}${EN_DASH}${to}` : String(from);

  const meta: VizMetaInput = {
    year: referenceYear,
    yearLabel,
    timeZone: inputs.timeZone,
    acCapKw: DEFAULT_AC_CAP_KW,
    batteryTotalKwh: 0,
    batteryUsablePct: 0,
    batteryPortKw: DEFAULT_AC_CAP_KW,
    batteryRoundTrip: 0.9,
    batteryCoupling: "dc",
    installationCostEur: 0,
    incentive: WIZARD_INCENTIVE,
    falde: inputs.falde.map((f) => ({
      id: f.id,
      azimuth: f.azimuth,
      peakKwp: (SEED_PANEL_COUNT * SEED_WP) / 1000,
      panelCount: SEED_PANEL_COUNT,
      wp: SEED_WP,
    })),
    consumptionSource: "none",
    consumptionNote: "",
    multiyearKwh: 0,
  };

  const viz = buildVizObject({ result, hourly }, null, meta) as Viz;
  return { viz, hourlyT2m: [...base.t2m] };
}
