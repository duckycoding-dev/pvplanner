import type { Viz } from "../types.ts";

/** One falda of system B: geometry is fixed (id/azimuth), only equipment varies. */
export interface FaldaConfigB {
  id: string;
  azimuth: number;
  panelCount: number;
  wp: number; // peak power per module [W]
}

export interface SystemConfigB {
  label: string;
  falde: FaldaConfigB[];
  acCapKw: number; // inverter AC ceiling (clipping)
  batteryTotalKwh: number; // nominal total capacity; 0 = no battery
  batteryUsablePct: number; // usable fraction of total [%], 0..100 (DoD / usable per datasheet)
  roundTrip: number; // AC-to-AC round-trip efficiency, 0..1
  coupling: "dc" | "ac"; // "dc" = inverter ibrido (il clipping può caricare), "ac" = batteria con inverter separato
  installationCostEur: number; // CAPEX of this system
}

export function faldaPeakKwp(f: FaldaConfigB): number {
  return (f.panelCount * f.wp) / 1000;
}

export function totalPeakKwp(cfg: SystemConfigB): number {
  return cfg.falde.reduce((s, f) => s + faldaPeakKwp(f), 0);
}

/** Energy actually cycled = total × usable%. 0 ⇒ no battery. */
export function batteryUsableKwh(cfg: SystemConfigB): number {
  return (cfg.batteryTotalKwh * cfg.batteryUsablePct) / 100;
}

export function cloneFromBaseline(viz: Viz, label = "Sistema B"): SystemConfigB {
  return {
    label,
    falde: viz.meta.falde.map((f) => ({ id: f.id, azimuth: f.azimuth, panelCount: f.panelCount, wp: f.wp })),
    acCapKw: viz.meta.acCapKw,
    batteryTotalKwh: viz.meta.batteryTotalKwh,
    batteryUsablePct: viz.meta.batteryUsablePct,
    roundTrip: viz.meta.batteryRoundTrip,
    coupling: viz.meta.batteryCoupling,
    installationCostEur: viz.meta.installationCostEur,
  };
}

/** True if two systems have identical equipment + CAPEX (label ignored). */
export function equalsSystems(a: SystemConfigB, b: SystemConfigB): boolean {
  if (
    a.acCapKw !== b.acCapKw ||
    a.batteryTotalKwh !== b.batteryTotalKwh ||
    a.batteryUsablePct !== b.batteryUsablePct ||
    a.roundTrip !== b.roundTrip ||
    a.coupling !== b.coupling ||
    a.installationCostEur !== b.installationCostEur ||
    a.falde.length !== b.falde.length
  ) {
    return false;
  }
  for (const af of a.falde) {
    const bf = b.falde.find((x) => x.id === af.id);
    if (bf === undefined || bf.panelCount !== af.panelCount || bf.wp !== af.wp) return false;
  }
  return true;
}

export function serialize(cfg: SystemConfigB): string {
  return JSON.stringify(cfg, null, 2);
}

/** True if cfg matches the baseline equipment (ignoring the label) → "no second system yet". */
export function equalsBaseline(cfg: SystemConfigB, viz: Viz): boolean {
  return equalsSystems(cfg, cloneFromBaseline(viz));
}

/** A "no PV" system: same geometry but zero panels and no battery (import = full load). */
export function noPvConfig(viz: Viz): SystemConfigB {
  const base = cloneFromBaseline(viz);
  return {
    ...base,
    label: "senza FV",
    falde: base.falde.map((f) => ({ ...f, panelCount: 0 })),
    batteryTotalKwh: 0,
    installationCostEur: 0,
  };
}

// I messaggi thrown sono CHIAVI i18n: ImportModal le traduce con `t()` al render.
// I dettagli dinamici (path del campo) sono omessi per restare traducibili.
function reqNumber(v: unknown): number {
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error("import.system.field");
  return v;
}

function reqString(v: unknown): string {
  if (typeof v !== "string" || v.length === 0) throw new Error("import.system.field");
  return v;
}

export function parseSystemConfigB(text: string): SystemConfigB {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("import.jsonUnreadable");
  }
  if (typeof raw !== "object" || raw === null) throw new Error("import.system.notObject");
  const o = raw as Record<string, unknown>;
  const faldeRaw = o["falde"];
  if (!Array.isArray(faldeRaw)) throw new Error("import.system.faldeMissing");
  const falde: FaldaConfigB[] = faldeRaw.map((f) => {
    const fo = (f ?? {}) as Record<string, unknown>;
    return {
      id: reqString(fo["id"]),
      azimuth: reqNumber(fo["azimuth"]),
      panelCount: reqNumber(fo["panelCount"]),
      wp: reqNumber(fo["wp"]),
    };
  });
  // Backwards-compatible: an older `batteryUsableKwh` field is read as total at 100% usable.
  const hasTotal = typeof o["batteryTotalKwh"] === "number";
  const legacyUsable = typeof o["batteryUsableKwh"] === "number";
  const total = hasTotal ? o["batteryTotalKwh"] : legacyUsable ? o["batteryUsableKwh"] : undefined;
  const pct =
    typeof o["batteryUsablePct"] === "number" ? o["batteryUsablePct"] : !hasTotal && legacyUsable ? 100 : undefined;
  return {
    label: typeof o["label"] === "string" ? o["label"] : "Sistema B",
    falde,
    acCapKw: reqNumber(o["acCapKw"]),
    batteryTotalKwh: reqNumber(total),
    batteryUsablePct: reqNumber(pct),
    roundTrip: reqNumber(o["roundTrip"]),
    coupling: o["coupling"] === "ac" ? "ac" : "dc",
    installationCostEur: typeof o["installationCostEur"] === "number" ? o["installationCostEur"] : 0,
  };
}

/**
 * Ritorna null se cfg è compatibile con la geometria baseline, altrimenti una CHIAVE
 * i18n (tradotta dal chiamante con `t()`). I dettagli dinamici (id falda, valori) sono
 * omessi per restare traducibili senza interpolazione.
 */
export function validateAgainstBaseline(cfg: SystemConfigB, viz: Viz): string | null {
  const baseIds = viz.meta.falde.map((f) => f.id).slice().sort();
  const cfgIds = cfg.falde.map((f) => f.id).slice().sort();
  if (baseIds.length !== cfgIds.length || baseIds.some((id, i) => id !== cfgIds[i])) {
    return "validate.system.geometryMismatch";
  }
  for (const bf of viz.meta.falde) {
    const cf = cfg.falde.find((x) => x.id === bf.id);
    if (cf === undefined) return "validate.system.faldaMissing";
    if (cf.azimuth !== bf.azimuth) {
      return "validate.system.faldaAzimuth";
    }
    if (cf.panelCount < 0 || cf.wp <= 0) return "validate.system.faldaPanels";
  }
  if (cfg.acCapKw <= 0) return "validate.system.acCap";
  if (cfg.batteryTotalKwh < 0) return "validate.system.batteryCapacity";
  if (cfg.batteryUsablePct < 0 || cfg.batteryUsablePct > 100) return "validate.system.batteryUsablePct";
  if (cfg.roundTrip <= 0 || cfg.roundTrip > 1) return "validate.system.roundTrip";
  if (cfg.installationCostEur < 0) return "validate.system.installationCost";
  return null;
}
