import { MONTHS } from "../units.ts";

/** One price band: applies to certain local hours on certain weekdays. */
export interface TariffBand {
  id: string;
  name: string;
  color: string; // hex, for charts
  hours: [number, number][]; // [from, to) in local hour 0..24; from > to wraps past midnight
  days: number[]; // weekdays it applies to, 0 = Mon .. 6 = Sun
  buyPrice: number; // €/kWh
}

export interface Tariff {
  label: string;
  bands: TariffBand[];
  defaultBuyPrice: number; // €/kWh for hours/days no band covers
  sellPrice: number; // €/kWh for exported energy
}

export interface CostBreakdown {
  buyCost: number;
  sellRevenue: number;
  netCost: number; // buyCost - sellRevenue
}

export interface MonthlyCost extends CostBreakdown {
  month: number;
}

export interface CostResult {
  annual: CostBreakdown;
  monthly: MonthlyCost[];
}

/** True if localHour falls in any of the intervals (handling midnight wrap). */
export function hourInBand(localHour: number, hours: [number, number][]): boolean {
  for (const [from, to] of hours) {
    if (from < to) {
      if (localHour >= from && localHour < to) return true;
    } else if (localHour >= from || localHour < to) {
      return true; // wraps past midnight
    }
  }
  return false;
}

/** Buy price for a given local hour + weekday: first matching band, else default. */
export function priceForHour(tariff: Tariff, localHour: number, weekday: number): number {
  for (const b of tariff.bands) {
    if (b.days.includes(weekday) && hourInBand(localHour, b.hours)) return b.buyPrice;
  }
  return tariff.defaultBuyPrice;
}

/** Apply a tariff to one scenario's hourly import/export → annual + monthly cost. */
export function aggregateCost(
  importKwh: readonly number[],
  exportKwh: readonly number[],
  localHour: readonly number[],
  weekday: readonly number[],
  months: readonly number[],
  tariff: Tariff,
): CostResult {
  const buy = new Array<number>(MONTHS).fill(0);
  const sell = new Array<number>(MONTHS).fill(0);
  for (let i = 0; i < importKwh.length; i++) {
    const m = months[i];
    if (m === undefined || m < 1 || m > MONTHS) continue;
    const k = m - 1;
    const p = priceForHour(tariff, localHour[i] ?? 0, weekday[i] ?? 0);
    buy[k] = (buy[k] ?? 0) + (importKwh[i] ?? 0) * p;
    sell[k] = (sell[k] ?? 0) + (exportKwh[i] ?? 0) * tariff.sellPrice;
  }
  const monthly: MonthlyCost[] = Array.from({ length: MONTHS }, (_, k) => {
    const b = buy[k] ?? 0;
    const s = sell[k] ?? 0;
    return { month: k + 1, buyCost: b, sellRevenue: s, netCost: b - s };
  });
  const annual = monthly.reduce<CostBreakdown>(
    (acc, m) => ({
      buyCost: acc.buyCost + m.buyCost,
      sellRevenue: acc.sellRevenue + m.sellRevenue,
      netCost: acc.netCost + m.netCost,
    }),
    { buyCost: 0, sellRevenue: 0, netCost: 0 },
  );
  return { annual, monthly };
}
