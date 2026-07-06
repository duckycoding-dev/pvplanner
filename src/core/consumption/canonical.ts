/**
 * Forma canonica dei consumi: l'output comune dei tre metodi di inserimento
 * (CSV reale, template mensili, stima parametrica). È un array orario allineato
 * all'asse UTC del dataset (viz.hourly.timestampsUtc) più i metadati di provenienza.
 * Pura: nessun fs/Bun/Date.now.
 */
export interface CanonicalConsumption {
  /** kWh per ora, stesso asse (e stessa lunghezza) di viz.hourly.timestampsUtc. */
  hourlyKwh: number[];
  meta: {
    source: "csv" | "monthly" | "parametric";
    /** Etichetta breve mostrata all'utente, es. "CSV casa2024.csv" | "Template mensili". */
    label: string;
    annualKwh: number;
    /** Percentuale di ore con dato reale (100 per monthly/parametric). */
    coveragePct: number;
    /** Presente solo per il metodo parametrico (stima non misurata). */
    disclaimer?: string;
  };
}

/**
 * Verifica che la serie sia utilizzabile: lunghezza attesa, valori finiti e non
 * negativi. Ritorna un messaggio d'errore in italiano sul primo problema, o null.
 */
export function validateCanonical(c: CanonicalConsumption, expectedLength: number): string | null {
  if (c.hourlyKwh.length !== expectedLength) {
    return `Consumi: attese ${expectedLength} ore, trovate ${c.hourlyKwh.length}.`;
  }
  for (let i = 0; i < c.hourlyKwh.length; i++) {
    const v = c.hourlyKwh[i]!;
    if (!Number.isFinite(v)) {
      return `Consumi: valore non numerico all'ora ${i}.`;
    }
    if (v < 0) {
      return `Consumi: valore negativo (${v}) all'ora ${i}.`;
    }
  }
  return null;
}
