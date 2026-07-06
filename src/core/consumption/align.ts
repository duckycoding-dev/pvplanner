/**
 * Allineamento calendario condiviso dai parser CSV (generico ed e-distribuzione).
 * I dati utente hanno timestamp locali (con anno qualsiasi); l'asse del dataset è
 * UTC su un anno di riferimento. L'allineamento avviene per chiave calendario LOCALE
 * `MM-DD-HH` (mese/giorno/ora locali), così l'anno dei dati è irrilevante.
 * Pura: nessun fs/Bun/Date.now.
 *
 * NOTA (deviazione dal piano): il piano suggeriva chiave = mese/giorno da `Date` UTC
 * + ora locale; qui si usa una chiave interamente LOCALE (mese, giorno E ora locali)
 * sia per l'asse sia per i dati utente. È più semplice e internamente consistente
 * (nessuna conversione locale→UTC dei timestamp utente) e gestisce la stessa
 * semantica DST descritta nel piano: nell'ora duplicata (fine ora legale) due indici
 * dell'asse condividono la stessa chiave → il valore va sul primo, il secondo resta buco.
 */
import type { CanonicalConsumption } from "./canonical.ts";

export interface CsvParseOptions {
  timeZone: string; // interpretazione dei timestamp / sagome locali
  timestampsUtc: readonly number[]; // asse del dataset
  months: readonly number[]; // mesi UTC dell'asse (non usati per le chiavi: si usa il mese locale)
}

export interface CsvParseOutcome {
  result: CanonicalConsumption; // coveragePct riflette i buchi riempiti
  warnings: string[];
}

/** Una riga di consumo utente, già ridotta a calendario LOCALE (minuti scartati). */
export interface RawEntry {
  month: number; // 1..12 locale
  day: number; // 1..31 locale
  hour: number; // 0..23 locale
  kwh: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmtFor(timeZone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(timeZone);
  if (f === undefined) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      weekday: "short",
    });
    fmtCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

interface LocalCal {
  month: number;
  day: number;
  hour: number;
  weekday: number; // 0=Mon..6=Sun
}

/** Calendario locale (mese/giorno/ora/weekday) di un istante UTC nella timezone data. */
export function localCalendar(tsUtc: number, timeZone: string): LocalCal {
  const parts = fmtFor(timeZone).formatToParts(new Date(tsUtc));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

function keyOf(month: number, day: number, hour: number): string {
  return `${month}-${day}-${hour}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Allinea le righe utente all'asse del dataset, somma le righe che cadono nella stessa
 * ora, riempie i buchi (media stesso mese/tipo-giorno/ora, poi mese/ora, poi 0) e calcola
 * la copertura. Lancia se copertura < 50%.
 */
export function alignToAxis(
  entries: readonly RawEntry[],
  source: "csv",
  label: string,
  opts: CsvParseOptions,
  warnings: string[],
): CsvParseOutcome {
  const n = opts.timestampsUtc.length;
  if (n === 0) throw new Error("Consumi CSV: asse del dataset vuoto.");

  // Calendario locale + chiave per ogni indice dell'asse.
  const cal: LocalCal[] = new Array(n);
  const axisByKey = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const c = localCalendar(opts.timestampsUtc[i]!, opts.timeZone);
    cal[i] = c;
    const k = keyOf(c.month, c.day, c.hour);
    const arr = axisByKey.get(k);
    if (arr) arr.push(i);
    else axisByKey.set(k, [i]);
  }

  // Somma le righe utente per chiave (quarti d'ora → stessa ora; ora duplicata DST → somma).
  const sumByKey = new Map<string, number>();
  let unmatched = 0;
  for (const e of entries) {
    const k = keyOf(e.month, e.day, e.hour);
    if (!axisByKey.has(k)) {
      unmatched++;
      continue;
    }
    sumByKey.set(k, (sumByKey.get(k) ?? 0) + e.kwh);
  }
  if (unmatched > 0) {
    warnings.push(`${unmatched} righe fuori dal calendario dell'asse (ignorate).`);
  }

  // Assegna i valori reali: il valore della chiave va sul PRIMO indice; gli altri (DST) restano buchi.
  const filled = new Array<number>(n);
  const isReal = new Array<boolean>(n).fill(false);
  for (const [k, indices] of axisByKey) {
    const v = sumByKey.get(k);
    if (v !== undefined) {
      const first = indices[0]!;
      filled[first] = v;
      isReal[first] = true;
    }
  }

  const realCount = isReal.reduce((s, r) => s + (r ? 1 : 0), 0);
  const coveragePct = round1((realCount / n) * 100);
  if (coveragePct < 50) {
    throw new Error(
      `Consumi CSV: copertura ${coveragePct}% (sotto il 50% minimo). Il file copre troppe poche ore per una stima affidabile.`,
    );
  }

  // Profili di riferimento per riempire i buchi, dai soli valori reali.
  const byMDH = new Map<string, { sum: number; count: number }>();
  const byMH = new Map<string, { sum: number; count: number }>();
  const add = (m: Map<string, { sum: number; count: number }>, k: string, v: number) => {
    const cur = m.get(k);
    if (cur) {
      cur.sum += v;
      cur.count += 1;
    } else m.set(k, { sum: v, count: 1 });
  };
  for (let i = 0; i < n; i++) {
    if (!isReal[i]) continue;
    const c = cal[i]!;
    const dt = c.weekday >= 5 ? "we" : "wd";
    add(byMDH, `${c.month}-${dt}-${c.hour}`, filled[i]!);
    add(byMH, `${c.month}-${c.hour}`, filled[i]!);
  }

  // Riempimento buchi.
  let zeroFilled = 0;
  for (let i = 0; i < n; i++) {
    if (isReal[i]) continue;
    const c = cal[i]!;
    const dt = c.weekday >= 5 ? "we" : "wd";
    const a = byMDH.get(`${c.month}-${dt}-${c.hour}`);
    if (a) {
      filled[i] = a.sum / a.count;
      continue;
    }
    const b = byMH.get(`${c.month}-${c.hour}`);
    if (b) {
      filled[i] = b.sum / b.count;
      continue;
    }
    filled[i] = 0;
    zeroFilled++;
  }
  if (zeroFilled > 0) {
    warnings.push(`${zeroFilled} ore senza dati né profilo di riferimento: impostate a 0.`);
  }

  let annual = 0;
  for (const v of filled) annual += v;

  const result: CanonicalConsumption = {
    hourlyKwh: filled,
    meta: { source, label, annualKwh: annual, coveragePct },
  };
  return { result, warnings };
}
