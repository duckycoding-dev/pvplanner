/** Whether a higher or a lower value of a metric is the "good" one (drives Δ colour). */
export type Good = "higher" | "lower" | "none";

/** Monetary nature of a row, for colouring value cells by sign (household's view). */
export type Money = "pay" | "earn" | "net";

/** Colour a value cell by its own sign: money you pay = red, money you earn = green. */
export function moneyClass(v: number, money: Money | undefined): string {
  if (money === undefined) return "";
  if (money === "pay") return v > 0 ? "neg" : ""; // an expense
  if (money === "earn") return v > 0 ? "pos" : ""; // income
  return v > 0 ? "neg" : v < 0 ? "pos" : ""; // net: >0 you pay, <0 credit
}

/** Colour a delta cell: green if the change is an improvement for that metric. */
export function deltaClass(delta: number, good: Good): string {
  if (good === "none" || delta === 0) return "";
  const improved = good === "higher" ? delta > 0 : delta < 0;
  return improved ? "pos" : "neg";
}
