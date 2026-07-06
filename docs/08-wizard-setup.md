---
title: Wizard di setup e pipeline browser
last_updated: 2026-07-06
summary: Come la SPA raccoglie la configurazione dell'impianto (wizard 4 step), scarica i dati PVGIS dal browser via proxy same-origin, costruisce l'anno tipico e il viz, li conserva in IndexedDB e gira in modalità solo-produzione finché non ci sono i consumi.
status: draft
legend:
  - "wizard: procedura guidata 4 step per raccogliere gli input dell'impianto"
  - "proxy PVGIS: endpoint same-origin /api/pvgis che inoltra a PVGIS (aggira il CORS)"
  - "anno tipico: singola serie oraria ottenuta mediando N anni ora-per-ora"
  - "StoredSetup: record salvato in IndexedDB (inputs + viz + T2m oraria)"
  - "solo-produzione: dataset senza consumi → viste economiche/batteria disattivate"
  - "seriescalc: tool PVGIS orario (P + radiazione + T2m)"
related:
  - index.md
  - 01-downloader-pvgis.md
  - 02-modello-produzione.md
  - 07-consumi.md
---

# Wizard di setup e pipeline browser

La dashboard non parte più solo da un `viz.json` pre-calcolato da CLI: chiunque apra la SPA può
**configurare il proprio impianto e scaricare i dati PVGIS direttamente dal browser**, senza clonare
il repo né usare Bun. Il downloader CLI (`01-downloader-pvgis.md`) resta la via riproducibile per il
dataset committato; il wizard è la via interattiva per l'utente finale. **Condividono lo stesso parser
PVGIS e la stessa costruzione del viz** — cambia solo chi orchestra le chiamate (script fs vs browser).

## Architettura del wizard

Il wizard è un `<dialog>` nativo (stesso pattern del menu di configurazione), gestito da
`web/src/components/wizard/SetupWizard.tsx`. Quattro step, con navigazione avanti/indietro e
validazione live:

1. **Località** (`StepLocation.tsx`) — coordinate lat/lon, ricerca testuale di un luogo via
   **Nominatim (OpenStreetMap)**, fuso orario IANA, toggle orizzonte. La ricerca parte **solo su click
   del bottone** (mai as-you-type), per rispettare la rate policy di 1 req/s di OSM; l'attribuzione
   «© OpenStreetMap contributors» è sempre a schermo.
2. **Tetto** (`StepRoof.tsx`) — **falde ripetibili** (azimuth, inclinazione, n° pannelli, Wp), più i
   parametri comuni: posa (`building`/`free`), perdite di sistema %, database di radiazione,
   intervallo anni. Cambiando database gli anni vengono riportati dentro l'intervallo consentito.
3. **Scarico** (`StepFetch.tsx`) — fetch dei dati PVGIS falda per falda con stato per-falda; al
   termine costruisce e salva lo `StoredSetup` e **avanza allo step Consumi**.
4. **Consumi** (`StepConsumption.tsx`) — ospita l'**editor consumi** (Fase 2: CSV, template mensili,
   stima parametrica) sul dataset appena scaricato. È **saltabile**: si può concludere senza consumi
   (dataset solo-produzione) e aggiungerli dopo dalla sezione «Consumi» del menu di configurazione.

> **Nota sull'ordine (Fase 2):** i consumi seguono lo **Scarico**, non lo precedono come nella Fase 1.
> Motivo: l'editor ha bisogno dell'**asse orario** e della **temperatura reale del sito** (`hourlyT2m`),
> disponibili solo dopo il download PVGIS — in particolare la stima parametrica. La stessa
> `ConsumptionEditor` è riusata nel wizard e nella sidebar; il dettaglio dei tre metodi è in
> `07-consumi.md`.

