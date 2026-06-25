import { fromRoot } from "../paths.ts";
import type { ConsumptionContext } from "../core/consumption/ConsumptionSource.ts";
import type { ConsumptionSeries } from "../core/types.ts";
import type { ConsumptionCsvConfig } from "../config/schema.ts";

/** Convert a value in the given unit to kWh for a 1-hour step. */
function unitToKwh(unit: ConsumptionCsvConfig["value_unit"]): number {
  switch (unit) {
    case "W":
    case "Wh":
      return 1 / 1000;
    case "kW":
    case "kWh":
      return 1;
  }
}

function sum(xs: ReadonlyArray<number>): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

/**
 * Preliminary CSV consumption loader. Assumes the CSV rows are already in the
 * same hourly order/axis as the PV series (one row per PV hour). Timezone-aware
 * timestamp alignment will be hardened when real data is available.
 */
export async function csvConsumptionSource(cfg: ConsumptionCsvConfig, ctx: ConsumptionContext): Promise<ConsumptionSeries> {
  const text = await Bun.file(fromRoot(cfg.path)).text();
  const delimiter = cfg.delimiter ?? ",";
  const hasHeader = cfg.has_header ?? true;

  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  let dataLines = lines;
  let valueIdx: number;
  if (hasHeader) {
    const header = (lines[0] ?? "").split(delimiter).map((s) => s.trim());
    valueIdx = header.indexOf(cfg.value_column);
    dataLines = lines.slice(1);
  } else {
    valueIdx = Number(cfg.value_column);
  }
  if (valueIdx < 0 || Number.isNaN(valueIdx)) {
    throw new Error(`csv: value_column "${cfg.value_column}" not found`);
  }

  const n = ctx.timestampsUtc.length;
  if (dataLines.length !== n) {
    throw new Error(`csv: expected ${n} data rows (PV axis), got ${dataLines.length}`);
  }

  const factor = unitToKwh(cfg.value_unit);
  const loadKwh = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const cols = dataLines[i]!.split(delimiter);
    const raw = Number(cols[valueIdx]);
    if (Number.isNaN(raw)) throw new Error(`csv: non-numeric value at data row ${i}`);
    loadKwh[i] = raw * factor;
  }

  let annualKwh = sum(loadKwh);
  const notes = [`Caricato da ${cfg.path} (unità ${cfg.value_unit}). Allineamento: ordine righe = asse PV (preliminare).`];
  if (ctx.annualKwhTarget && annualKwh > 0) {
    const scale = ctx.annualKwhTarget / annualKwh;
    for (let i = 0; i < n; i++) loadKwh[i]! *= scale;
    annualKwh = ctx.annualKwhTarget;
    notes.push(`Scalato a ${ctx.annualKwhTarget} kWh/anno (×${scale.toFixed(4)}).`);
  }

  return { loadKwh, months: ctx.months, annualKwh, source: `csv:${cfg.path}`, notes };
}
