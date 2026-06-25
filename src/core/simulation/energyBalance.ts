export interface HourBalance {
  selfConsumed: number; // min(production, load)
  surplus: number; // max(0, production − load)
  deficit: number; // max(0, load − production)
}

/** Direct energy balance for one hour (no battery). */
export function hourBalance(production: number, load: number): HourBalance {
  return {
    selfConsumed: Math.min(production, load),
    surplus: Math.max(0, production - load),
    deficit: Math.max(0, load - production),
  };
}
