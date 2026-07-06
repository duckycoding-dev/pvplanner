# Fase 3 — Pubblicazione: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (esecuzione inline con checkpoint). Esecutore raccomandato: **Opus 4.8**. Branch: `feat/fase3-pubblicazione` da `main` (Fasi 1-2 mergiate). A fine fase review whole-branch + **squash merge**. Il deploy effettivo su Cloudflare richiede azioni di Davide (account, dashboard): il piano le isola in checklist esplicite marcate **[AZIONE DAVIDE]**.

**Goal:** app pubblicabile: bilingue IT/EN, condivisione setup via URL, export/import setup, deploy Cloudflare Pages con proxy, licenza AGPL, attribuzioni, privacy, analytics senza cookie.

**Architecture:** i18n senza librerie (dizionari TS piatti + hook `useT` + context); condivisione = stesso oggetto dell'export/import (`SharedConfig`), compresso con `CompressionStream("deflate-raw")` nativo + base64url nell'**hash fragment** (mai query param: il fragment non raggiunge server/proxy → coordinate fuori dai log). Deploy: Cloudflare Pages collegato a GitHub, build Bun, la Pages Function `/api/pvgis` esiste già dalla Fase 1.

## Global Constraints

- Nessuna dipendenza nuova (compressione via `CompressionStream`/`DecompressionStream` nativi; niente lz-string).
- `bun test` verde a fine di ogni task.
- Testi legali/attribuzione vincolanti (verbatim, entrambe le lingue): attribuzione dati "Dati solari: PVGIS © Unione Europea" / "Solar data: PVGIS © European Union"; "Geocoding © OpenStreetMap contributors"; disclaimer "Stime a scopo informativo, non consulenza tecnica o finanziaria" / "Estimates for informational purposes only — not technical or financial advice".
- Licenza **AGPL-3.0** (file LICENSE con testo ufficiale completo).
- Privacy by design: nessun cookie, nessun account, dati solo nel browser, proxy senza log coordinate, analytics = Cloudflare Web Analytics (cookieless, no banner).
- La condivisione URL avvisa che il link contiene la posizione dell'impianto.
- UI: la lingua di default segue il browser (`navigator.language` che inizia per "it" → it, altrimenti en), toggle in header, scelta persistita in localStorage.

## Nota per l'esecutore

- Dipendenze da verificare: Fase 1 (`StoredSetup`, `datasetStore`, wizard, `functions/api/pvgis.ts`, `web/serve.ts`) e Fase 2 (`ConsumptionSpec`, editor consumi). Adatta i dettagli al codice reale; il codice vince sul piano, annota le divergenze.
- L'estrazione i18n (Task 2) è il grosso del lavoro meccanico: procedi file-per-file con la checklist, commit ogni 3-4 componenti per review-abilità.

### Stato reale a fine Fase 2 (verificato, da tenere presente)