Gli input raccolti hanno il tipo `WizardInputs` (`web/src/lib/setupTypes.ts`) e sono validati da
`validateWizardInputs`, che ritorna il **primo** messaggio d'errore (in italiano) o `null`. I controlli:
lat ∈ [−90, 90], lon ∈ [−180, 180], fuso orario tra quelli di `Intl.supportedValuesOf`, perdite ∈
[0, 40], anni dentro `ALLOWED_YEARS[db]` con `from ≤ to`, almeno una falda, id falde non vuoti e unici,
azimuth ∈ [−180, 180], tilt ∈ [0, 90], `panelCount` intero ≥ 1, Wp ∈ [50, 1000].

## Pipeline browser: fetch → parse → anno tipico → viz

Tutta la pipeline vive in `web/src/lib/buildDataset.ts` (`buildDataset`) ed è **una versione browser
della catena CLI**, che riusa i moduli puri di `src/core/`:

1. **Fetch sequenziale.** Per ogni falda si costruisce un URL verso il proxy same-origin
   `/api/pvgis?tool=seriescalc&…` (`peakpower` = `panelCount × Wp / 1000`) e si scarica **una falda
   alla volta** (cortesia verso PVGIS). Una risposta non-ok lancia un `Error` con status + testo di
   PVGIS. `fetchFn` è iniettabile per i test.
2. **Parse.** Il JSON `seriescalc` passa in `parseFaldaHourly` (`src/core/pvgis/parseHourly.ts`, puro),
   lo stesso parser usato dal loader fs `src/io/loadFaldaHourly.ts` — il loader è solo un wrapper che
   legge il file da disco e delega al parser.
3. **Anno tipico.** Se l'intervallo copre più anni (`from < to`), la serie multi-anno viene fusa in un
   solo anno tipico con `typicalYear` (vedi sotto); con anno singolo la serie passa invariata.
4. **Produzione.** `buildProductionSeries` combina le falde. In questo percorso `power` è vuoto
   (**nessun PVcalc**: niente totali multi-anno → `multiyearKwh = 0`) e `acCapKw` è un **seed** pari a
   `Σ peakKwp` arrotondato (≥ 1), che l'utente ritocca poi nell'editor sistemi.
5. **Viz.** `buildVizObject` (`src/core/viz/buildViz.ts`, puro) produce l'oggetto viz. Poiché non ci
   sono consumi né simulazione batteria, viene chiamato con `sim = null` (dataset **solo-produzione**)
   e `meta` con `consumptionSource: "none"`, batteria a 0 e incentivo seed 50% su 10 anni.

`buildDataset` ritorna `{ viz, hourlyT2m }`: la serie T2m oraria del sito (dalla prima falda) non fa
parte del viz ma viene conservata perché servirà al modello consumi della Fase 2 (vedi
`07-consumi.md`).

`buildVizObject` e `writeVizJson` sono separati apposta: il primo è puro e condiviso da CLI e browser,
il secondo (`src/export/writeVizJson.ts`) è **solo il writer fs** usato dagli script Bun.

## Proxy PVGIS

**Perché serve.** PVGIS non emette header CORS (`Access-Control-Allow-Origin`), quindi il browser non
può chiamare `re.jrc.ec.europa.eu` direttamente. Ogni richiesta passa da un endpoint same-origin
`/api/pvgis` che fa da passthrough.

**Un solo handler, due host.** La logica è tutta in `src/server/pvgisProxy.ts` (`proxyPvgis`), scritto
solo con Web API standard (`Request`/`Response`/`fetch`) così da girare identico:

- **dev**: `web/serve.ts` (Bun, `bun run web`, porta 2345) monta `GET /api/pvgis` sul proxy e serve la
  SPA;
- **prod**: `functions/api/pvgis.ts` è un wrapper Cloudflare Pages Function (`onRequestGet`) che chiama
  lo stesso `proxyPvgis` — nessuna logica duplicata.

**Comportamento** (whitelist, mai fiducia cieca nel client):

