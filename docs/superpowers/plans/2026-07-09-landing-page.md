# Landing page PVVerdict — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PVVerdict one-page marketing/SEO landing (IT + EN) as a static Astro site in `landing/`, ready for a dedicated Cloudflare Pages project.

**Architecture:** Single Astro project in `landing/` (own `package.json`, no workspaces). Two statically-generated pages (`/` = IT, `/en/` = EN) rendering the same section components fed by typed per-language copy modules. Zero JS by default; the only scripts are a tiny inline "View in English" hint and native `<details>` FAQ. SEO (hreflang, canonical, OG, sitemap, FAQ JSON-LD) lives in one base layout. Verification is a `bun test` suite that builds the site and asserts on `dist/` HTML.

**Tech Stack:** Bun, Astro 7 (fallback ^6 — see Task 1 gate), TypeScript 7, Tailwind CSS 4 (`@tailwindcss/vite`), Starwind UI, `@astrojs/sitemap`, playwright-core + system Chrome for screenshot assets.

## Global Constraints

- Copy text is **verbatim** from the approved spec: `docs/superpowers/specs/2026-07-09-landing-page-design.md` — IT from §3, EN from §4. Never paraphrase; if a string looks wrong, stop and ask the owner.
- Colors: accent amber `#f59e0b`, secondary blue `#2563eb`. Light-first "solar editorial / data-confident" (reference mockup: `docs/mockup_landing_page.html`). Typography: system font stack (as in mockup), **no external font/CDN requests**.
- Exactly **one `<h1>` per page**. FAQ questions are `<h3>` inside a section with an `<h2>`.
- Routing: `/` = IT (x-default), `/en/` = EN, `/it/` → 301 to `/` via Cloudflare `_redirects`. **No** Accept-Language auto-redirect.
- Zero client JS except: inline lang-hint script (≤ 20 lines, no framework). FAQ uses native `<details>`.
- No analytics of any kind (v1).
- URLs as constants in `landing/src/config.ts`: `SITE = "https://pvverdict-landing.pages.dev"` (apex domain later), `TOOL_URL = "https://pvverdict.pages.dev"`, `REPO_URL = "https://github.com/duckycoding-dev/pvverdict"`.
- License stays AGPL-3.0 (repo-wide); no separate license file in `landing/`.
- Commits: conventional style in Italian like the rest of the repo; **never add Co-Authored-By or AI-signature trailers** (repo rule).
- All commands run with Bun (`bun`/`bunx`), never npm/pnpm. Working dir for tasks is `landing/` unless stated.
- The tool must be running locally (`bun run web`, port 2345) only for Task 8 (screenshots).

## File Structure

```
landing/
  package.json            # scripts: dev, build, preview, test
  astro.config.mjs        # site, tailwind vite plugin, sitemap
  tsconfig.json           # strict, from astro template
  public/
    _redirects            # /it/* -> / 301
    favicon.svg|ico       # reused from web/public
    logo.png              # pvverdict_fullsize_logo_with_text.png copy
    og.png                # 1200x630, generated in Task 9
    shots/it/*.png        # screenshots IT (Task 8)
    shots/en/*.png        # screenshots EN (Task 8)
  src/
    config.ts             # SITE, TOOL_URL, REPO_URL
    styles/global.css     # tailwind import + theme tokens
    i18n/types.ts         # LandingCopy type
    i18n/it.ts            # copy IT (spec §3, verbatim)
    i18n/en.ts            # copy EN (spec §4, verbatim)
    layouts/Base.astro    # <head>: meta, OG, canonical, hreflang, JSON-LD slot
    components/
      Nav.astro Hero.astro Problem.astro HowItWorks.astro
      Features.astro NotModeled.astro Privacy.astro Faq.astro
      FinalCta.astro Footer.astro LangHint.astro
    pages/index.astro     # IT page
    pages/en/index.astro  # EN page
  scripts/screenshots.ts  # playwright-core capture from local tool
  test/build.ts           # helper: build once, read dist html
  test/i18n.test.ts       # key parity IT/EN
  test/seo.test.ts        # h1, hreflang, canonical, JSON-LD, redirects
```

