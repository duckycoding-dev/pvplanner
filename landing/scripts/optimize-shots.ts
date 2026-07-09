/**
 * Converte gli screenshot PNG in public/shots/ in WebP (max 1400px di larghezza)
 * ed elimina i PNG. Da lanciare dopo scripts/screenshots.ts.
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readdirSync, unlinkSync } from "node:fs";

const ROOT = new URL("../public/shots/", import.meta.url).pathname;
const MAX_W = 1400;

for (const lang of ["it", "en"]) {
  for (const name of readdirSync(`${ROOT}${lang}`)) {
    if (!name.endsWith(".png")) continue;
    const src = `${ROOT}${lang}/${name}`;
    const img = await loadImage(src);
    const scale = Math.min(1, MAX_W / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const c = createCanvas(w, h);
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    const out = src.replace(/\.png$/, ".webp");
    await Bun.write(out, c.toBuffer("image/webp", 82));
    unlinkSync(src);
    console.log(`${lang}/${name} -> ${w}x${h} webp`);
  }
}
