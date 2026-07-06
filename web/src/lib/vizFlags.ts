import type { Viz } from "../types.ts";

/**
 * True quando il dataset porta consumi utilizzabili per le analisi economiche/batteria.
 * Un setup "solo produzione" ha `consumptionSource === "none"` (nessun modello consumi)
 * oppure un consumo annuo nullo: in quei casi la dashboard mostra solo la produzione.
 */
export function hasConsumption(viz: Viz): boolean {
  return viz.meta.consumptionSource !== "none" && viz.meta.consumptionAnnualKwh > 0;
}
