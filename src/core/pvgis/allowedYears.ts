/**
 * Year ranges PVGIS accepts per radiation database (seriescalc `startyear`/`endyear`).
 * Update by hand when PVGIS extends coverage. Keys match `pvgis.radiation_db` values.
 */
export const ALLOWED_YEARS = {
  "PVGIS-SARAH3": { min: 2005, max: 2023 },
  "PVGIS-ERA5": { min: 2005, max: 2023 },
} as const;
