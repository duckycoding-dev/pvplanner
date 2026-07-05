# Fase 1 — Setup wizard: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (esecuzione inline con checkpoint) per implementare questo piano task-per-task. Checkbox `- [ ]` per il tracking. Esecutore raccomandato: **Opus 4.8**. Branch: `feat/fase1-wizard-setup` da `main`; a fine fase **una sola review whole-branch** e **squash merge** su main.

**Goal:** l'utente configura località/falde/anni dal browser, l'app scarica i dati PVGIS via proxy, costruisce il dataset e lo salva in IndexedDB — sostituendo il `viz.json` personale baked. Demo dataset bundlato per il primo accesso; dati personali del proprietario fuori dalla repo.

**Architecture:** si estraggono in funzioni pure (riusabili nel browser) le parti fs-bound della pipeline CLI: parsing dei JSON PVGIS e costruzione dell'oggetto viz. Il browser replica la pipeline: fetch via `/api/pvgis` (handler unico web-standard: Bun.serve in dev, Cloudflare Pages Function in prod) → parse → media multi-anno → produzione (`buildProductionSeries`, già puro) → oggetto viz → IndexedDB. La CLI resta identica per dev/test. **I consumi NON sono in questa fase** (Fase 2): il wizard ha lo step consumi come segnaposto "aggiungi dopo" e il dataset senza consumi attiva la modalità solo-produzione.

**Tech Stack:** TypeScript + Bun; React 19 + Recharts; IndexedDB raw (nessuna libreria); Cloudflare Pages Functions (solo wrapper ~5 righe).

## Global Constraints

- Solo TypeScript + Bun; **nessuna dipendenza nuova** (IndexedDB raw, fetch nativo).
- Stringhe UI in **italiano** (i18n arriva in Fase 3).
- Ogni concetto nuovo in UI → voce in `web/src/lib/glossary.ts` (azimuth, inclinazione, posa, perdite di sistema, database di radiazione, media multi-anno, orizzonte).
- `bun test` (tutta la suite) verde a fine di ogni task.
- Stile UI identico all'esistente: `NumberField`, `label.text-field`, pattern `<dialog>`/pannelli della sidebar, classi CSS esistenti. Niente restyling.
- Funzioni condivise CLI/browser vivono in `src/core/**` e sono **pure** (no fs/Bun/console). I wrapper fs restano in `src/io/**`.
- Modelli deterministici, mai LLM a runtime; le stime marcate come tali.
- Commit frequenti stile repo; il branch verrà squashato: i messaggi atomici servono alla review, non alla storia di main.

## Nota per l'esecutore (LEGGERE PRIMA)

