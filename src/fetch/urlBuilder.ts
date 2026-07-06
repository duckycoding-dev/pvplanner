import { boolFlag, numParam } from "../config/pvgisConventions.ts";
import type { ResolvedConfig, ResolvedFalda } from "../config/schema.ts";

export type QueryParams = Record<string, string>;

/** Params shared by every PVGIS tool call. */
function commonParams(cfg: ResolvedConfig): QueryParams {
  return {
    lat: numParam(cfg.location.latitude),
    lon: numParam(cfg.location.longitude),
    raddatabase: cfg.pvgis.radiation_db,
    usehorizon: boolFlag(cfg.pvgis.use_horizon),
    outputformat: "json",
    browser: "0",
  };
}

/**
 * seriescalc — hourly PV power + radiation components.
 * Defaults to a single year (`cfg.pvgis.single_year`); pass `years` to request a
 * consecutive multi-year range (the wizard does this; the CLI omits it, keeping
 * the emitted URL identical to before).
 */
export function hourlyParams(
  cfg: ResolvedConfig,
  falda: ResolvedFalda,
  years?: { from: number; to: number },
): QueryParams {
  const from = years?.from ?? cfg.pvgis.single_year;
  const to = years?.to ?? cfg.pvgis.single_year;
  return {
    ...commonParams(cfg),
    pvcalculation: "1",
    peakpower: numParam(falda.peakpower_kw),
    pvtechchoice: cfg.pvgis.pvtechchoice,
    mountingplace: cfg.pvgis.mountingplace,
    loss: numParam(cfg.pvgis.system_loss_percent),
    angle: numParam(falda.tilt),
    aspect: numParam(falda.azimuth),
    startyear: numParam(from),
    endyear: numParam(to),
    components: boolFlag(cfg.pvgis.components),
  };
}

/** PVcalc — multi-year monthly + totals. No start/endyear => full DB range. */
export function powerParams(cfg: ResolvedConfig, falda: ResolvedFalda): QueryParams {
  return {
    ...commonParams(cfg),
    peakpower: numParam(falda.peakpower_kw),
    pvtechchoice: cfg.pvgis.pvtechchoice,
    mountingplace: cfg.pvgis.mountingplace,
    loss: numParam(cfg.pvgis.system_loss_percent),
    fixed: "1",
    angle: numParam(falda.tilt),
    aspect: numParam(falda.azimuth),
  };
}

export function buildUrl(baseUrl: string, tool: string, params: QueryParams): string {
  return `${baseUrl}/${tool}?${new URLSearchParams(params).toString()}`;
}
