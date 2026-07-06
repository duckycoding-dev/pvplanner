/**
 * Parser per l'export della "curva di carico" del portale distributore (e-distribuzione).
 * Formato osservato (assunzioni marcate in docs/07-consumi.md; verificare su un file reale):
 *  - CSV `;`-separated, decimale con virgola;
 *  - intestazione con `POD` + riga `Giorno` seguita da 96 colonne quarto-orarie
 *    (`00:00-00:15`, …), oppure formato lungo `Data;Ora;Consumo`.
 * Riusa l'allineamento condiviso (align.ts) del parser generico. Pura.
 */
import { type CsvParseOptions, type CsvParseOutcome, type RawEntry, alignToAxis } from "./align.ts";

const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_EU = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const TIME_RE = /(\d{1,2}):(\d{2})/;

/**
 * Riconoscimento conservativo: serve `POD` (case-insensitive) + almeno uno tra
 * `curva`, l'intestazione `Giorno`, o molte colonne orarie (≥24 token `HH:mm`).
 * Un CSV generico (timestamp,kWh) non deve mai attivarlo → si usa il parser generico.
 */
export function detectEDistribuzione(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("pod")) return false;
  if (lower.includes("curva")) return true;
  if (/(^|[;,\s])giorno([;,\s]|$)/m.test(lower)) return true;
  const timeTokens = (text.match(/\d{1,2}:\d{2}/g) ?? []).length;
  return timeTokens >= 24;
}

function detectDelimiter(text: string): ";" | "," {
  return text.includes(";") ? ";" : ",";
}

function parseValue(raw: string, delimiter: ";" | ","): number {
  const s = delimiter === ";" ? raw.trim().replace(",", ".") : raw.trim();
  if (s === "") return Number.NaN; // cella vuota = dato mancante, non 0 (Number("") è 0)
  return Number(s);
}

/** Data-only (senza ora): DD/MM/YYYY o YYYY-MM-DD. Null se non è una data. */
function parseDate(raw: string): { month: number; day: number } | null {
  const s = raw.trim();
  const iso = DATE_ISO.exec(s);
  if (iso) return { month: Number(iso[2]), day: Number(iso[3]) };
  const eu = DATE_EU.exec(s);
  if (eu) return { month: Number(eu[2]), day: Number(eu[1]) };
  return null;
}

export function parseEDistribuzione(text: string, filename: string, opts: CsvParseOptions): CsvParseOutcome {
  const warnings: string[] = [];
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const entries: RawEntry[] = [];
  let skippedFeb29 = 0;

  const pushHour = (month: number, day: number, hour: number, kwh: number): void => {
    if (month === 2 && day === 29) {
      skippedFeb29++;
      return;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23) return;
    entries.push({ month, day, hour, kwh });
  };

  for (const line of lines) {
    const cells = line.split(delimiter).map((c) => c.trim());
    const date = parseDate(cells[0] ?? "");
    if (date === null) continue; // header / riga POD / vuota

    const rest = cells.slice(1);
    const numeric = rest.map((c) => parseValue(c, delimiter));
    const finiteCount = numeric.reduce((s, v) => s + (Number.isFinite(v) ? 1 : 0), 0);

    if (finiteCount >= 24) {
      // Wide: le colonne dopo la data sono i quarti (o le ore) in POSIZIONE fissa.
      // Le celle vuote/non numeriche (es. ora mancante nel giorno DST) restano buchi
      // senza far scalare le colonne successive nell'ora sbagliata.
      let cols = numeric.length;
      while (cols > 0 && (rest[cols - 1] ?? "") === "") cols--; // riga chiusa da `;`
      const per = cols > 0 && cols % 24 === 0 ? cols / 24 : 0;
      if (per === 0) {
        warnings.push(`Riga ${date.day}/${date.month}: ${cols} colonne non divisibili per 24, scartata.`);
        continue;
      }
      for (let h = 0; h < 24; h++) {
        let sum = 0;
        let present = 0;
        for (let k = 0; k < per; k++) {
          const v = numeric[h * per + k]!;
          if (Number.isFinite(v)) {
            sum += v;
            present++;
          }
        }
        if (present === 0) continue; // ora senza dati: resta buco (riempito dal profilo)
        if (present < per) {
          warnings.push(`Riga ${date.day}/${date.month} ora ${h}: ${per - present} quarti mancanti, sommati i presenti.`);
        }
        pushHour(date.month, date.day, h, sum);
      }
    } else {
      // Long: Data;Ora;Consumo. Ora = primo token HH:mm; valore = ultimo numerico.
      const timeMatch = TIME_RE.exec(line.slice((cells[0] ?? "").length));
      if (timeMatch === null) {
        warnings.push(`Riga ${date.day}/${date.month}: ora non riconosciuta, scartata.`);
        continue;
      }
      const hour = Number(timeMatch[1]) % 24;
      let value = Number.NaN;
      for (let i = numeric.length - 1; i >= 0; i--) {
        if (Number.isFinite(numeric[i]!)) {
          value = numeric[i]!;
          break;
        }
      }
      if (!Number.isFinite(value)) {
        warnings.push(`Riga ${date.day}/${date.month} ${timeMatch[0]}: consumo non numerico, scartata.`);
        continue;
      }
      pushHour(date.month, date.day, hour, value);
    }
  }

  if (skippedFeb29 > 0) {
    warnings.push(`${skippedFeb29} valori del 29 febbraio scartati (non presente nell'anno di riferimento).`);
  }
  if (entries.length === 0) {
    throw new Error("Curva di carico: nessuna riga valida trovata (formato non riconosciuto).");
  }

  return alignToAxis(entries, "csv", `Curva di carico ${filename}`, opts, warnings);
}