- `bun test`: 195 pass / 0 fail su 37 file (con `config.json` presente; su clone fresco i golden personali sono skippati). Squash su main: `b1cc13e`.
- **Ordine wizard cambiato**: `["Località","Tetto","Scarico","Consumi"]` — i consumi (step 4, saltabile) vengono DOPO il fetch perché l'editor ha bisogno dell'asse orario e di `hourlyT2m`. Il flusso share (Task 3) precompila e salta allo step 3.
- `SetupWizard.finish()`: QUALUNQUE chiusura (Fine/✕/Esc/backdrop) con dataset costruito chiama `onComplete` — il dataset è già salvato in IndexedDB da `StepFetch`. Non reintrodurre chiusure che bypassano l'adozione.
- `StoredSetup.consumption?: { spec: ConsumptionSpec; result: CanonicalConsumption }` (opzionale, nessun bump di versione). Per `SharedConfig` basta `setup.consumption.spec` filtrato su monthly/parametric; alla ricezione ricostruisci con `expandMonthlyTemplate` (`src/core/consumption/monthlyTemplate.ts`) o `parametricConsumption` (`web/src/lib/parametricConsumption.ts`) e applica con `applyConsumption` (`web/src/lib/applyConsumption.ts`, puro: salva il chiamante).
- **i18n, superficie nuova dalla Fase 2**: `web/src/components/consumption/*` (5 componenti, molte stringhe lunghe: `FieldSpec.desc` del parametrico, `SHAPE_TIP` del template), `StepConsumption`, sezione Consumi in `Sidebar`. ATTENZIONE: anche i parser core (`src/core/consumption/parseCsv.ts`, `parseEDistribuzione.ts`, `align.ts`, `canonical.ts`) producono warning/errori italiani mostrati in UI — stessa scelta dei `validate*`: valuta chiavi-dal-core tradotte al render, oppure documenta l'eccezione (i warning finiscono anche nei metadati salvati).
- `InfoTip` ora accetta voce inline (`entry={term,desc}`) oltre alla chiave glossario `k`, e monta il portal nel `<dialog>` contenitore (top layer) con clamp nella viewport: il glossario bilingue (Task 1) deve coprire anche le voci inline sparse nei componenti consumi.
- `PARAMETRIC_DISCLAIMER` (`web/src/lib/parametricConsumption.ts`) è obbligatorio e va tradotto mantenendo l'obbligo in entrambe le lingue. Nota: `viz.meta.consumptionNote` (mostrata nel footer) viene *baked* nel dataset alla lingua d'inserimento e non cambia col toggle — decisione da prendere ed esplicitare (accettabile lasciarla; annotalo).
- `examples/` contiene 2 CSV sintetici (generico + e-distribuzione wide) con test di caricabilità (`test/exampleCsv.test.ts`): se il build di produzione copia asset, NON servono nel bundle.

---

### Task 1: Infrastruttura i18n

**Files:**
- Create: `web/src/i18n/types.ts`, `web/src/i18n/it.ts`, `web/src/i18n/en.ts`, `web/src/i18n/useT.tsx`
- Test: `test/i18n.test.ts`

**Interfaces:**

```ts
// types.ts
export type Lang = "it" | "en";
export interface Dict { [key: string]: string }        // chiavi piatte "wizard.location.title"
// useT.tsx
export function LangProvider(props: { children: ReactNode }): JSX.Element;  // legge localStorage "lang", default browser
export function useT(): { t: (key: string, vars?: Record<string, string | number>) => string; lang: Lang; setLang: (l: Lang) => void };
// t(): lookup nel dizionario della lingua attiva, fallback it, fallback chiave stessa (mai throw);
// vars: interpolazione `{name}` → valore.
```

Glossario bilingue: `GLOSSARY` diventa `Record<key, { it: GlossaryEntry; en: GlossaryEntry }>`; `Glossary.tsx` e `InfoTip.tsx` leggono la lingua da `useT`. (Le formule restano identiche nelle due lingue.)

- [ ] **Step 1: test** — `t()` risolve chiave esistente; fallback it per chiave mancante in en; fallback chiave per chiave inesistente (e console.warn una sola volta per chiave); interpolazione `{n}`; parità chiavi: test che confronta `Object.keys(it)` vs `Object.keys(en)` e fallisce elencando le differenze (questo test è il guardiano della manutenzione bilingue).
- [ ] **Step 2: implementa** infra + conversione glossario (con traduzioni EN reali delle voci esistenti, non segnaposto). Commit `feat(i18n): infrastruttura dizionari it/en + glossario bilingue`.

---

### Task 2: Estrazione stringhe (sweep meccanico)

**Files:** tutti i componenti in `web/src/components/**` + `web/src/lib/tariffPresets.ts` (etichette), `App.tsx` (tab, header, footer).

Procedura vincolante per file: (1) individua ogni stringa italiana user-facing (JSX text, label, placeholder, title, aria, messaggi di `validate*` mostrati in UI); (2) sposta in `it.ts` con chiave gerarchica (`compare.row.recClip`, `editor.system.acCap`, …); (3) traduzione EN reale in `en.ts`; (4) sostituisci con `t("…")`. NON estrarre: stringhe di errore interne ai test, messaggi CLI, docs. I messaggi delle funzioni `validate*` in `web/src/lib/**` mostrati in UI: estrai facendo tornare CHIAVI dalla funzione e traducendo al punto di render (firma invariata: ritorna `string | null` dove la string è ora una chiave — aggiorna i test che asserivano il testo).

