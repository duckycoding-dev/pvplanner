import type { CanonicalConsumption } from "../../../src/core/consumption/canonical.ts";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function csvLabelPrefix(label: string): string | null {
  const normalized = label.toLowerCase();
  if (normalized.startsWith("csv ")) return "CSV ";
  if (normalized.startsWith("curva di carico ")) return "Curva di carico ";
  if (normalized.startsWith("load curve ")) return "Load curve ";
  return null;
}

export function formatConsumptionLabel(result: CanonicalConsumption, t: Translate): string {
  if (result.meta.source === "monthly") {
    return t("consumption.method.monthly");
  }
  if (result.meta.source === "parametric") {
    return t("consumption.method.parametric");
  }

  const prefix = csvLabelPrefix(result.meta.label);
  if (prefix === null) {
    return result.meta.label;
  }

  const suffix = result.meta.label.slice(prefix.length).trimStart();
  const translatedPrefix = prefix === "Curva di carico " ? t("consumption.csv.loadCurve") : t("consumption.method.csv");
  return suffix.length > 0 ? `${translatedPrefix} ${suffix}` : translatedPrefix;
}

export function formatConsumptionNote(result: CanonicalConsumption, t: Translate): string {
  let note = formatConsumptionLabel(result, t);
  if (result.meta.source === "csv") {
    note += ` · ${t("consumption.coverage", { pct: result.meta.coveragePct })}`;
  } else if (result.meta.source === "parametric") {
    note += ` · ${t("consumption.parametric.disclaimer")}`;
  }
  return note;
}