- Questo piano è stato scritto quando `main` era a `278fff6` (fine Fase 0). I riferimenti file:riga valgono per quello stato: **verifica ogni target leggendo il file prima di editare**; se una riga è slittata, aggancia per contenuto.
- Interfacce Fase 0 da cui questo piano dipende (verificane l'esistenza a inizio lavoro): `localHourWeekday(tsUtc, timeZone)` in `src/core/time/localTime.ts`; `computeSystem(input)` con `coupling?: "dc"|"ac"` in `src/core/comparison/computeSystem.ts`; `SystemConfigB.coupling`; `viz.meta.batteryCoupling`; blocco config `simulation`.
- Dove il piano dice "markup a discrezione", la logica/validazione/etichette indicate sono vincolanti, la struttura JSX di dettaglio no.

---

### Task 1: Estrazione parser PVGIS puri (`parseFaldaHourly`, `parsePower`)

I loader attuali (`src/io/loadFaldaHourly.ts`, `src/io/loadPower.ts`) mescolano lettura fs e parsing. Il browser deve parsare gli stessi JSON ricevuti via fetch → si estrae il parsing in `src/core/pvgis/`.

**Files:**
- Create: `src/core/pvgis/parseHourly.ts`, `src/core/pvgis/parsePower.ts`
- Modify: `src/io/loadFaldaHourly.ts`, `src/io/loadPower.ts` (diventano wrapper fs)
- Test: `test/parsePvgis.test.ts` (nuovo)

**Interfaces:**
- Produces:

```ts
// src/core/pvgis/parseHourly.ts
export interface FaldaMeta { id: string; azimuth: number; peakKwp: number }
export interface ParseHourlyResult { series: HourlySeries; negativesClamped: number }
/** Parse a PVGIS seriescalc JSON (already in memory) into a normalized HourlySeries.
 *  Pure: no fs/console. `sourceLabel` only decorates error messages. */
export function parseFaldaHourly(file: unknown, meta: FaldaMeta, sourceLabel: string): ParseHourlyResult;

// src/core/pvgis/parsePower.ts
export function parsePower(file: unknown, meta: { id: string; azimuth: number }, sourceLabel: string): PowerSeries;
```

- [ ] **Step 1: test che falliscono** — in `test/parsePvgis.test.ts`: (a) golden: `parseFaldaHourly(await readJson(dataDir/hourly.json), meta, "x").series` produce lo stesso identico oggetto di `loadFaldaHourly(falda)` per entrambe le falde del config; idem `parsePower` vs `loadPower`; (b) errori: `outputs.hourly` mancante → throw con `sourceLabel` nel messaggio; row count diverso da 8760/8784 → throw; P negativo → clampato e contato in `negativesClamped`.
- [ ] **Step 2: implementa** — sposta il corpo del loop da `loadFaldaHourly.ts:21-48` in `parseFaldaHourly` (il `console.warn` sui negativi RESTA nel wrapper fs, che legge `negativesClamped`); `loadFaldaHourly` diventa: `readJson` → `parseFaldaHourly(file, {id,azimuth,peakKwp: falda.peakpower_kw}, path)` → warn se serve → return series. Stesso schema per `parsePower` (corpo da `loadPower.ts:14-33`). Nessun import fs/Bun nei file sotto `src/core/`.
- [ ] **Step 3:** `bun test` verde. Commit `refactor(core): parser PVGIS puri estratti dai loader fs`.

---

### Task 2: Estrazione `buildVizObject` puro da `writeVizJson`

Il browser deve costruire lo stesso oggetto viz che oggi scrive la CLI.

**Files:**
- Create: `src/core/viz/buildViz.ts`
- Modify: `src/export/writeVizJson.ts` (diventa: `buildVizObject` + `Bun.write`)
- Test: `test/vizExport.test.ts` (estendi)

**Interfaces:**
- Produces:

```ts
// src/core/viz/buildViz.ts — pure, no fs/Bun
export interface VizMetaInput {
  year: number;
  yearLabel: string;              // "2023" oppure "media 2019–2023"
  timeZone: string;
  acCapKw: number;
  batteryTotalKwh: number; batteryUsablePct: number; batteryPortKw: number;
  batteryRoundTrip: number; batteryCoupling: "dc" | "ac";
  installationCostEur: number; incentive: IncentiveConfig;
  falde: { id: string; azimuth: number; peakKwp: number; panelCount: number; wp: number }[];
  consumptionSource: string;      // "none" per dataset senza consumi
  consumptionNote: string;
  multiyearKwh: number;           // 0 se non disponibile (dataset wizard senza PVcalc)
}
export function buildVizObject(prod: ProductionAnalysis, sim: SimulationAnalysis | null, meta: VizMetaInput): Viz-shaped object;
```

- [ ] **Step 1: test che fallisce** — golden in `vizExport.test.ts`: `buildVizObject` con gli input della pipeline CLI produce (deep-equal) lo stesso oggetto oggi scritto in `web/viz.json` (rigenera prima con `bun run analysis` se stantio).
- [ ] **Step 2: implementa** — sposta la costruzione di `obj` da `writeVizJson.ts:44-163` in `buildVizObject`, parametrizzando ciò che oggi viene da `cfg` tramite `VizMetaInput` (writeVizJson costruisce il `VizMetaInput` da `cfg` esattamente come oggi, quindi output invariato; `yearLabel: String(result.year)`, `timeZone: cfg.timezone`, `multiyearKwh` come oggi). **Caso `sim === null`** (dataset senza consumi): `loadKwh`, `nb`, `wb` orari tutti zeri; blocchi annual/monthly nb/wb a zero; `consumptionAnnualKwh: 0`. Le view esistenti non lo vedranno mai finché la modalità solo-produzione (Task 8) non lo gestisce — ma la funzione deve già produrlo, testato con shape-check (lunghezze array, zeri).
- [ ] **Step 3:** aggiungi a `web/src/types.ts` i campi `meta.yearLabel: string`, `meta.timeZone: string`, `meta.consumptionSource: string` (verifica quali esistono già). `bun run analysis` per rigenerare il viz locale. `bun test` verde. Commit `refactor(core): buildVizObject puro; writeVizJson solo writer`.

---

### Task 3: Anno tipico multi-anno + range anni nel fetch

**Files:**
- Create: `src/core/pvgis/typicalYear.ts`, `src/core/pvgis/allowedYears.ts`
- Modify: `src/fetch/urlBuilder.ts` (`hourlyParams` accetta range)
- Test: `test/typicalYear.test.ts`

**Interfaces:**
- Produces:

```ts
// allowedYears.ts — aggiornare a mano quando PVGIS aggiunge anni
export const ALLOWED_YEARS = { "PVGIS-SARAH3": { min: 2005, max: 2023 }, "PVGIS-ERA5": { min: 2005, max: 2023 } } as const;

// typicalYear.ts — pure
/** Collapse a multi-year HourlySeries (N consecutive years from one seriescalc call)
 *  into a typical single year: per (month, day, hour) average of P and T2m,
 *  Feb 29 dropped, axis timestamps taken from the FIRST NON-LEAP year in range. */
export function typicalYear(series: HourlySeries, yearFrom: number, yearTo: number): HourlySeries;
```

`hourlyParams(cfg, falda)`: sostituisci `startyear/endyear = single_year` con un parametro opzionale `years?: { from: number; to: number }` (default: `{from: single_year, to: single_year}`) — la CLI resta invariata, il wizard passa il range.

- [ ] **Step 1: test che falliscono** — `typicalYear`: fixture sintetica 2 anni (2019+2020, 8760+8784 righe, P costante per anno es. 1000 e 2000) → output 8760 righe, P=1.5 kWh/h ovunque, timestamps dell'anno 2019, nessun 29 feb; totale = media dei totali annui (esclusi 29 feb). Un anno singolo → output identico all'input. `ALLOWED_YEARS` sanity.
- [ ] **Step 2: implementa** — bucket per chiave `MM-DD-HH` derivata dal timestamp UTC (usa `new Date(ts).getUTCMonth/Date/Hours`), skip `02-29`; media aritmetica; asse dal primo anno non bisestile nel range (se tutti bisestili — impossibile con range ≥1 reale — usa il primo e droppa 29 feb).
- [ ] **Step 3:** `bun test` verde. Commit `feat(core): anno tipico da range multi-anno + ALLOWED_YEARS`.

---

### Task 4: Proxy PVGIS — handler unico + dev server Bun + Cloudflare Pages Function

CORS: l'API PVGIS non emette `Access-Control-Allow-Origin` (verificato empiricamente 2026-07-04) → il browser DEVE passare da un proxy same-origin, anche in dev (localhost è comunque cross-origin verso re.jrc.ec.europa.eu).

**Files:**
- Create: `src/server/pvgisProxy.ts`, `web/serve.ts`, `functions/api/pvgis.ts`
- Modify: `package.json` (script `web`)
- Test: `test/pvgisProxy.test.ts`

**Interfaces:**
- Produces:

```ts
// src/server/pvgisProxy.ts — web-standard, runs on Bun AND Cloudflare Workers
const PVGIS_BASE = "https://re.jrc.ec.europa.eu/api/v5_3";
const ALLOWED_TOOLS = new Set(["seriescalc", "PVcalc"]);
const ALLOWED_PARAMS = new Set(["lat","lon","raddatabase","usehorizon","outputformat","browser",
  "pvcalculation","peakpower","pvtechchoice","mountingplace","loss","angle","aspect",
  "startyear","endyear","components","fixed"]);
/** GET /api/pvgis?tool=seriescalc&lat=... → passthrough whitelisted verso PVGIS.
 *  Never logs coordinates. `fetchFn` injectable per i test. */
export function proxyPvgis(req: Request, fetchFn: typeof fetch = fetch): Promise<Response>;
```

Comportamento: metodo ≠ GET → 405; `tool` assente o non in whitelist → 400 con messaggio; parametri non in whitelist → scartati silenziosamente; fetch verso PVGIS con timeout 30 s (`AbortSignal.timeout`); risposta: body passthrough, status passthrough, `content-type: application/json`; errore di rete/timeout → 502 `{"error":"PVGIS non raggiungibile"}`.

```ts
// web/serve.ts — dev server (sostituisce `bun ./web/index.html`)
import index from "./index.html";
import { proxyPvgis } from "../src/server/pvgisProxy.ts";
Bun.serve({
  port: Number(process.env.PORT ?? 2345),
  routes: { "/api/pvgis": { GET: (req) => proxyPvgis(req) }, "/*": index },
});
console.log(`dashboard: http://localhost:${process.env.PORT ?? 2345}`);
```

```ts
// functions/api/pvgis.ts — Cloudflare Pages Function (wrapper, nessuna logica)
import { proxyPvgis } from "../../src/server/pvgisProxy.ts";
export const onRequestGet = (ctx: { request: Request }) => proxyPvgis(ctx.request);
```

`package.json`: `"web": "PORT=2345 bun web/serve.ts"`.

- [ ] **Step 1: test che falliscono** — con `fetchFn` mockato: tool non ammesso → 400; parametro estraneo (`evil=1`) non arriva al mock; URL costruito = base + tool + soli parametri whitelisted; POST → 405; mock che lancia → 502. Nessun test tocca la rete vera.
- [ ] **Step 2: implementa** l'handler come da contratto; poi `web/serve.ts` e la function CF.
- [ ] **Step 3: verifica dev server** — `bun web/serve.ts` in background, `curl "http://localhost:2345/api/pvgis?tool=PVcalc&lat=41.9&lon=12.49&peakpower=1&loss=14&outputformat=json"` → JSON PVGIS reale (una sola chiamata di sanity), la home risponde 200. Kill.
- [ ] **Step 4:** `bun test` verde. Commit `feat(server): proxy PVGIS unico (Bun dev + CF Pages Function)`.

---

### Task 5: Storage dataset — IndexedDB + tipi setup

**Files:**
- Create: `web/src/lib/datasetStore.ts`, `web/src/lib/setupTypes.ts`
- Test: `test/setupTypes.test.ts` (solo parti pure: validazione/migrazione; IndexedDB non è testabile in bun senza dipendenze — la parte IDB resta thin e verificata a mano nel Task 8)

**Interfaces:**
- Produces:

```ts
// setupTypes.ts
export interface WizardInputs {
  location: { latitude: number; longitude: number; label: string };
  timeZone: string;                     // IANA
  radiationDb: keyof typeof ALLOWED_YEARS;
  useHorizon: boolean;
  mounting: "building" | "free";
  systemLossPct: number;
  years: { from: number; to: number };  // from === to → anno singolo
  falde: { id: string; azimuth: number; tilt: number; panelCount: number; wp: number }[];
}
export interface StoredSetup {
  version: 1;
  savedAt: number;
  inputs: WizardInputs;
  viz: Viz;
  /** Serie T2m oraria del sito (asse = viz.hourly.timestampsUtc, da falda[0]).
   *  NON è nel viz: serve alla Fase 2 (modello consumi parametrico). */
  hourlyT2m: number[];
}
export function validateWizardInputs(i: WizardInputs): string | null;  // messaggio errore o null
export function parseStoredSetup(json: string): StoredSetup;           // throw su malformed, come parseSystemConfigB

// datasetStore.ts — IndexedDB raw, db "analisi-fv", store "setup", chiave fissa "active"
export function loadSetup(): Promise<StoredSetup | null>;   // null se assente/rotto (con clear del rotto)
export function saveSetup(s: StoredSetup): Promise<void>;
export function clearSetup(): Promise<void>;
```

Validazione (`validateWizardInputs`): lat ∈ [-90,90], lon ∈ [-180,180]; timezone presente in `Intl.supportedValuesOf("timeZone")`; azimuth ∈ [-180,180]; tilt ∈ [0,90]; panelCount ≥ 1 intero; wp ∈ [50,1000]; loss ∈ [0,40]; anni dentro `ALLOWED_YEARS[radiationDb]` e from ≤ to; ≥ 1 falda; id falda non vuoti e unici. Messaggi in italiano, stile `validateAgainstBaseline`.

- [ ] **Step 1: test che falliscono** — `validateWizardInputs`: caso valido → null; un test per ogni regola violata con messaggio atteso. `parseStoredSetup`: round-trip JSON valido; version ≠ 1 → throw; campi mancanti → throw.
- [ ] **Step 2: implementa** (datasetStore: `indexedDB.open` con `onupgradeneeded` che crea lo store; promisify minimale inline, ~50 righe).
- [ ] **Step 3:** `bun test` verde. Commit `feat(web): storage setup (IndexedDB) + tipi e validazione wizard`.

---

### Task 6: Pipeline browser — `buildDataset` (fetch → parse → typical year → viz)

**Files:**
- Create: `web/src/lib/buildDataset.ts`
- Test: `test/buildDataset.test.ts`

**Interfaces:**
- Consumes: Task 1 `parseFaldaHourly`, Task 3 `typicalYear`, Task 2 `buildVizObject`, Task 5 `WizardInputs`.
- Produces:

```ts
export type FetchProgress =
  | { kind: "falda-start"; id: string; index: number; total: number }
  | { kind: "falda-done"; id: string }
  | { kind: "building" };
/** Fetch (via /api/pvgis) + costruzione del Viz per gli input del wizard.
 *  `fetchFn` injectable per i test. `files` opzionale: JSON già in memoria
 *  (percorso file-drop) — se presente salta il fetch di quella falda. */
export async function buildDataset(
  inputs: WizardInputs,
  onProgress: (p: FetchProgress) => void,
  fetchFn: typeof fetch = fetch,
  files?: Map<string, unknown>,       // key = falda.id
): Promise<{ viz: Viz; hourlyT2m: number[] }>;   // t2m dalla falda[0] (post typical-year)
```

Comportamento vincolante:
1. Per ogni falda (sequenziale, non parallelo — cortesia verso PVGIS): URL `/api/pvgis?tool=seriescalc&…` con `pvcalculation=1`, `peakpower = panelCount×wp/1000`, `loss`, `angle=tilt`, `aspect=azimuth`, `mountingplace`, `raddatabase`, `usehorizon`, `startyear/endyear` dal range, `components=1`, `outputformat=json`, `browser=0`. Response non-ok → `Error` con status e testo PVGIS (il chiamante gestisce il retry per falda).
2. `parseFaldaHourly` (multi-anno: il row-count check del parser va rilassato — accetta multipli di anno: aggiorna il parser nel Task 1 se non già fatto: `rows.length` deve essere la somma di anni validi consecutivi, verifica con un calcolo esplicito da `years`); poi `typicalYear` se from<to.
3. `buildProductionSeries({ hourly, power: [], acCapKw: defaultAcCap, year: referenceYear })` — **niente PVcalc nel wizard** (multiyear = 0; il campo era già opzionale nel viz per il Task 2); `defaultAcCap = round(Σ peakKwp)` clampato ≥ 1 (seed: l'utente lo edita poi nell'editor sistemi).
4. `buildVizObject(prod, null, meta)` con `consumptionSource: "none"`, `consumptionNote: ""`, `yearLabel` = `"2023"` o `"media 2019–2023"`, `timeZone: inputs.timeZone`, batteria 0 (l'utente la aggiunge dall'editor), `batteryCoupling: "dc"`, `batteryRoundTrip: 0.9`, `batteryPortKw`: usa il cap AC come default del port, `incentive` default `{mode:"percent", value:50, years:10}`, `installationCostEur: 0`.

- [ ] **Step 1: test che falliscono** — con `fetchFn` mock che serve un JSON seriescalc sintetico (768 righe? no: usa un anno intero sintetico generato dal test, 8760 righe con P noto): (a) URL richiesti corretti per 2 falde; (b) progressi emessi nell'ordine atteso; (c) viz risultante: `meta.consumptionSource === "none"`, produzione oraria = P/1000 scalata, `loadKwh` tutto zero; (d) percorso `files` (file-drop): nessuna chiamata fetch per la falda coperta; (e) fetch non-ok → reject con messaggio contenente lo status.
- [ ] **Step 2: implementa.**
- [ ] **Step 3:** `bun test` verde. Commit `feat(web): buildDataset — pipeline PVGIS completa nel browser`.

---

### Task 7: UI wizard

**Files:**
- Create: `web/src/components/wizard/SetupWizard.tsx` + step files (`StepLocation.tsx`, `StepRoof.tsx`, `StepConsumption.tsx`, `StepFetch.tsx`)
- Modify: `web/src/components/Sidebar.tsx` (pulsante "Setup dati PVGIS…"), `web/src/styles.css` (solo classi nuove `wizard-*`, riusando i token esistenti)
- Test: la logica è già testata nei Task 5-6; i componenti seguono la prassi repo (nessun test React)

**Vincolante (markup di dettaglio a discrezione, pattern = componenti esistenti):**
- `SetupWizard` = `<dialog>` come il menu config esistente; stato `step: 1|2|3|4`; riceve `initialInputs: WizardInputs | null` (prefill da setup salvato) e `onComplete(setup: StoredSetup)`.
- **Step 1 Località**: campi lat/lon (`NumberField`, step 0.001) + campo ricerca con bottone "Cerca" → Nominatim `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=…` (fetch diretto, CORS ok; niente ricerca-mentre-digiti: solo su click, rispetta la rate policy 1 req/s), lista risultati cliccabili che riempiono lat/lon/label. Timezone: `<select>` con `Intl.supportedValuesOf("timeZone")`, default `Intl.DateTimeFormat().resolvedOptions().timeZone`. Attribuzione "© OpenStreetMap contributors" sotto la ricerca. Toggle avanzato: orizzonte (default on).
- **Step 2 Tetto**: righe falda ripetibili (aggiungi/rimuovi; id auto "falda-1"…, editabile): azimuth (hint fisso: "0 = Sud · −90 = Est · +90 = Ovest, convenzione PVGIS"), inclinazione, n° pannelli, Wp. Comuni: posa (`<select>` building/free), perdite % (default 14), database radiazione (`<select>` da `ALLOWED_YEARS`), anni: due `<select>` da/a limitati da `ALLOWED_YEARS[db]`; se from<to mostra etichetta "media ora-per-ora di N anni (YYYY–YYYY)". Validazione live via `validateWizardInputs` (messaggio sotto il form, bottone Avanti disabilitato).
- **Step 3 Consumi (segnaposto Fase 1)**: testo: "L'inserimento dei consumi (CSV, template mensili, stima parametrica) arriva con la prossima versione. Il setup prosegue in modalità solo-produzione: vedrai la produzione dell'impianto; per le analisi economiche e batteria servono i consumi." Bottone unico "Continua".
- **Step 4 Fetch**: lista falde con stato (in attesa / in corso / ok / errore + bottone "Riprova" per-falda), guidata da `buildDataset` con `onProgress`; **file-drop fallback**: zona drop "oppure trascina qui i JSON `seriescalc` scaricati a mano dal sito PVGIS (uno per falda)" → popola la `files` Map per id falda (matching per ordine di drop con select di assegnazione falda). Al successo: costruisce `StoredSetup`, `saveSetup`, chiama `onComplete`.
- Glossario: aggiungi voci `azimuthFalda`, `inclinazione`, `posa`, `perditeSistema`, `dbRadiazione`, `mediaMultiAnno`, `orizzonte` (testi: definizione breve in stile voci esistenti; per azimuth includi la convenzione PVGIS).

- [ ] **Step 1: implementa** i componenti (logica vincolante sopra).
- [ ] **Step 2: verifica manuale** — `bun run web`: wizard si apre dalla sidebar, ricerca "Roma" funziona, validazioni bloccano input assurdi, fetch reale su una località con 1 falda piccola completa e la dashboard passa ai dati nuovi (dopo Task 8), file-drop accetta un hourly.json scaricato dal sito PVGIS.
- [ ] **Step 3:** `bun test` verde. Commit `feat(web): setup wizard (località, falde, anni, fetch, file-drop)`.

---

### Task 8: Boot asincrono + modalità solo-produzione + reseed sistemi

**Files:**
- Modify: `web/src/App.tsx`, `web/src/components/Sidebar.tsx`, view components (gating), `web/src/lib/systemConfig.ts` (helper)
- Test: `test/monoView.test.ts` (estendi con caso senza consumi)

**Vincolante:**
- `App`: `const [dataset, setDataset] = useState<StoredSetup | null | "loading">("loading")`; `useEffect` → `loadSetup()`; viz attivo = `dataset?.viz ?? demoViz` (demo: Task 9; finché non esiste, l'attuale `viz.json`). "loading" → splash minimale.
- Al completamento wizard (`onComplete`): `saveSetup` già fatto; `setDataset`; **reseed**: `setSystemA(cloneFromBaseline(newViz, "Sistema A"))`, idem B, perché la geometria è cambiata (i sistemi salvati in localStorage falliranno comunque `validateAgainstBaseline` al prossimo load — il reseed rende il cambio immediato).
- Banner demo: se `dataset === null` → barra sopra le tab: "Stai guardando dati demo (Roma). ⚙ Esegui il setup per la tua località." con bottone che apre il wizard.
- **Solo-produzione**: helper `export function hasConsumption(viz: Viz): boolean { return viz.meta.consumptionSource !== "none" && viz.meta.consumptionAnnualKwh > 0 }` in systemConfig.ts (o file nuovo `vizFlags.ts`). Gating: nelle tab annuale/mensile/giorno nascondi le sezioni costi/batteria/autoconsumo e mostra un box "🔌 Aggiungi i consumi per sbloccare le analisi economiche e batteria (prossima versione)" ; tab confronto → solo il box. La produzione (grafici teorica/pratica/clipping, tabelle produzione) resta visibile ovunque. Individua i punti esatti con `grep -l "tariff" web/src/components` — ogni componente che riceve `tariff` è un punto di gating.
- `deriveMonoViz` con viz senza consumi: deve già funzionare (array di zeri) — il test nuovo lo blinda: nessun NaN, metriche nb/wb a zero, produzione corretta.

- [ ] **Step 1: test** — `monoView.test.ts`: costruisci un viz sintetico con `consumptionSource: "none"` e loadKwh zeri → `deriveMonoViz` non produce NaN (controlla selfSufficiency=0 con consumo 0 — attenzione alla divisione per zero in `annualMetrics`: già gestita con ternario, verificare).
- [ ] **Step 2: implementa** boot + gating + reseed + banner.
- [ ] **Step 3: verifica manuale** — flusso completo: primo accesso → demo + banner → wizard → fetch reale → dashboard sui dati nuovi in solo-produzione → reload pagina → dataset persiste (IndexedDB).
- [ ] **Step 4:** `bun test` verde. Commit `feat(web): boot da IndexedDB, modalità solo-produzione, reseed sistemi post-wizard`.

---

### Task 9: De-hardcoding dati personali + dataset demo

**Files:**
- Create: `config.example.json`, `config.demo.json`, `web/viz.demo.json` (generato e COMMITTATO), `scripts/build-demo.ts`
- Modify: `.gitignore` (+`config.json`), `src/config/schema.ts` + `loadConfig.ts` (campo `pvgis.data_root` opzionale), `scripts/run-analysis.ts` e `scripts/download.ts` (flag `--config=PATH`), `web/src/App.tsx` (demo import)
- Test: `test/config.test.ts` (data_root)

**Vincolante:**
- `pvgis.data_root?: string` (default `"data/falde"`): `loadConfig` usa `fromRoot(cfg.pvgis.data_root ?? "data/falde", String(f.azimuth))`. Demo config usa `"data/demo"`.
- `config.demo.json`: Roma (41.902, 12.496), timezone Europe/Rome, 1 falda sud (azimuth 0, tilt 25, 10 pannelli × 450 Wp), SARAH3 2023, loss 14, prodotti: riusa i JSON in `system_technical_data/` (sono datasheet pubblici), `consumption.house` generica (150 m², 70 kWh/m²·anno, 2 occupanti, SCOP 4.5, base 2500 kWh), `simulation` dc/0.9, economics 8000 € + detrazione 50%/10.
- `config.example.json`: copia del demo con commento-guida nel README dei campi (JSON non ha commenti: aggiungi sezione in `docs/01-downloader-pvgis.md` o README).
- `scripts/build-demo.ts`: `loadConfig("config.demo.json")` → download dei dati demo se assenti (riusa `runDownload`) → analisi → scrive `web/viz.demo.json` (usa `buildVizObject` + write). Va eseguito una volta e il risultato committato (~2-3 MB accettabili).
- `App.tsx`: `import demoRaw from "../viz.demo.json"` al posto di `viz.json`. **Il `viz.json` personale non è più letto dall'app**: il flusso personale di Davide passa dal wizard (o file-drop dei suoi hourly.json). `bun run analysis` continua a scrivere viz.json per i test golden — aggiorna i test che importano `web/viz.json` SOLO se falliscono (dovrebbero continuare a leggerlo da disco via pipeline live, non dal bundle).
- `.gitignore`: aggiungi `config.json`; `git rm --cached config.json` (il file resta sul disco di Davide). ATTENZIONE: i test usano `loadConfig()` default → sul CI/clone fresco config.json non esisterà. Aggiorna `loadConfig` default: se `config.json` assente E `config.demo.json` presente → usa il demo con un `console.warn`. Così i test girano ovunque (i golden numerici che dipendono dal config personale vanno parametrizzati: sono già "read expectations from config" da commit 26254e2 — verifica).
- `data/` personale: lascia com'è (già committato; contiene solo dati PVGIS pubblici della località — la RIMOZIONE della località personale dalla history è decisione di Davide, vedi Questioni aperte della spec: il piano NON la esegue).

- [ ] **Step 1: test** — `config.test.ts`: config con `data_root` custom → dataDir corretto; loadConfig fallback demo (rinomina temporanea nel test? no — testa la funzione con path espliciti).
- [ ] **Step 2: implementa** + esegui `bun scripts/build-demo.ts` (scarica dati Roma, ~2 chiamate) + committa `web/viz.demo.json` e `data/demo/`.
- [ ] **Step 3:** `bun test` verde (anche simulando l'assenza di config.json: `mv config.json /tmp && bun test && mv` back — documenta l'esito nel report).
- [ ] **Step 4:** commit `feat: dataset demo (Roma) + config personale fuori da git`.

---

### Task 10: Docs + glossario + verifica finale

**Files:**
- Create: `docs/08-wizard-setup.md` (frontmatter standard: architettura wizard, pipeline browser, proxy, storage, typical year, solo-produzione, demo)
- Modify: `docs/index.md` (esecuzione: `bun run web` ora via serve.ts; indice), `docs/01-downloader-pvgis.md` (sezione proxy/browser + `--config`)
- Verifica: `bun test` + `bun run analysis` + flusso wizard manuale end-to-end + `bun run web` servito da serve.ts

- [ ] Scrivi docs, aggiorna frontmatter/`last_updated`, verifica tutto, commit `docs: wizard setup, pipeline browser, demo`.
- [ ] **Chiusura fase**: review whole-branch (modello più capace disponibile), fix, poi **squash merge** su main: `git checkout main && git merge --squash feat/fase1-wizard-setup && git commit -m "feat: setup wizard — PVGIS dal browser, IndexedDB, demo Roma (Fase 1)"`.

## Self-review (fatta in scrittura)

- Copertura spec Fase "wizard": passi 1-5 ✓ (step 3 segnaposto, consumi = Fase 2 come da confine dichiarato), dataset+IndexedDB ✓, invalidazione: coperta dal reseed+validate ✓, export/import setup JSON → **spostato in Fase 3** (insieme alla condivisione URL, stesso formato) — deviazione consapevole dalla spec per bilanciare le fasi, annotata qui.
- Proxy: whitelist, no log coordinate, dev+prod ✓. File-drop ✓. Multi-anno con etichetta ✓. De-hardcoding ✓ (tranne history purge = decisione umana).
- Tipi cross-task dichiarati nei blocchi Interfaces; l'esecutore verifica i riferimenti riga contro il codice reale.