- metodo ≠ GET → **405**;
- `tool` assente o non in `{seriescalc, PVcalc}` → **400**; il param `tool` non viene inoltrato a PVGIS;
- solo i parametri in whitelist (`lat, lon, raddatabase, usehorizon, outputformat, browser,
  pvcalculation, peakpower, pvtechchoice, mountingplace, loss, angle, aspect, startyear, endyear,
  components, fixed`) vengono inoltrati; gli altri sono **scartati silenziosamente**;
- errore di rete o timeout (**30 s**) → **502** `{"error":"PVGIS non raggiungibile"}`.

**Privacy.** Il proxy non logga **mai** le coordinate (lat/lon) né l'URL completo verso PVGIS.

## Storage IndexedDB

Il setup attivo è conservato in IndexedDB (`web/src/lib/datasetStore.ts`): database `analisi-fv`, store
`setup`, chiave `active`. API: `loadSetup`, `saveSetup`, `clearSetup`. Gira **solo nel browser** e non
va importato nei test (userebbe lo structured clone di IndexedDB).

Il record è salvato come **stringa JSON** (non structured clone). Così `saveSetup` e `loadSetup`
condividono un solo codepath di validazione (`parseStoredSetup` lavora su stringa), la serializzazione
è indipendente dalle capacità del browser, e un record scritto da una versione futura con struttura
diversa fallisce in modo controllato. Un record illeggibile viene **rimosso** e trattato come «nessun
setup».

Formato `StoredSetup` (`setupTypes.ts`):

| Campo | Tipo | Note |
|---|---|---|
| `version` | `1` | Versione dello schema; `parseStoredSetup` rifiuta valori diversi. |
| `savedAt` | number | Timestamp epoch ms del salvataggio. |
| `inputs` | `WizardInputs` | Gli input del wizard (riprefillano il wizard a riapertura). |
| `viz` | `Viz` | L'oggetto viz completo (output nostro, non validato in profondità). |
| `hourlyT2m` | `number[]` | Serie T2m oraria del sito (asse = `viz.hourly.timestampsUtc`, da falda[0]). **Non** è nel viz: serve al modello consumi parametrico (Fase 2). |
| `consumption?` | `{ spec, result }` | **Opzionale** (Fase 2): come sono stati inseriti i consumi (`ConsumptionSpec`) + il risultato canonico. Assente nei setup di Fase 1. Il CSV grezzo non si salva. |

`parseStoredSetup` verifica i campi principali (version === 1, `savedAt` numero, `inputs`/`viz`
oggetti, `hourlyT2m` array) e lancia con messaggio chiaro se il record è malformato. Il campo
`consumption` è opzionale e passa senza validazione profonda (i setup di Fase 1 non lo hanno → nessun
bump di versione).

## Anno tipico da range multi-anno

`typicalYear` (`src/core/pvgis/typicalYear.ts`, puro) fonde una serie oraria che copre N anni
consecutivi (una sola chiamata `seriescalc` con `startyear ≠ endyear`) in un **anno tipico**:

- per ogni bucket `(mese, giorno, ora)` si fa la **media aritmetica** di `P` (produzione) e T2m sui
  vari anni;
- il **29 febbraio è scartato** ovunque: non contribuisce ai bucket e non compare nell'asse;
- l'asse di output (timestamp + mesi) è preso dal **primo anno non bisestile** del range, così ha
  esattamente 8760 righe senza giorno bisestile (fallback al primo anno se — caso impossibile per un
  range reale ≥ 2 anni — fossero tutti bisestili);
- `reconstructedCount` viene portato invariato: riflette le righe ricostruite da PVGIS nei dati
  *sorgente* (un segnale di qualità del dato), che la media non azzera.

Con anno singolo (`from === to`) la serie è restituita invariata: non c'è nulla da mediare.

