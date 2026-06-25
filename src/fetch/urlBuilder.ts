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

/** seriescalc — hourly PV power + radiation components, single year. */
export function hourlyParams(cfg: ResolvedConfig, falda: ResolvedFalda): QueryParams {
  const year = numParam(cfg.pvgis.single_year);
  return {
    ...commonParams(cfg),
    pvcalculation: "1",
    peakpower: numParam(falda.peakpower_kw),
    pvtechchoice: cfg.pvgis.pvtechchoice,
    mountingplace: cfg.pvgis.mountingplace,
    loss: numParam(cfg.pvgis.system_loss_percent),
    angle: numParam(falda.tilt),
    aspect: numParam(falda.azimuth),
    startyear: year,
    endyear: year,
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

/** DRcalc — average daily radiation profile for one month, local time. */
export function dailyParams(cfg: ResolvedConfig, falda: ResolvedFalda, month: number): QueryParams {
  return {
    ...commonParams(cfg),
    month: numParam(month),
    angle: numParam(falda.tilt),
    aspect: numParam(falda.azimuth),
    global: "1",
    clearsky: "1",
    showtemperatures: "1",
    localtime: "1",
  };
}

/** MRcalc — monthly radiation on the south reference plane (aspect 0). */
export function monthlyParams(cfg: ResolvedConfig): QueryParams {
  const first = cfg.resolvedFalde[0];
  if (first === undefined) throw new Error("monthlyParams: no falde resolved");
  const year = numParam(cfg.pvgis.single_year);
  return {
    ...commonParams(cfg),
    startyear: year,
    endyear: year,
    selectrad: "1",
    angle: numParam(first.tilt),
    // NB: MRcalc has no `aspect` param — the selected-inclination plane is South only.
    d2g: "1",
    avtemp: "1",
  };
}

export function buildUrl(baseUrl: string, tool: string, params: QueryParams): string {
  return `${baseUrl}/${tool}?${new URLSearchParams(params).toString()}`;
}
