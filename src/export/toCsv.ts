export type CsvCell = string | number;

/** Serialize rows to RFC4180-ish CSV. Quotes cells containing the delimiter, quotes or newlines. */
export function toCsv(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<CsvCell>>,
  delimiter = ",",
): string {
  const esc = (v: CsvCell): string => {
    const s = String(v);
    return s.includes(delimiter) || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(delimiter)];
  for (const r of rows) lines.push(r.map(esc).join(delimiter));
  return lines.join("\n") + "\n";
}
