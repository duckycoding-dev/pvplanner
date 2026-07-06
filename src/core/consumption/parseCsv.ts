/**
 * Parser CSV generico per la curva di consumo dell'utente (orario o quartorario).
 * Formato controllato → nessuna dipendenza esterna. Le regole (dialetti, timestamp,
 * risoluzione, allineamento, buchi, soglia) sono documentate in docs/07-consumi.md.
 * Pura: nessun fs/Bun/Date.now.
 */
import { type CsvParseOptions, type CsvParseOutcome, type RawEntry, alignToAxis } from "./align.ts";

export type { CsvParseOptions, CsvParseOutcome } from "./align.ts";

/**
 * Delimitatore auto: `;` se presente sulla prima riga, altrimenti `,`. Con `;` la
 * virgola è il separatore decimale (uso italiano tipico); il conteggio puro `;` vs `,`
 * non basta perché la virgola decimale nel valore falsa il conto — quindi la presenza
 * di `;` è dirimente. Un CSV a virgola non usa `;`.
 */
function detectDelimiter(firstLine: string): ";" | "," {
  return firstLine.includes(";") ? ";" : ",";
}

/** Interpreta il valore numerico secondo il delimitatore (virgola decimale se `;`). */
function parseValue(raw: string, delimiter: ";" | ","): number {
  const s = delimiter === ";" ? raw.trim().replace(",", ".") : raw.trim();
  if (s === "") return Number.NaN; // cella vuota = dato mancante, non 0 (Number("") è 0)
  return Number(s);
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;
const EU_RE = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})/;

/** Estrae mese/giorno/ora locali dal timestamp (minuti scartati: risoluzione oraria). Null se illeggibile. */
export function parseLocalStamp(raw: string): { month: number; day: number; hour: number } | null {
  const s = raw.trim();
  const iso = ISO_RE.exec(s);
  if (iso) {
    return { month: Number(iso[2]), day: Number(iso[3]), hour: Number(iso[4]) };
  }
  const eu = EU_RE.exec(s);
  if (eu) {
    return { month: Number(eu[2]), day: Number(eu[1]), hour: Number(eu[4]) };
  }
  return null;
}

function isValidStamp(m: number, d: number, h: number): boolean {
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 && h >= 0 && h <= 23;
}

export function parseConsumptionCsv(text: string, filename: string, opts: CsvParseOptions): CsvParseOutcome {
  const warnings: string[] = [];
  const rawLines = text.split(/\r?\n/);
  const lines: { line: string; n: number }[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i]!.trim();
    if (l.length > 0) lines.push({ line: l, n: i + 1 });
  }
  if (lines.length === 0) {
    throw new Error("Consumi CSV: file vuoto o illeggibile.");
  }

  const delimiter = detectDelimiter(lines[0]!.line);

  const entries: RawEntry[] = [];
  let skippedFeb29 = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const { line, n } = lines[idx]!;
    const cells = line.split(delimiter);
    if (cells.length < 2) {
      warnings.push(`Riga ${n} scartata: attese 2 colonne (timestamp, kWh).`);
      continue;
    }
    const tsRaw = cells[0]!.trim();
    const valRaw = cells[1]!.trim();

    // Header: prima riga con valore non numerico → intestazione, skip senza warning.
    if (idx === 0) {
      const v = parseValue(valRaw, delimiter);
      const stamp = parseLocalStamp(tsRaw);
      if (Number.isNaN(v) || stamp === null) {
        continue; // intestazione
      }
    }

    const stamp = parseLocalStamp(tsRaw);
    if (stamp === null) {
      warnings.push(`Riga ${n} scartata: timestamp non riconosciuto ("${tsRaw}").`);
      continue;
    }
    const value = parseValue(valRaw, delimiter);
    if (!Number.isFinite(value)) {
      warnings.push(`Riga ${n} scartata: kWh non numerico ("${valRaw}").`);
      continue;
    }
    if (stamp.month === 2 && stamp.day === 29) {
      skippedFeb29++;
      continue;
    }
    if (!isValidStamp(stamp.month, stamp.day, stamp.hour)) {
      warnings.push(`Riga ${n} scartata: data/ora fuori intervallo.`);
      continue;
    }
    entries.push({ month: stamp.month, day: stamp.day, hour: stamp.hour, kwh: value });
  }

  if (skippedFeb29 > 0) {
    warnings.push(`${skippedFeb29} righe del 29 febbraio scartate (non presente nell'anno di riferimento).`);
  }
  if (entries.length === 0) {
    throw new Error("Consumi CSV: nessuna riga valida trovata (formato non riconosciuto).");
  }

  const label = `CSV ${filename}`;
  return alignToAxis(entries, "csv", label, opts, warnings);
}
