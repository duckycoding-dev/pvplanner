import { type ConsumptionSpec, type StoredSetup, type WizardInputs, validateWizardInputs } from "./setupTypes.ts";
import { type SystemConfigB } from "./systemConfig.ts";
import { type Tariff, validateTariff } from "./tariffPresets.ts";
import type { Incentive } from "./economics.ts";
import type { CanonicalConsumption } from "../../../src/core/consumption/canonical.ts";
import { expandMonthlyTemplate } from "../../../src/core/consumption/monthlyTemplate.ts";
import { parametricConsumption } from "./parametricConsumption.ts";

/**
 * "Ricetta" condivisibile di un setup: SOLO gli input (mai le serie orarie né il CSV
 * personale). Serve sia per la condivisione via URL (hash compresso) sia per
 * l'export/import di un file JSON leggibile.
 *
 * I consumi ammessi sono solo `monthly`/`parametric` (riproducibili dai parametri): il
 * metodo `csv` è escluso by design — il file di consumo è personale e troppo grande, e
 * non è ricostruibile senza il file originale. L'esclusione è sia a livello di tipo
 * (`Extract<…>`) sia a runtime (buildSharedConfig lo scarta, parseSharedConfig lo ignora).
 */
export interface SharedConfig {
  v: 1;
  wizard: WizardInputs;
  consumption?: Extract<ConsumptionSpec, { method: "monthly" | "parametric" }>;
  systemA: SystemConfigB;
  systemB: SystemConfigB;
  tariff: Tariff;
  incentive: Incentive;
}

/** Tiene solo i consumi condivisibili (monthly/parametric); scarta csv e qualsiasi altro. */
function shareableConsumption(spec: ConsumptionSpec | null | undefined): SharedConfig["consumption"] {
  if (spec != null && (spec.method === "monthly" || spec.method === "parametric")) return spec;
  return undefined;
}

/** Costruisce una SharedConfig dallo stato dell'app; scarta i consumi da CSV. */
export function buildSharedConfig(args: {
  wizard: WizardInputs;
  consumption?: ConsumptionSpec | null;
  systemA: SystemConfigB;
  systemB: SystemConfigB;
  tariff: Tariff;
  incentive: Incentive;
}): SharedConfig {
  const c: SharedConfig = {
    v: 1,
    wizard: args.wizard,
    systemA: args.systemA,
    systemB: args.systemB,
    tariff: args.tariff,
    incentive: args.incentive,
  };
  const cons = shareableConsumption(args.consumption);
  if (cons !== undefined) c.consumption = cons;
  return c;
}

/**
 * Ricostruisce la forma canonica dei consumi condivisi (monthly/parametric) sul dataset
 * scaricato, usando i produttori puri. Il chiamante applica il risultato con
 * `applyConsumption`. Il CSV non arriva mai qui (escluso dal tipo di SharedConfig).
 */
export function reconstructSharedConsumption(
  setup: StoredSetup,
  spec: NonNullable<SharedConfig["consumption"]>,
): CanonicalConsumption {
  if (spec.method === "monthly") {
    return expandMonthlyTemplate(
      spec.template,
      setup.viz.hourly.timestampsUtc,
      setup.viz.hourly.months,
      setup.inputs.timeZone,
    );
  }
  return parametricConsumption(spec.house, setup);
}

// --- compressione + base64url (nativi, nessuna dipendenza) ------------------------------

async function pipeThrough(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Su input corrotto lo stream va in errore: l'errore reale emerge dall'arrayBuffer sotto,
  // ma write/close rigettano anche loro — senza catch diventerebbero unhandled rejection.
  writer.write(data).catch(() => {});
  writer.close().catch(() => {});
  const buf = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buf);
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** JSON → deflate-raw → base64url (stringa pura, da mettere nell'hash come `#s=<…>`). */
export async function encodeShare(c: SharedConfig): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(c));
  const compressed = await pipeThrough(bytes, new CompressionStream("deflate-raw"));
  return bytesToBase64url(compressed);
}

