#!/usr/bin/env bun
/**
 * Preview statica del build di produzione (dist/), come lo servirebbe Cloudflare Pages.
 *
 * DIFFERENZA VOLUTA dal dev server (web/serve.ts): qui NON c'è il proxy /api/pvgis.
 * In produzione quel path è servito dalla Pages Function functions/api/pvgis.ts; in
 * questa preview locale non esiste, quindi il fetch PVGIS dal wizard fallisce di
 * proposito — serve a verificare il failure mode pulito (messaggio d'errore in UI,
 * il resto dell'app e il file-drop restano usabili).
 *
 *   bun run build && bun run preview   →   http://localhost:4321
 */
import { join, normalize } from "node:path";
import { existsSync, statSync } from "node:fs";
import { fromRoot } from "../src/paths.ts";

const DIST = fromRoot("dist");
const PORT = Number(process.env.PORT ?? 4321);

if (!existsSync(join(DIST, "index.html"))) {
  console.error("dist/ non trovata o senza index.html. Esegui prima: bun run build");
  process.exit(1);
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    // Normalizza ed evita path traversal fuori da dist/.
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let path = join(DIST, rel);
    if (!path.startsWith(DIST)) return new Response("Forbidden", { status: 403 });

    if (existsSync(path) && statSync(path).isFile()) {
      return new Response(Bun.file(path));
    }
    // /api/* non esiste in preview (in prod è una Pages Function): 404 esplicito, NON il
    // fallback SPA — altrimenti il fetch del wizard riceverebbe 200+HTML e fallirebbe con
    // un errore di parse invece del pulito "HTTP 404".
    if (url.pathname.startsWith("/api/")) {
      return new Response("Not available in preview (Pages Function in produzione).", { status: 404 });
    }
    // SPA fallback: qualunque route non-file → index.html.
    return new Response(Bun.file(join(DIST, "index.html")), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`preview dist/: http://localhost:${PORT}  (NB: nessun proxy /api/pvgis)`);
