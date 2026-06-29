/** Whether a higher or a lower value of a metric is the "good" one (drives colour). */
export type Good = "higher" | "lower" | "none";

/** Per-column CSS class ("pos" = best/green, "neg" = worst/red, "" = neutral) for one row. */
export function bestWorstClasses(values: readonly number[], good: Good): string[] {
  const cls = values.map(() => "");
  if (good === "none" || values.length < 2) return cls;
  let best = 0;
  let worst = 0;
  for (let i = 1; i < values.length; i++) {
    const v = values[i] ?? 0;
    if (good === "higher") {
      if (v > (values[best] ?? 0)) best = i;
      if (v < (values[worst] ?? 0)) worst = i;
    } else {
      if (v < (values[best] ?? 0)) best = i;
      if (v > (values[worst] ?? 0)) worst = i;
    }
  }
  if ((values[best] ?? 0) === (values[worst] ?? 0)) return cls; // all equal → no colour
  cls[best] = "pos";
  cls[worst] = "neg";
  return cls;
}

/** Colour for a delta cell: green if the change is an improvement for that metric. */
export function deltaClass(delta: number, good: Good): string {
  if (good === "none" || delta === 0) return "";
  const improved = good === "higher" ? delta > 0 : delta < 0;
  return improved ? "pos" : "neg";
}