- [ ] Sweep in 3-4 commit (`feat(i18n): estrazione stringhe — <gruppo file>`); dopo ogni commit `bun test` + avvio dev server e spot-check visivo di entrambe le lingue.
- [ ] Toggle lingua nell'header (`IT | EN`, pattern bottoni esistente) + persistenza. Commit finale `feat(i18n): toggle lingua in header`.

---

### Task 3: Export/import setup + condivisione via URL

**Files:**
- Create: `web/src/lib/shareSetup.ts`
- Modify: wizard/Sidebar (bottoni Esporta/Importa/Condividi), `App.tsx` (boot: lettura hash)
- Test: `test/shareSetup.test.ts`

**Interfaces:**

```ts
// La "ricetta": input, MAI le serie orarie (troppo grandi; e il CSV è personale).
export interface SharedConfig {
  v: 1;
  wizard: WizardInputs;
  consumption?: Extract<ConsumptionSpec, { method: "monthly" | "parametric" }>; // csv escluso by design
  systemA: SystemConfigB; systemB: SystemConfigB;
  tariff: Tariff; incentive: Incentive;
}
export async function encodeShare(c: SharedConfig): Promise<string>;   // JSON → deflate-raw → base64url
export async function decodeShare(hash: string): Promise<SharedConfig>; // throw su malformed/versione ignota
// Export file = JSON.stringify(SharedConfig) leggibile; import = parse + validate (riusa validateWizardInputs ecc.)
```

Flusso condivisione: bottone "Condividi setup" → dialog con avviso vincolante ("Il link contiene la posizione dell'impianto e la configurazione. I consumi da CSV non sono inclusi.") → copia `location.origin + location.pathname + "#s=" + encoded`. Boot in `App.tsx`: se `location.hash` inizia con `#s=` → `decodeShare` → dialog "Configurazione condivisa: scaricare i dati PVGIS per questa località? (N chiamate)" → sì: apre il wizard precompilato direttamente allo step **Scarico** (dopo la Fase 2 è lo step 3; i consumi sono lo step 4) e all'arrivo applica anche consumi/sistemi/tariffa — per i consumi condivisi (monthly/parametric) ricostruisci il risultato con i produttori puri (`expandMonthlyTemplate` / `parametricConsumption`) e applica con `applyConsumption`; no/errore decode: rimuove l'hash e prosegue normale.

- [ ] **Step 1: test** — round-trip encode/decode (con consumption monthly, parametric, assente); hash corrotto → throw; base64url senza `+/=`; dimensione encoded per un setup 3-falde < 2000 caratteri; import file JSON round-trip; CSV mai incluso (type-level + test runtime che uno spec csv viene scartato).
- [ ] **Step 2: implementa** (nota Bun: `CompressionStream` disponibile ≥ 1.1; se il runtime test non lo supporta, implementa con fallback `node:zlib` SOLO nel path di test via injection — annota nel report). Commit `feat(web): export/import setup + condivisione via URL (hash compresso)`.

---

### Task 4: Pagine legali, footer, meta, licenza, README

**Files:**
- Create: `LICENSE` (AGPL-3.0 testo ufficiale), `web/src/components/AboutPrivacy.tsx` (tab/pagina "Info"), README riscritto in inglese
- Modify: `web/index.html` (meta OG/description/lang dinamica), `App.tsx` (footer + tab Info), asset screenshot per OG (istruzioni sotto)

