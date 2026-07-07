#!/usr/bin/env bun
/**
 * Build di produzione della SPA.
 *
 *   1. `Bun.build` di web/index.html → dist/ (bundle TSX + import JSON + CSS, minify).
 *   2. Copia ricorsiva di web/public/* in dist/ (asset statici: _headers, og.png, …).
 *
 * `bun build web/index.html --outdir dist --minify` NON copia web/public/, perciò
 * la copia la facciamo qui. Output servibile staticamente (vedi scripts/preview-dist.ts)
 * e da Cloudflare Pages (build command `bun run build`, output dir `dist`).
 */
import { cp, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fromRoot } from "../src/paths.ts";

const DIST = fromRoot("dist");
const PUBLIC = fromRoot("web", "public");

await rm(DIST, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [fromRoot("web", "index.html")],
  outdir: DIST,
  minify: true,
});

if (!result.success) {
  console.error("Build fallita:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Copia gli asset statici (web/public → dist). _headers deve finire nella root di dist.
if (existsSync(PUBLIC)) {
  await cp(PUBLIC, DIST, { recursive: true });
}

const files = await readdir(DIST);
console.log(`\nBuild OK → dist/ (${files.length} file):`);
for (const f of files.sort()) console.log(`  ${f}`);
