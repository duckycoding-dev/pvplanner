import index from "./index.html";
import { proxyPvgis } from "../src/server/pvgisProxy.ts";

Bun.serve({
  port: Number(process.env.PORT ?? 2345),
  routes: {
    "/api/pvgis": { GET: (req) => proxyPvgis(req) },
    "/*": index,
  },
});

console.log(`dashboard: http://localhost:${process.env.PORT ?? 2345}`);