/**
 * Inverso di encodeShare. Tollera un prefisso `#s=` / `s=` / `#`. Lancia su input
 * malformato (base64 non valido, deflate corrotto, JSON illeggibile, versione ignota).
 */
export async function decodeShare(hash: string): Promise<SharedConfig> {
  let s = hash.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.startsWith("s=")) s = s.slice(2);
  if (s === "" || /[^A-Za-z0-9_-]/.test(s)) throw new Error("shareSetup: payload non valido.");
  let json: string;
  try {
    const bytes = base64urlToBytes(s);
    const inflated = await pipeThrough(bytes, new DecompressionStream("deflate-raw"));
    json = new TextDecoder().decode(inflated);
  } catch {
    throw new Error("shareSetup: impossibile decodificare il link condiviso.");
  }
  return parseSharedConfig(json);
}

// --- file export/import ------------------------------------------------------------------

/** JSON leggibile per l'export su file. */
export function serializeSharedConfig(c: SharedConfig): string {
  return JSON.stringify(c, null, 2);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function validateSystem(v: unknown, ctx: string): SystemConfigB {
  if (!isObject(v)) throw new Error(`shareSetup: ${ctx} mancante.`);
  if (!Array.isArray(v["falde"])) throw new Error(`shareSetup: ${ctx}.falde mancante.`);
  for (const k of ["acCapKw", "batteryTotalKwh", "batteryUsablePct", "roundTrip", "installationCostEur"]) {
    if (typeof v[k] !== "number" || Number.isNaN(v[k])) throw new Error(`shareSetup: ${ctx}.${k} non valido.`);
  }
  return v as unknown as SystemConfigB;
}

/**
 * Parse + validazione di una SharedConfig (da file o da hash). Riusa i validator esistenti
 * (wizard, tariffa) e lancia su qualsiasi problema. Un consumo `csv` iniettato a mano viene
 * silenziosamente scartato (non ricostruibile senza il file).
 */
export function parseSharedConfig(json: string): SharedConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("shareSetup: JSON non leggibile.");
  }
  if (!isObject(raw)) throw new Error("shareSetup: atteso un oggetto.");
  if (raw["v"] !== 1) throw new Error(`shareSetup: versione ${String(raw["v"])} non supportata (attesa 1).`);

  const wizard = raw["wizard"];
  if (!isObject(wizard)) throw new Error("shareSetup: 'wizard' mancante.");
  const wizardErr = validateWizardInputs(wizard as unknown as WizardInputs);
  if (wizardErr !== null) throw new Error(`shareSetup: input località non validi (${wizardErr}).`);

  const tariff = raw["tariff"];
  if (!isObject(tariff)) throw new Error("shareSetup: 'tariff' mancante.");
  const tariffErr = validateTariff(tariff as unknown as Tariff);
  if (tariffErr !== null) throw new Error(`shareSetup: tariffa non valida (${tariffErr}).`);

  const incentive = raw["incentive"];
  if (
    !isObject(incentive) ||
    (incentive["mode"] !== "percent" && incentive["mode"] !== "fixed") ||
    typeof incentive["value"] !== "number" ||
    typeof incentive["years"] !== "number"
  ) {
    throw new Error("shareSetup: 'incentive' non valido.");
  }

  const config: SharedConfig = {
    v: 1,
    wizard: wizard as unknown as WizardInputs,
    systemA: validateSystem(raw["systemA"], "systemA"),
    systemB: validateSystem(raw["systemB"], "systemB"),
    tariff: tariff as unknown as Tariff,
    incentive: incentive as unknown as Incentive,
  };
  const cons = shareableConsumption(raw["consumption"] as ConsumptionSpec | undefined);
  if (cons !== undefined) config.consumption = cons;
  return config;
}
