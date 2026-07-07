import type { Tariff, TariffBand } from "../../../src/core/economics/tariff.ts";

const WEEKDAYS = [0, 1, 2, 3, 4]; // Mon..Fri

export function defaultTariff(): Tariff {
  return { label: "Monorario", bands: [], defaultBuyPrice: 0.25, sellPrice: 0.1 };
}

export function monorarioTariff(buyPrice: number, sellPrice: number): Tariff {
  return { label: "Monorario", bands: [], defaultBuyPrice: buyPrice, sellPrice };
}

/** ARERA F1/F2/F3 preset (placeholder prices). F3 = defaultBuyPrice (night + Sunday/holidays). */
export function f1f2f3Tariff(): Tariff {
  const bands: TariffBand[] = [
    { id: "f1", name: "F1", color: "#dc2626", hours: [[8, 19]], days: WEEKDAYS, buyPrice: 0.28 },
    { id: "f2w", name: "F2", color: "#f59e0b", hours: [[7, 8], [19, 23]], days: WEEKDAYS, buyPrice: 0.26 },
    { id: "f2sat", name: "F2", color: "#f59e0b", hours: [[7, 23]], days: [5], buyPrice: 0.26 },
  ];
  return { label: "F1/F2/F3", bands, defaultBuyPrice: 0.22, sellPrice: 0.1 };
}

export function serializeTariff(t: Tariff): string {
  return JSON.stringify(t, null, 2);
}

// I messaggi thrown sono CHIAVI i18n: ImportModal le traduce con `t()` al render.
function reqNumber(v: unknown): number {
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error("import.tariff.field");
  return v;
}

export function parseTariff(text: string): Tariff {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("import.jsonUnreadable");
  }
  if (typeof raw !== "object" || raw === null) throw new Error("import.tariff.notObject");
  const o = raw as Record<string, unknown>;
  const bandsRaw = Array.isArray(o["bands"]) ? o["bands"] : [];
  const bands: TariffBand[] = bandsRaw.map((b, i) => {
    const bo = (b ?? {}) as Record<string, unknown>;
    const hoursRaw = Array.isArray(bo["hours"]) ? bo["hours"] : [];
    return {
      id: typeof bo["id"] === "string" ? bo["id"] : `band${i}`,
      name: typeof bo["name"] === "string" ? bo["name"] : `Fascia ${i + 1}`,
      color: typeof bo["color"] === "string" ? bo["color"] : "#3b82f6",
      hours: hoursRaw.map((h) => {
        const pair = h as number[];
        return [reqNumber(pair[0]), reqNumber(pair[1])] as [number, number];
      }),
      days: Array.isArray(bo["days"]) ? (bo["days"] as number[]).map((d) => reqNumber(d)) : [],
      buyPrice: reqNumber(bo["buyPrice"]),
    };
  });
  return {
    label: typeof o["label"] === "string" ? o["label"] : "Tariffa",
    bands,
    defaultBuyPrice: reqNumber(o["defaultBuyPrice"]),
    sellPrice: reqNumber(o["sellPrice"]),
  };
}

/**
 * Ritorna null se la tariffa è valida, altrimenti una CHIAVE i18n (tradotta dal
 * chiamante con `t()`). Il nome fascia è omesso per restare traducibile senza interpolazione.
 */
export function validateTariff(t: Tariff): string | null {
  if (t.defaultBuyPrice < 0) return "validate.tariff.defaultBuyNegative";
  if (t.sellPrice < 0) return "validate.tariff.sellNegative";
  for (const b of t.bands) {
    if (b.buyPrice < 0) return "validate.tariff.bandBuyNegative";
    for (const [from, to] of b.hours) {
      if (from < 0 || from > 24 || to < 0 || to > 24) return "validate.tariff.bandHours";
    }
  }
  return null;
}