**Trade-off.** L'anno tipico attenua le annate anomale e dà una stima «media» più robusta di un anno
singolo, ma **appiattisce i picchi** e non descrive un anno realmente accaduto. Gli anni ammessi per
database sono in `ALLOWED_YEARS` (`src/core/pvgis/allowedYears.ts`): SARAH3 ed ERA5 2005–2023 —
aggiornabile a mano quando PVGIS estende la copertura.

## Modalità solo-produzione

Un setup dal wizard senza consumi applicati gira in modalità solo-produzione finché non se ne
aggiungono (dallo step Consumi del wizard o dalla sezione «Consumi» del menu). Il gate è
`hasConsumption(viz)` (`web/src/lib/vizFlags.ts`): `true` solo se `meta.consumptionSource !== "none"`
**e** `meta.consumptionAnnualKwh > 0`. Applicare i consumi (`applyConsumption` → `saveSetup` → stato App)
lo sblocca da solo.

Quando è `false`:

- **Panoramica annuale**, **Mensile**, **Giorno-per-giorno** ricevono `hasConsumption={false}` e
  mostrano solo la produzione, disattivando le sezioni economiche e di batteria;
- il tab **Confronto** non renderizza il confronto A/B ma un box `ConsumptionLockedBox` che spiega che
  servono i consumi.

## Boot, dataset demo e fallback config

**Boot della SPA** (`web/src/App.tsx`). Allo start lo stato `dataset` è `"loading"` e la app mostra uno
splash minimale finché IndexedDB non risponde (niente flash della dashboard). Poi:

- se c'è uno `StoredSetup` salvato → è quello il dataset attivo;
- se non c'è → si usa il **viz demo** (fallback statico) e compare un banner «Stai guardando dati demo
  (Roma)» con il bottone per aprire il wizard.

I persist su localStorage (Sistema A/B, tariffa, incentivi) restano **sospesi durante il boot**, così
la lettura iniziale non viene sovrascritta da valori placeholder pre-boot. A fine wizard
(`onSetupComplete`) il nuovo dataset viene adottato e i Sistemi A/B vengono **ri-derivati** dal nuovo
viz con `cloneFromBaseline` (la geometria è cambiata: i sistemi salvati fallirebbero la validazione
contro la nuova baseline).

**Dataset demo.** `config.demo.json` descrive un impianto a Roma (1 falda Sud, 10 × 465 Wp, SARAH3
2023, consumi casa generici). Lo script `scripts/build-demo.ts` (eseguito con `bun scripts/build-demo.ts`)
scarica i dati PVGIS in `data/demo/` se mancanti, gira l'analisi completa e scrive `web/viz.demo.json`.
Sia `web/viz.demo.json` sia `data/demo/` sono **committati**, così app e test funzionano su un clone
fresco senza toccare la rete. `config.example.json` è una copia del demo da cui partire.

**Fallback config.** `config.json` è **personale e fuori da git**; `loadConfig` ripiega su
`config.demo.json` con un warning se `config.json` è assente. Il campo opzionale `pvgis.data_root`
(default `data/falde`) permette al demo di puntare a `data/demo`. Sia `scripts/run-analysis.ts` sia
`scripts/download.ts` accettano `--config=PATH` (vedi `01-downloader-pvgis.md`).

## File-drop (download manuale)

Nello step Scarico si possono **trascinare (o scegliere) i JSON `seriescalc`** scaricati a mano dal
sito PVGIS — utile se il proxy non è raggiungibile o si preferisce non far chiamare PVGIS al browser.
Ogni file viene assegnato a una falda (per ordine di drop, con `<select>` per correggere; l'ultima
assegnazione a una falda vince). I file assegnati vengono passati a `buildDataset` nella mappa `files`
(per id falda): per le falde coperte da un file, `buildDataset` **salta il fetch** e usa il JSON in
memoria.

Il **retry** dello step Scarico ri-esegue l'intera pipeline da capo: `buildDataset` non conserva i JSON
già scaricati, quindi «Riprova» ri-scarica tutte le falde non coperte da file — accettabile per la
Fase 1.
