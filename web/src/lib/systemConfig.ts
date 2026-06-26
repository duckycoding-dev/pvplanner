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

export function cloneFromBaseline(viz: Viz): SystemConfigB {
  return {
    label: "Sistema B",
    falde: viz.meta.falde.map((f) => ({ id: f.id, azimuth: f.azimuth, panelCount: f.panelCount, wp: f.wp })),
    acCapKw: viz.meta.acCapKw,
    // viz exposes only the usable figure → treat it as total at 100% so B == baseline by default
    batteryTotalKwh: viz.meta.batteryUsableKwh,
    batteryUsablePct: 100,
    roundTrip: viz.meta.batteryRoundTrip,
  };
}

export function serialize(cfg: SystemConfigB): string {
  return JSON.stringify(cfg, null, 2);
}

function reqNumber(v: unknown, ctx: string): number {
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`Config non valida: ${ctx} deve essere un numero.`);
  return v;
}

function reqString(v: unknown, ctx: string): string {
  if (typeof v !== "string" || v.length === 0) throw new Error(`Config non valida: ${ctx} deve essere una stringa.`);
  return v;
}

export function parseSystemConfigB(text: string): SystemConfigB {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("File non valido: JSON non leggibile.");
  }
  if (typeof raw !== "object" || raw === null) throw new Error("Config non valida: atteso un oggetto.");
  const o = raw as Record<string, unknown>;
  const faldeRaw = o["falde"];
  if (!Array.isArray(faldeRaw)) throw new Error("Config non valida: 'falde' mancante.");
  const falde: FaldaConfigB[] = faldeRaw.map((f, i) => {
    const fo = (f ?? {}) as Record<string, unknown>;
    return {
      id: reqString(fo["id"], `falde[${i}].id`),
      azimuth: reqNumber(fo["azimuth"], `falde[${i}].azimuth`),
      panelCount: reqNumber(fo["panelCount"], `falde[${i}].panelCount`),
      wp: reqNumber(fo["wp"], `falde[${i}].wp`),
    };
  });
  // Backwards-compatible: accept an older `batteryUsableKwh` field as total at 100%.
  const total =
    typeof o["batteryTotalKwh"] === "number"
      ? o["batteryTotalKwh"]
      : typeof o["batteryUsableKwh"] === "number"
        ? o["batteryUsableKwh"]
        : undefined;
  return {
    label: typeof o["label"] === "string" ? o["label"] : "Sistema B",
    falde,
    acCapKw: reqNumber(o["acCapKw"], "acCapKw"),
    batteryTotalKwh: reqNumber(total, "batteryTotalKwh"),
    batteryUsablePct: typeof o["batteryUsablePct"] === "number" ? o["batteryUsablePct"] : 100,
    roundTrip: reqNumber(o["roundTrip"], "roundTrip"),
  };
}

/** Returns null if cfg is compatible with the baseline geometry, else an error message. */
export function validateAgainstBaseline(cfg: SystemConfigB, viz: Viz): string | null {
  const baseIds = viz.meta.falde.map((f) => f.id).slice().sort();
  const cfgIds = cfg.falde.map((f) => f.id).slice().sort();
  if (baseIds.length !== cfgIds.length || baseIds.some((id, i) => id !== cfgIds[i])) {
    return "Geometria diversa dalla baseline (falde non corrispondenti): import non supportato.";
  }
  for (const bf of viz.meta.falde) {
    const cf = cfg.falde.find((x) => x.id === bf.id);
    if (cf === undefined) return `Falda "${bf.id}" assente.`;
    if (cf.azimuth !== bf.azimuth) {
      return `Falda "${bf.id}": azimuth ${cf.azimuth} ≠ baseline ${bf.azimuth} (geometria non modificabile).`;
    }
    if (cf.panelCount < 0 || cf.wp <= 0) return `Falda "${bf.id}": pannelli/W non validi.`;
  }
  if (cfg.acCapKw <= 0) return "Tetto AC deve essere > 0.";
  if (cfg.batteryTotalKwh < 0) return "Capacità batteria non valida.";
  if (cfg.batteryUsablePct < 0 || cfg.batteryUsablePct > 100) return "Percentuale utilizzabile deve essere 0–100.";
  if (cfg.roundTrip <= 0 || cfg.roundTrip > 1) return "Round-trip deve essere tra 0 e 1.";
  return null;
}
