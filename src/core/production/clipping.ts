export interface ClipResult {
  practicalKwh: number[];
  clippingLossKwh: number[];
}

/**
 * Apply the inverter AC ceiling to the COMBINED instantaneous production.
 * With Δt = 1h, the per-hour energy cap equals the power cap (kW → kWh).
 * practical = min(theoretical, cap); clipping loss = theoretical − practical (≥ 0).
 */
export function applyAcCap(theoreticalKwh: ReadonlyArray<number>, capKwhPerHour: number): ClipResult {
  const practicalKwh: number[] = new Array(theoreticalKwh.length);
  const clippingLossKwh: number[] = new Array(theoreticalKwh.length);
  for (let i = 0; i < theoreticalKwh.length; i++) {
    const t = theoreticalKwh[i] ?? 0;
    const p = t < capKwhPerHour ? t : capKwhPerHour;
    practicalKwh[i] = p;
    clippingLossKwh[i] = t - p;
  }
  return { practicalKwh, clippingLossKwh };
}
