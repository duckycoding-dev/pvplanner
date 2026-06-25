import type { BatteryConfig } from "../types.ts";

/** Default AC-to-AC round-trip efficiency (battery DC ≥0.96 × inverter conversions). */
export const DEFAULT_ROUND_TRIP = 0.9;

export interface BatteryOptions {
  usableKwh: number;
  pMaxKw: number;
  roundTrip?: number;
  initialSoCFraction?: number;
  socConvergence?: boolean;
}

/** Build a BatteryConfig from usable capacity + power cap, splitting round-trip into √ each way. */
export function buildBatteryConfig(opts: BatteryOptions): BatteryConfig {
  const rt = opts.roundTrip ?? DEFAULT_ROUND_TRIP;
  const eff = Math.sqrt(rt);
  return {
    usableKwh: opts.usableKwh,
    chargeEff: eff,
    dischargeEff: eff,
    pMaxKw: opts.pMaxKw,
    initialSoCFraction: opts.initialSoCFraction ?? 0,
    socConvergence: opts.socConvergence ?? true,
  };
}