---

### Task 1: Scaffold Astro + Tailwind + Starwind (compatibility gate)

**Files:**
- Create: `landing/` (scaffold), `landing/src/config.ts`, `landing/public/_redirects`
- Modify: `landing/astro.config.mjs`, `landing/package.json`

**Interfaces:**
- Produces: working `bun run dev` / `bun run build`; `src/config.ts` exporting `SITE`, `TOOL_URL`, `REPO_URL` (all `string` consts) used by every later task.

- [ ] **Step 1: Scaffold the project** (repo root)

```bash
cd /Users/davidemilan/repos/duckycoding/analisi_fotovoltaico
bun create astro@latest landing -- --template minimal --no-git --install
```

Accept defaults at any interactive prompt (TypeScript: strict). Expected: `landing/` created, `astro@^7` in `landing/package.json`.

- [ ] **Step 2: Add Tailwind 4 and sitemap integrations**

```bash
cd landing
bunx astro add tailwind sitemap --yes
```

Expected: `@tailwindcss/vite` + `@astrojs/sitemap` added, `src/styles/global.css` created with `@import "tailwindcss";`.

- [ ] **Step 3: Starwind init — THE COMPATIBILITY GATE**

```bash
bunx starwind@latest init
bunx starwind@latest add button
```

Starwind is documented for **Astro v6**. Two outcomes:
- **Works** (init + add complete, `bun run build` passes): stay on Astro 7.
- **Fails** on Astro 7 (peer-dep error or broken build): pin Astro 6 and retry:

```bash
bun add astro@^6
bunx starwind@latest init
bunx starwind@latest add button
```

Record the outcome in the commit message body (one line: "Astro 7 ok con Starwind" / "fallback Astro 6: <errore>").

- [ ] **Step 4: Set site config**