**Vincolante:**
- Footer (sempre visibile, compatto): attribuzioni PVGIS + OSM (testi delle Global Constraints) · disclaimer breve · link "Info & Privacy" · link blog/LinkedIn di Davide + "Offrimi un caffè" (URL segnaposto `TODO-DAVIDE` ben marcati, elencati nella checklist finale).
- Pagina Info & Privacy (bilingue): cos'è il tool, come funziona (3 righe), privacy: "Tutti i dati restano nel tuo browser (IndexedDB/localStorage). Nessun account, nessun cookie di profilazione. Il proxy verso PVGIS non registra le coordinate. Analytics Cloudflare senza cookie." + attribuzioni complete + licenza AGPL con link repo + disclaimer completo.
- `web/index.html`: `<html lang>` aggiornata dal toggle; meta description IT; OG: `og:title`, `og:description`, `og:image` (screenshot 1200×630 — **[AZIONE DAVIDE]** catturarlo dalla dashboard demo e salvarlo in `web/public/og.png`; il piano predispone il tag).
- README.md inglese: cosa fa, screenshot/GIF placeholder, quick start (demo online → link, local dev), architettura in 5 righe, PVGIS/OSM attribution, AGPL badge, licenza. La parte italiana esistente eventualmente in `README.it.md`.

- [ ] Implementa, `bun test` verde, verifica visiva bilingue. Commit `feat: footer legale, pagina privacy, LICENSE AGPL, README EN, meta OG`.

---

### Task 5: Build + deploy Cloudflare Pages + analytics

**Files:**
- Create: `scripts/build-web.ts` o script package.json `"build": "bun build web/index.html --outdir dist --minify"`, `web/public/_headers`
- Modify: `docs/09-deploy.md` (nuovo, checklist completa)
- Test: build locale

**Vincolante:**
- Build: verificare che `bun build web/index.html --outdir dist` bundli TSX + JSON import + CSS e copi gli asset; risultato servibile statico. `_headers`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, CSP minima compatibile con Recharts inline styles e lo script CF analytics (`script-src 'self' https://static.cloudflareinsights.com`)  — verifica pragmatica che l'app parta dal build output con un piccolo `scripts/preview-dist.ts` (`Bun.serve` statico su `dist/`).
- Analytics: snippet Cloudflare Web Analytics (token segnaposto `TODO-DAVIDE`) in `index.html`, condizionato: solo se `location.hostname` non è localhost.
- `docs/09-deploy.md` — checklist **[AZIONE DAVIDE]** numerata: (1) repo su GitHub (visibilità pubblica, AGPL); (2) Cloudflare dashboard → Pages → connect repo, build command `bun run build`, output `dist`, functions dir auto (`functions/`); (3) attivare Web Analytics e incollare il token; (4) dominio custom (CNAME dal dominio del blog) o `*.pages.dev`; (5) riempire i TODO-DAVIDE (link donazioni, og.png, token); (6) smoke test post-deploy: wizard con località reale → fetch via `/api/pvgis` funziona in prod; (7) tag release `v1.0.0`.

- [ ] Implementa + build locale verde + preview-dist funzionante (wizard incluso: il proxy in preview non c'è → attesa: fetch fallisce con messaggio pulito, file-drop funziona — verifica proprio questo failure mode). `bun test` verde. Commit `feat: build produzione + headers + analytics + checklist deploy`.

---

### Task 6: Verifica finale e chiusura

- [ ] Suite completa, flusso end-to-end in entrambe le lingue, condivisione URL round-trip fra due browser/profili, export/import file.
- [ ] Review whole-branch → fix → **squash merge** su main (`feat: pubblicazione — i18n IT/EN, condivisione URL, deploy Cloudflare, AGPL (Fase 3)`).
- [ ] Consegna a Davide: la checklist `docs/09-deploy.md` con i punti [AZIONE DAVIDE] aperti.

## Self-review (fatta in scrittura)

- Copertura spec "Pubblicazione": i18n senza librerie ✓ (dizionari piatti, toggle, browser default, glossario bilingue, guardiano parità chiavi); condivisione URL = ricetta nell'hash, CSV escluso, avviso posizione ✓; export/import spostato qui dalla Fase 1 come annotato in quel piano ✓; deploy CF Pages + function già esistente ✓; attribuzioni/disclaimer/privacy/AGPL verbatim ✓; analytics cookieless ✓; azioni umane isolate in checklist ✓.
- Rischi segnalati: `CompressionStream` nel runtime test Bun (fallback annotato); formato build Bun per asset statici (verifica pragmatica con preview-dist); CSP vs Recharts (testata in preview).
- Nome pubblico dell'app + dominio: ancora questione aperta della spec — da decidere prima del punto (4) della checklist deploy.
