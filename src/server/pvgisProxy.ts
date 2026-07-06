// Same-origin proxy verso l'API PVGIS.
//
// PVGIS non emette header CORS (`Access-Control-Allow-Origin`), quindi il
// browser non puo' chiamarla direttamente: ogni richiesta passa da qui.
// Il modulo e' scritto solo con Web API standard (Request/Response/fetch) cosi'
// da girare identico sia sul dev server Bun sia come Cloudflare Pages Function.
//
// PRIVACY: non logga MAI coordinate (lat/lon) ne' l'URL completo verso PVGIS.

const PVGIS_BASE = "https://re.jrc.ec.europa.eu/api/v5_3";
const ALLOWED_TOOLS = new Set(["seriescalc", "PVcalc"]);
const ALLOWED_PARAMS = new Set([
  "lat",
  "lon",
  "raddatabase",
  "usehorizon",
  "outputformat",
  "browser",
  "pvcalculation",
  "peakpower",
  "pvtechchoice",
  "mountingplace",
  "loss",
  "angle",
  "aspect",
  "startyear",
  "endyear",
  "components",
  "fixed",
]);

const JSON_HEADERS = { "content-type": "application/json" } as const;

/**
 * GET /api/pvgis?tool=seriescalc&lat=... → passthrough whitelisted verso PVGIS.
 *
 * - metodo ≠ GET → 405
 * - `tool` assente o non in whitelist → 400
 * - parametri non in whitelist → scartati silenziosamente
 * - il param `tool` non viene inoltrato come query param a PVGIS
 * - errore di rete / timeout (30 s) → 502 `{"error":"PVGIS non raggiungibile"}`
 *
 * `fetchFn` e' iniettabile per i test (nessun test tocca la rete vera).
 */
export function proxyPvgis(req: Request, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (req.method !== "GET") {
    return Promise.resolve(
      new Response(JSON.stringify({ error: "Metodo non consentito" }), {
        status: 405,
        headers: JSON_HEADERS,
      }),
    );
  }

  const url = new URL(req.url);
  const tool = url.searchParams.get("tool");
  if (!tool || !ALLOWED_TOOLS.has(tool)) {
    return Promise.resolve(
      new Response(JSON.stringify({ error: "Parametro 'tool' mancante o non valido" }), {
        status: 400,
        headers: JSON_HEADERS,
      }),
    );
  }

  const forwarded = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (key !== "tool" && ALLOWED_PARAMS.has(key)) forwarded.append(key, value);
  }

  const upstream = `${PVGIS_BASE}/${tool}?${forwarded.toString()}`;

  return fetchFn(upstream, { signal: AbortSignal.timeout(30000) })
    .then(
      (res) =>
        new Response(res.body, {
          status: res.status,
          headers: JSON_HEADERS,
        }),
    )
    .catch(
      () =>
        new Response(JSON.stringify({ error: "PVGIS non raggiungibile" }), {
          status: 502,
          headers: JSON_HEADERS,
        }),
    );
}