Replace `landing/astro.config.mjs` content (keep the integrations the CLI added — merge, don't drop):

```js
// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://pvverdict-landing.pages.dev",
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

Create `landing/src/config.ts`:

```ts
/** URL pubblici. Quando verrà comprato il dominio: SITE=https://pvverdict.com, TOOL_URL=https://app.pvverdict.com */
export const SITE = "https://pvverdict-landing.pages.dev";
export const TOOL_URL = "https://pvverdict.pages.dev";
export const REPO_URL = "https://github.com/duckycoding-dev/pvverdict";
```

Create `landing/public/_redirects`:

```
/it/* / 301
/it / 301
```

- [ ] **Step 5: Verify build**

```bash
bun run build
```

Expected: exit 0, `dist/index.html` exists.

- [ ] **Step 6: Commit**

```bash
cd .. && git add landing && git commit -m "feat(landing): scaffold Astro + Tailwind 4 + Starwind"
```

---

### Task 2: Typed i18n copy modules (the whole approved copy)

**Files:**
- Create: `landing/src/i18n/types.ts`, `landing/src/i18n/it.ts`, `landing/src/i18n/en.ts`, `landing/test/i18n.test.ts`

**Interfaces:**
- Produces: `import { it } from "../i18n/it"` / `en` — both typed `LandingCopy`; every section component consumes one field group of this object. Type below is the contract: later tasks reference these exact key names.

- [ ] **Step 1: Write the type** — `landing/src/i18n/types.ts`:

```ts
export type Lang = "it" | "en";

export interface LandingCopy {
  meta: { title: string; description: string };
  nav: { how: string; features: string; faq: string; cta: string };
  hero: {
    h1: string; sub: string; cta: string; micro: string;
    trust: [string, string, string, string];
    verdictBox: { payback: string; battery: string; selfConsumption: string }; // etichette del box-verdetto
  };
  problem: { h2: string; intro: string; points: { title: string; body: string }[]; closing: string };
  how: { h2: string; steps: { title: string; body: string; privacyNote?: string }[] };
  features: { h2: string; items: { title: string; body: string; shot: string; alt: string }[] };
  notModeled: { h2: string; intro: string; points: { title: string; body: string }[]; closing: string };
  privacy: { h2: string; points: { title: string; body: string }[] };
  faq: { h2: string; items: { q: string; a: string }[] };
  finalCta: { h2: string; body: string; cta: string; micro: string };
  footer: {
    product: { label: string; links: { text: string; href: string }[] };
    project: { label: string; links: { text: string; href: string }[] };
    data: { label: string; links: { text: string; href: string }[] };
    bottom: string;
  };
  langHint?: { text: string; link: string }; // solo IT: "View in English →"
}
```

- [ ] **Step 2: Fill `it.ts` and `en.ts`** — content **verbatim** from the spec (`docs/superpowers/specs/2026-07-09-landing-page-design.md`). Exact mapping (same for EN from §4):

| Key | Spec section |
|---|---|
| `hero.*` | §3.1 (H1, sottotitolo, CTA, microcopy, riga-fiducia split on `·`) |
| `problem.*` | §3.2 (intro = paragrafo prima dell'elenco; points = i 3 grassetti+testo; closing = paragrafo "PVVerdict simula…") |
| `how.*` | §3.3 (3 step; `privacyNote` solo step 2 = frase in corsivo) |
| `features.*` | §3.4 (4 item; `shot` = `/shots/{lang}/compare.png`, `daily.png`, `cashflow.png`, `tariff.png`; `alt` = title dell'item) |
| `notModeled.*` | §3.5 |
| `privacy.*` | §3.6 |
| `faq.items[0..6]` | §3.7 (7 Q/A) |
| `finalCta.*` | §3.8 |
| `footer.*` | §3.8 footer; hrefs: tool = `TOOL_URL` (passato dal componente, qui stringhe `#how`, `#faq`, `#not-modeled`, `#privacy`, URL repo/AGPL/PVGIS) |
| `meta.title` | IT: `PVVerdict — Il fotovoltaico ti conviene? Verdetto coi numeri veri`; EN: `PVVerdict — Is rooftop solar worth it? The verdict with real numbers` |
| `meta.description` | IT: prime 2 frasi del sottotitolo hero; EN: idem da §4.1 |
| `langHint` (solo it.ts) | `{ text: "This page is also available in English", link: "View in English →" }` |

Footer fixed hrefs: AGPL → `https://www.gnu.org/licenses/agpl-3.0`, PVGIS → `https://re.jrc.ec.europa.eu/pvg_tools/en/`, GitHub → `REPO_URL` (componente), blog → voce senza link con suffisso *(presto / soon)*.

- [ ] **Step 3: Write the parity test** — `landing/test/i18n.test.ts` (mirror of `web/test/i18n.test.ts` idea):

```ts
import { describe, expect, test } from "bun:test";
import { it as itCopy } from "../src/i18n/it";
import { en as enCopy } from "../src/i18n/en";

function shape(o: unknown, prefix = ""): string[] {
  if (Array.isArray(o)) return o.flatMap((v, i) => shape(v, `${prefix}[${i}]`));
  if (o !== null && typeof o === "object")
    return Object.entries(o).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe("i18n parity", () => {
  test("it/en same structure (langHint escluso)", () => {
    const { langHint: _skip, ...itRest } = itCopy;
    expect(shape(itRest).sort()).toEqual(shape(enCopy).sort());
  });
  test("7 FAQ per lingua", () => {
    expect(itCopy.faq.items).toHaveLength(7);
    expect(enCopy.faq.items).toHaveLength(7);
  });
  test("H1 esatti dalla spec", () => {
    expect(itCopy.hero.h1).toBe("Il fotovoltaico ti conviene davvero? Scoprilo coi numeri veri.");
    expect(enCopy.hero.h1).toBe("Is rooftop solar actually worth it? Find out with real numbers.");
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd landing && bun test
```

Expected: 3 pass.

- [ ] **Step 5: Commit** — `git add landing/src/i18n landing/test && git commit -m "feat(landing): dizionari copy IT/EN dalla spec approvata"`

---

### Task 3: Base layout with full SEO head + test harness

**Files:**
- Create: `landing/src/layouts/Base.astro`, `landing/test/build.ts`, `landing/test/seo.test.ts`

**Interfaces:**
- Consumes: `LandingCopy["meta"]`, `Lang`, `SITE` from Task 1/2.
- Produces: `<Base lang={lang} copy={copy} jsonLd={object|null}>` wrapping page content; test helper `distHtml(path: string): Promise<string>`.

- [ ] **Step 1: Write failing SEO test** — `landing/test/build.ts`:

```ts
import { $ } from "bun";

let built = false;
export async function distHtml(rel: string): Promise<string> {
  if (!built) {
    await $`bunx astro build`.cwd(import.meta.dir + "/..").quiet();
    built = true;
  }
  return await Bun.file(`${import.meta.dir}/../dist/${rel}`).text();
}
```

`landing/test/seo.test.ts` (first assertions; grows in later tasks):

```ts
import { describe, expect, test } from "bun:test";
import { distHtml } from "./build";

describe("SEO head", () => {
  test("hreflang triple su entrambe le pagine", async () => {
    for (const p of ["index.html", "en/index.html"]) {
      const html = await distHtml(p);
      expect(html).toContain('hreflang="it"');
      expect(html).toContain('hreflang="en"');
      expect(html).toContain('hreflang="x-default"');
    }
  });
  test("canonical corretti", async () => {
    expect(await distHtml("index.html")).toContain('rel="canonical" href="https://pvverdict-landing.pages.dev/"');
    expect(await distHtml("en/index.html")).toContain('rel="canonical" href="https://pvverdict-landing.pages.dev/en/"');
  });
  test("html lang", async () => {
    expect(await distHtml("index.html")).toContain('<html lang="it"');
    expect(await distHtml("en/index.html")).toContain('<html lang="en"');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `bun test test/seo.test.ts` → FAIL (pagine non ancora basate su Base/all'URL EN).

- [ ] **Step 3: Implement `Base.astro`**

```astro
---
import { SITE } from "../config";
import type { Lang, LandingCopy } from "../i18n/types";
import "../styles/global.css";

interface Props { lang: Lang; copy: LandingCopy; jsonLd?: object | null }
const { lang, copy, jsonLd = null } = Astro.props;
const path = lang === "it" ? "/" : "/en/";
const canonical = new URL(path, SITE).href;
---
<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{copy.meta.title}</title>
    <meta name="description" content={copy.meta.description} />
    <link rel="canonical" href={canonical} />
    <link rel="alternate" hreflang="it" href={new URL("/", SITE).href} />
    <link rel="alternate" hreflang="en" href={new URL("/en/", SITE).href} />
    <link rel="alternate" hreflang="x-default" href={new URL("/", SITE).href} />
    <link rel="icon" href="/favicon.svg" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={copy.meta.title} />
    <meta property="og:description" content={copy.meta.description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={new URL("/og.png", SITE).href} />
    <meta name="twitter:card" content="summary_large_image" />
    {jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
  </head>
  <body class="bg-white text-slate-900 antialiased">
    <slot />
  </body>
</html>
```

Update `src/pages/index.astro` and create `src/pages/en/index.astro` — both minimal for now:

```astro
---
import Base from "../layouts/Base.astro";   // en/: "../../layouts/Base.astro"
import { it } from "../i18n/it";            // en/: { en } from "../../i18n/en"
---
<Base lang="it" copy={it}><main><h1>{it.hero.h1}</h1></main></Base>
```

- [ ] **Step 4: Run tests** — `bun test` → all pass.
- [ ] **Step 5: Commit** — `git add -A landing && git commit -m "feat(landing): layout base con head SEO completo + test suite su dist"`

---

### Task 4: Design tokens, Nav, Footer

**Files:**
- Modify: `landing/src/styles/global.css`
- Create: `landing/src/components/Nav.astro`, `landing/src/components/Footer.astro`
- Copy: `web/public/pvverdict_fullsize_logo_with_text.png` → `landing/public/logo.png`; `web/public/favicon.ico` + relativi → `landing/public/`

**Interfaces:**
- Consumes: `copy.nav`, `copy.footer`, `TOOL_URL`, `REPO_URL`.
- Produces: `<Nav copy={copy} toolUrl={TOOL_URL} />`, `<Footer copy={copy} toolUrl={TOOL_URL} repoUrl={REPO_URL} year={2026} />`. Section anchor ids fissati QUI e usati da tutti: `#how`, `#features`, `#not-modeled`, `#privacy`, `#faq`.

- [ ] **Step 1: Theme tokens** — append to `global.css` (Tailwind 4 style):

```css
@theme {
  --color-accent: #f59e0b;   /* ambra */
  --color-accent2: #2563eb;  /* blu   */
  --font-sans: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
```

- [ ] **Step 2: Nav** — sticky, logo (img `/logo.png`, alt "PVVerdict"), 3 anchor link (`copy.nav.how → #how`, `features → #features`, `faq → #faq`), bottone `copy.nav.cta → toolUrl` (Starwind button o `<a>` stilizzata ambra). Nav labels in `it.ts`/`en.ts`: IT `{ how: "Come funziona", features: "Cosa vedi", faq: "FAQ", cta: "Prova il tool" }`, EN `{ how: "How it works", features: "What you see", faq: "FAQ", cta: "Try the tool" }` (aggiungerle in Task 2 se non già fatto).
- [ ] **Step 3: Footer** — 3 colonne da `copy.footer` + riga bottom. Href del link "Apri il tool"/"Open the tool" = `toolUrl`; switch lingua: link testuale `IT` → `/`, `EN` → `/en/`.
- [ ] **Step 4: Verify** — `bun run build` ok; visual check `bun run dev`.
- [ ] **Step 5: Commit** — `git commit -m "feat(landing): token di tema, nav e footer"`

---

### Task 5: Hero section

**Files:**
- Create: `landing/src/components/Hero.astro`, `landing/src/components/LangHint.astro`
- Modify: `landing/src/pages/index.astro`, `landing/src/pages/en/index.astro`, `landing/test/seo.test.ts`

**Interfaces:**
- Consumes: `copy.hero`, `TOOL_URL`; hero visual: `/shots/{lang}/daily.png` (arriva in Task 8; fino ad allora l'`<img>` punta al path finale e appare rotta in dev — accettato).
- Produces: `<Hero copy={copy} lang={lang} toolUrl={TOOL_URL} />`; contiene l'unico `<h1>`.

- [ ] **Step 1: Failing test** — add to `seo.test.ts`:

```ts
test("un solo h1 per pagina, testo esatto", async () => {
  const it = await distHtml("index.html");
  const en = await distHtml("en/index.html");
  expect(it.match(/<h1[\s>]/g)?.length).toBe(1);
  expect(en.match(/<h1[\s>]/g)?.length).toBe(1);
  expect(it).toContain("Il fotovoltaico ti conviene davvero?");
  expect(en).toContain("Is rooftop solar actually worth it?");
});
```

- [ ] **Step 2: Run** — FAIL finché Hero non sostituisce il placeholder (attenzione: dopo Task 3 il placeholder ha già 1 h1 — l'assert sul testo del sub/CTA sotto lo distingue: aggiungi `expect(it).toContain("Prova il tool ora")`).
- [ ] **Step 3: Implement Hero** — layout asimmetrico 2 colonne (testo sx, visual dx): `<h1>{copy.hero.h1}</h1>`, `<p>{copy.hero.sub}</p>`, CTA `<a href={toolUrl}>` ambra grande, microcopy `<p class="text-sm">`, riga-fiducia = `copy.hero.trust.join(" · ")` in piccolo; visual = `<img src={`/shots/${lang}/daily.png`} alt=…>` dentro una card con il **box-verdetto** sovrapposto (3 stat: etichette `copy.hero.verdictBox.*` + valori demo Roma fissi: `5.0` anni, `Sì/Yes`, `55%`). Etichette verdictBox in Task 2: IT `{ payback: "Rientro", battery: "Batteria conviene", selfConsumption: "Autoconsumo" }`, EN `{ payback: "Payback", battery: "Battery worth it", selfConsumption: "Self-consumption" }`.
- [ ] **Step 4: LangHint** (solo pagina IT) — inline `<script is:inline>`: se `navigator.language` non inizia per "it" e `localStorage.pv_langhint !== "no"`, mostra barra fissa in alto con `copy.langHint.text` + link `/en/` + bottone ✕ che setta il flag. ≤ 20 righe, niente framework.
- [ ] **Step 5: Run tests** — `bun test` → pass. **Step 6: Commit** — `git commit -m "feat(landing): hero con box-verdetto e hint lingua"`

---

### Task 6: Sections Problem + HowItWorks

**Files:**
- Create: `landing/src/components/Problem.astro`, `landing/src/components/HowItWorks.astro`
- Modify: pages, `landing/test/seo.test.ts`

**Interfaces:**
- Consumes: `copy.problem`, `copy.how`. `HowItWorks` root: `<section id="how">`.
- Produces: componenti montati in entrambe le pagine.

- [ ] **Step 1: Failing test** — add:

```ts
test("sezioni problem/how presenti con h2", async () => {
  const it = await distHtml("index.html");
  expect(it).toContain("Perché un calcolatore fotovoltaico a medie mensili");
  expect(it).toContain('id="how"');
  expect(it).toContain("Tre passi dal tetto al verdetto");
  expect((await distHtml("en/index.html"))).toContain("Three steps from your roof to the verdict");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — Problem: `<h2>`, intro, `<ol>` 3 punti (title bold + body), closing con `<strong>8.760/8,760</strong>` già nel copy. HowItWorks: 3 card numerate; `privacyNote` in `<em>`; micro-screenshot `<img src={`/shots/${lang}/wizard-${n}.png`}>` (n=1..3, assets in Task 8). **Step 4: Run** → PASS. **Step 5: Commit** — `git commit -m "feat(landing): sezioni problema e come funziona"`

---

### Task 7: Sections Features + NotModeled + Privacy + FinalCta

**Files:**
- Create: `Features.astro`, `NotModeled.astro`, `Privacy.astro`, `FinalCta.astro` in `landing/src/components/`
- Modify: pages, `landing/test/seo.test.ts`

**Interfaces:**
- Consumes: `copy.features` (immagini `item.shot`), `copy.notModeled`, `copy.privacy`, `copy.finalCta`, `TOOL_URL`. Anchor ids: `#features`, `#not-modeled`, `#privacy`.

- [ ] **Step 1: Failing test** — add:

```ts
test("sezioni features/notModeled/privacy/finalCta", async () => {
  const it = await distHtml("index.html");
  for (const s of ['id="features"', 'id="not-modeled"', 'id="privacy"',
    "Cosa vedi davvero, numeri alla mano", "Cosa non modelliamo",
    "I tuoi dati restano tuoi", "Pronto per i numeri veri?"]) expect(it).toContain(s);
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — Features: griglia alternata testo/screenshot (4 item, `loading="lazy"`, width/height espliciti per CLS). NotModeled: lista con titoli bold, closing paragrafo. Privacy: 4 punti con icona check ambra. FinalCta: h2 + body + stessa CTA/microcopy dell'hero (`copy.finalCta.cta → TOOL_URL`). **Step 4: Run** → PASS. **Step 5: Commit** — `git commit -m "feat(landing): sezioni feature, limiti del modello, privacy e cta finale"`

---

### Task 8: FAQ (native details) + JSON-LD, pagine complete

**Files:**
- Create: `landing/src/components/Faq.astro`
- Modify: pages (assemblaggio finale in ordine: Nav, Hero, Problem, HowItWorks, Features, NotModeled, Privacy, Faq, FinalCta, Footer + LangHint su IT), `landing/test/seo.test.ts`

**Interfaces:**
- Consumes: `copy.faq`. Root `<section id="faq">`.
- Produces: JSON-LD `FAQPage` costruito nella pagina e passato a `<Base jsonLd={faqJsonLd}>`.

- [ ] **Step 1: Failing test** — add:

```ts
test("FAQPage JSON-LD valido con 7 domande", async () => {
  for (const p of ["index.html", "en/index.html"]) {
    const html = await distHtml(p);
    const m = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    expect(m).not.toBeNull();
    const ld = JSON.parse(m![1]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(7);
  }
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — Faq.astro: `<details>` per item (`<summary>` = `<h3>{q}</h3>`), stile bordo sottile. Nella pagina:

```ts
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: copy.faq.items.map((i) => ({
    "@type": "Question", name: i.q,
    acceptedAnswer: { "@type": "Answer", text: i.a },
  })),
};
```

**Step 4: Run** — `bun test` tutto verde. **Step 5: Commit** — `git commit -m "feat(landing): faq con details nativi e json-ld, pagine complete"`

---

### Task 9: Screenshot assets + OG image

**Files:**
- Create: `landing/scripts/screenshots.ts`, `landing/public/shots/{it,en}/*.png`, `landing/public/og.png`
- Prereq: tool attivo su `http://localhost:2345` (`bun run web` dalla root repo)

**Interfaces:**
- Produces: `daily.png`, `compare.png`, `cashflow.png`, `tariff.png`, `wizard-1..3.png` per lingua — i path consumati da Task 5/6/7.

- [ ] **Step 1: Script** — `landing/scripts/screenshots.ts` (adatta la tecnica già provata in sessione: playwright-core + Chrome di sistema; base: profilo pulito → demo Roma):

```ts
import { chromium } from "playwright-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = new URL("../public/shots/", import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const lang of ["it", "en"] as const) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((l) => localStorage.setItem("lang", l), lang);
  const page = await ctx.newPage();
  await page.goto("http://localhost:2345/", { waitUntil: "networkidle" });
  const tabs = lang === "it"
    ? { daily: "Giorno per giorno", compare: "Confronto", annual: "Panoramica annuale" }
    : { daily: "Day by day", compare: "Compare", annual: "Annual overview" };
  // daily (hero + feature 2)
  await page.getByRole("button", { name: tabs.daily, exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.locator("main").screenshot({ path: `${OUT}${lang}/daily.png` });
  // compare (feature 1)
  await page.getByRole("button", { name: tabs.compare, exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.locator("main").screenshot({ path: `${OUT}${lang}/compare.png` });
  // cashflow (feature 3): sta nella panoramica annuale — screenshot dell'elemento grafico
  await page.getByRole("button", { name: tabs.annual, exact: true }).first().click();
  await page.waitForTimeout(1200);
  const cash = page.locator("text=Andamento economico").locator("xpath=ancestor::section[1]");
  await (await cash.count() ? cash : page.locator("main")).screenshot({ path: `${OUT}${lang}/cashflow.png` });
  await ctx.close();
}
await browser.close();
console.log("done — tariff.png e wizard-1..3.png: vedi step 3");
```

Verifica i nomi esatti dei tab in `web/src/i18n/*.ts` (`tabs.*`) prima di lanciare; correggi le stringhe se differiscono.

- [ ] **Step 2: Run** — `mkdir -p landing/public/shots/it landing/public/shots/en && bun landing/scripts/screenshots.ts`, poi **guarda ogni PNG** (Read): niente pannelli vuoti, lingua giusta.
- [ ] **Step 3: Scatti manuali (tariff + wizard)** — la config tariffa e i 3 step del wizard richiedono interazioni non deterministiche: scattali a mano dal browser (⌘⇧4, area ~1280px di larghezza, tema chiaro, lingua per cartella): `tariff.png` = pannello tariffa nel menu; `wizard-1/2/3.png` = i tre step del wizard aperto da "Esegui il setup…/Run the setup…". Salva negli stessi path. (Se un asset manca, placeholder temporaneo = copia di `daily.png` — MA segnalo nel commit.)
- [ ] **Step 4: OG image** — `landing/public/og.png` 1200×630: componila con lo script canvas (tecnica del logo, `@napi-rs/canvas`): sfondo bianco, logo `landing/public/logo.png` a sinistra, H1 IT su due righe a destra in navy `#0c223c`, barra ambra in basso. Verifica visiva, poi elimina lo script temporaneo (vive in scratchpad, non nel repo).
- [ ] **Step 5: Build + test** — `cd landing && bun test` (verde) e controlla dimensioni: ogni PNG < 300 KB (altrimenti riesporta con `deviceScaleFactor: 1`).
- [ ] **Step 6: Commit** — `git add landing/public landing/scripts && git commit -m "feat(landing): screenshot reali it/en e immagine og"`

---

### Task 10: Final verification + docs

**Files:**
- Modify: `README.md` (riga "Landing page in `landing/`"), `docs/handoff-landing-page.md` (stato), `landing/package.json` (script `test`)

- [ ] **Step 1: Full run**

```bash
cd landing && bun test && bun run build && bunx astro preview &
```

Con preview attivo: apri `http://localhost:4321/`, controlla a occhio IT e `/en/`, anchor scroll, FAQ apri/chiudi, hint lingua (con `localStorage` pulito e browser EN simulato via devtools → sensors o `Object.defineProperty(navigator,'language')` in console).

- [ ] **Step 2: Lighthouse** — da Chrome devtools su preview: Performance/SEO/Accessibility ≥ 95. Se performance sotto: quasi sempre immagini → converti gli shots in WebP (`sips -s format webp` o riesporta) e aggiorna i path.
- [ ] **Step 3: Verifica redirects e sitemap** — `cat dist/_redirects` contiene le 2 righe `/it`; `dist/sitemap-index.xml` esiste e referenzia entrambe le lingue.
- [ ] **Step 4: Docs** — README root: sezione breve "Landing page (`landing/`): sito Astro statico, deploy separato". Handoff: aggiorna "Prossimi passi" (landing implementata, resta deploy+dominio).
- [ ] **Step 5: Commit** — `git commit -m "feat(landing): verifica finale, docs aggiornate"`

---

### Task 11: Deploy checklist (manuale, proprietario)

Non automatizzabile da questo piano — da eseguire sul dashboard Cloudflare:

1. Nuovo progetto Pages `pvverdict-landing`, repo `duckycoding-dev/pvverdict`, **root directory `landing/`**, build `bun run build` (o `bunx astro build`), output `dist`.
2. Verificare che il deploy serva `/`, `/en/`, e che `/it/` → 301 `/`.
3. **Prima del lancio pubblico:** comprare `pvverdict.com`/`.app`, puntare apex → landing, `app.` → tool; aggiornare `landing/src/config.ts` (SITE, TOOL_URL) e rideployare entrambi.
4. **Requisito bloccante (spec §2):** code review del proxy PVGIS in `functions/` — nessun log/persistenza di coordinate o parametri. La frase "inoltra e dimentica" deve essere vera.

---

## Self-review (eseguita)

- **Spec coverage:** §2 decisioni → Task 1 (stack/gate/repo unica), Task 3+8 (SEO/one-pager), Task 1 `_redirects` + Task 3 hreflang (routing), Task 11 (proxy no-log, deploy). §3/§4 copy → Task 2 mapping completo. §5 requisiti → Task 3 (head), 5-8 (sezioni, un h1, lazy/CLS), 9 (assets, OG), 10 (Lighthouse, sitemap), niente analytics (nessun task la introduce). §6 nodi aperti → Task 1 (Starwind gate), Task 9 step 3-4 (grafico-eroe = screenshot reale: scelta presa), Task 11 (dominio).
- **Placeholder scan:** l'unico contenuto non inline è il copy, referenziato con mapping esatto a file+sezione della spec nel repo (fonte canonica, evita divergenza copy/spec). Nessun TBD.
- **Type consistency:** `LandingCopy` (Task 2) è il contratto usato da 4-8; anchor ids fissati in Task 4 e riusati in 6-8; `SITE/TOOL_URL/REPO_URL` da Task 1; `distHtml` da Task 3.
