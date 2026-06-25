/** Minimal product spec types. Only fields the pipeline needs are typed;
 *  the rest of each datasheet JSON is preserved as unknown. */

export interface ModuleSpec {
  /** Nameplate peak power per module at STC, in watts (e.g. 465). */
  peak_power_wp: number;
  [key: string]: unknown;
}

export type InverterSpec = Record<string, unknown>;
export type BatterySpec = Record<string, unknown>;
