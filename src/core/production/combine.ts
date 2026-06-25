/** Sum N index-aligned hourly production series into one combined series. */
export function combineProduction(seriesList: ReadonlyArray<ReadonlyArray<number>>): number[] {
  if (seriesList.length === 0) throw new Error("combineProduction: no series provided");
  const first = seriesList[0]!;
  const n = first.length;
  for (const s of seriesList) {
    if (s.length !== n) {
      throw new Error(`combineProduction: length mismatch (expected ${n}, got ${s.length})`);
    }
  }
  const out = new Array<number>(n).fill(0);
  for (const s of seriesList) {
    for (let i = 0; i < n; i++) out[i] = (out[i] ?? 0) + (s[i] ?? 0);
  }
  return out;
}
