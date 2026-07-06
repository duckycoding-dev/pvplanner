// Cloudflare Pages Function: GET /api/pvgis
// Wrapper puro — nessuna logica qui, tutto in src/server/pvgisProxy.ts.
import { proxyPvgis } from "../../src/server/pvgisProxy.ts";

export const onRequestGet = (ctx: { request: Request }) => proxyPvgis(ctx.request);
