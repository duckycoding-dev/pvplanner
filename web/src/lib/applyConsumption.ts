/**
 * Applica dei consumi (in forma canonica) a un dataset: sostituisce viz.hourly.loadKwh,
 * aggiorna i metadati consumo e RICALCOLA i blocchi baked nb/wb (annual/monthly/hourly)
 * col motore esistente, così che l'invariante golden regga:
 *   deriveMonoViz(viz, cloneFromBaseline(viz)) riproduce i blocchi baked.
 *
 * La strada scelta (fra le opzioni di Fase 1) è la più diretta e auto-consistente:
 * si costruisce il viz con il nuovo carico e si delega a `deriveMonoViz` con la config
 * baseline (`cloneFromBaseline`) la ricostruzione di produzione + scenari; il suo output
 * (`vizA`) È il nuovo viz baked. Così ri-derivare dallo stesso viz riproduce identici i
 * blocchi (invariante esatta), senza duplicare la logica di simulazione.
 *
 * Pura: nessun salvataggio (IndexedDB lo fa il chiamante). Non muta lo `setup` in ingresso.
 */
import type { CanonicalConsumption } from "../../../src/core/consumption/canonical.ts";
import type { ConsumptionSpec, StoredSetup } from "./setupTypes.ts";
import { deriveMonoViz } from "./monoView.ts";
import { cloneFromBaseline } from "./systemConfig.ts";

function r3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Nota mostrata in dashboard: etichetta (+ copertura se CSV) (+ disclaimer se parametrico). */
function buildNote(result: CanonicalConsumption): string {
  let note = result.meta.label;
  if (result.meta.source === "csv") {
    note += ` · copertura ${result.meta.coveragePct}%`;
  } else if (result.meta.source === "parametric" && result.meta.disclaimer) {
    note += ` · ${result.meta.disclaimer}`;
  }
  return note;
}

export function applyConsumption(
  setup: StoredSetup,
  spec: ConsumptionSpec,
  result: CanonicalConsumption,
): StoredSetup {
  const viz = structuredClone(setup.viz);

  viz.hourly.loadKwh = result.hourlyKwh.map(r3);
  const annualKwh = r3(viz.hourly.loadKwh.reduce((s, v) => s + v, 0));
  viz.meta.consumptionSource = result.meta.source;
  viz.meta.consumptionAnnualKwh = annualKwh;
  viz.meta.consumptionNote = buildNote(result);

  // Ricostruisce produzione + scenari nb/wb sul nuovo carico, config = baseline.
  const { vizA } = deriveMonoViz(viz, cloneFromBaseline(viz));

  return {
    ...setup,
    viz: vizA,
    consumption: { spec, result },
  };
}
