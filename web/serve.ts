import { readdirSync } from "node:fs";
import index from "./index.html";
import { proxyPvgis } from "../src/server/pvgisProxy.ts";
import { fromRoot } from "../src/paths.ts";

// bun build-web.ts copia web/public/* in dist/ per il deploy statico; qui
// replichiamo lo stesso comportamento per il dev server, che altrimenti
// non serve questi file (Bun.serve instrada tutto il resto su "/*": index).
const PUBLIC_DIR = fromRoot("web", "public");
const publicRoutes: Record<string, Response> = {};
for (const name of readdirSync(PUBLIC_DIR)) {
  if (name.startsWith("_")) continue; // _headers ecc: config Cloudflare Pages, non asset
  publicRoutes[`/${name}`] = new Response(Bun.file(`${PUBLIC_DIR}/${name}`));
}

Bun.serve({
  port: Number(process.env.PORT ?? 2345),
  routes: {
    ...publicRoutes,
    "/api/pvgis": { GET: (req) => proxyPvgis(req) },
    "/*": index,
  },
});

console.log(`dashboard: http://localhost:${process.env.PORT ?? 2345}`);
