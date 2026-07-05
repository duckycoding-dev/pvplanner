import type { ConsumptionSeries } from "../types.ts";

/** Context the PV pipeline provides to a consumption source (same UTC axis as PV). */
export interface ConsumptionContext {
  timestampsUtc: readonly number[];
  months: readonly number[];
  t2m: readonly number[]; // ambient temperature per hour [°C]
  timeZone: string; // IANA zone for local-time shaping (e.g. "Europe/Rome")
  annualKwhTarget?: number;
}

/** A pluggable source of an 8760-hour load series aligned to the PV UTC axis. */
export interface ConsumptionSource {
  load(ctx: ConsumptionContext): ConsumptionSeries | Promise<ConsumptionSeries>;
}
