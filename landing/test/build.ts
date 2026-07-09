import { $ } from "bun";

let built = false;

/** Builda il sito una sola volta per run di test e restituisce l'HTML di dist/<rel>. */
export async function distHtml(rel: string): Promise<string> {
  if (!built) {
    await $`bunx astro build`.cwd(`${import.meta.dir}/..`).quiet();
    built = true;
  }
  return await Bun.file(`${import.meta.dir}/../dist/${rel}`).text();
}
