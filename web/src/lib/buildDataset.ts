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

/** peakKwp di una falda: numero pannelli × Wp / 1000. */
function faldaPeakKwp(f: WizardInputs["falde"][number]): number {
  return (f.panelCount * f.wp) / 1000;
}

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
    peakpower: String(faldaPeakKwp(falda)),
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
 * `acCapKw` è un seed (Σ peakKwp arrotondata, ≥ 1) che l'utente edita nell'editor sistemi.
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
    const peakKwp = faldaPeakKwp(falda);
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

    const { series } = parseFaldaHourly(file, { id: falda.id, azimuth: falda.azimuth, peakKwp }, `PVGIS falda "${falda.id}"`);
    hourly.push(from < to ? typicalYear(series, from, to) : series);
    onProgress({ kind: "falda-done", id: falda.id });
  }

  onProgress({ kind: "building" });

  // referenceYear = anno dell'asse della serie tipica (post typical-year).
  const base = hourly[0]!;
  const referenceYear = new Date(base.timestampsUtc[0]!).getUTCFullYear();

  const totalPeakKwp = inputs.falde.reduce((s, f) => s + faldaPeakKwp(f), 0);
  const defaultAcCap = Math.max(1, Math.round(totalPeakKwp));

  const result = buildProductionSeries({ hourly, power: [], acCapKw: defaultAcCap, year: referenceYear });

  const yearLabel = from < to ? `media ${from}${EN_DASH}${to}` : String(from);

  const meta: VizMetaInput = {
    year: referenceYear,
    yearLabel,
    timeZone: inputs.timeZone,
    acCapKw: defaultAcCap,
    batteryTotalKwh: 0,
    batteryUsablePct: 0,
    batteryPortKw: defaultAcCap,
    batteryRoundTrip: 0.9,
    batteryCoupling: "dc",
    installationCostEur: 0,
    incentive: WIZARD_INCENTIVE,
    falde: inputs.falde.map((f) => ({
      id: f.id,
      azimuth: f.azimuth,
      peakKwp: faldaPeakKwp(f),
      panelCount: f.panelCount,
      wp: f.wp,
    })),
    consumptionSource: "none",
    consumptionNote: "",
    multiyearKwh: 0,
  };

  const viz = buildVizObject({ result, hourly }, null, meta) as Viz;
  return { viz, hourlyT2m: [...base.t2m] };
}
