---
title: Sistema A editabile + viste mono live — design
last_updated: 2026-06-29
summary: Rendere il Sistema A un sistema di prima classe pienamente editabile dalla UI (pannelli, W, inverter, batteria, round-trip, costo installazione), seedato dai default di config.json. Le viste mono (Panoramica/Mensile/Giorno) passano dal leggere scenari precotti in viz.json al calcolo live da Sistema A. config.json resta solo seed.
status: draft
legend:
  - "Sistema A: configurazione primaria, mostrata nelle viste mono; ora editabile"
  - "Sistema B: configurazione alternativa, mostrata solo nel Confronto"
  - "viste mono: Panoramica annuale, Mensile, Giorno per giorno (un sistema alla volta)"
  - "senza/con: scenario dello stesso sistema A senza vs con la sua batteria"
  - "seed: valore iniziale di default (da config.json via viz.meta), poi modificabile"
related:
  - 04-confronto-sistemi.md
  - 05-costi-fasce.md
  - 06-economia.md
  - specs/2026-06-29-config-sidebar-e-prezzi-fasce-design.md
---

# Sistema A editabile + viste mono live — design

## Problema
Oggi il Sistema A è **cotto in `config.json`** (batteria BYD inclusa) e `bun run analysis` precalcola in
`viz.json` due scenari fissi (`annual.nb/wb`, `hourly.nb/wb`, `monthly[].nb/wb`). Le viste mono leggono
quegli scenari → la batteria di A è **bloccata**. Nel Confronto, A è un clone fisso della baseline, quindi
A porta sempre la batteria di config. Non si può rispondere "quanto cambia se A ha una batteria diversa
o nessuna batteria?" senza rigenerare `viz.json`.

## Decisione
**A e B sono entrambi sistemi pienamente editabili dalla UI**, seedati dai default di `config.json`
(via `viz.meta`). Editabili: numero pannelli e W per falda, tetto AC inverter, capacità batteria totale,
% utilizzabile, round-trip, **costo installazione**. `config.json` resta **solo il seed** (utile alla
pipeline a script); la UI privilegia la rapidità di modifica al volo.

- Le **viste mono seguono il Sistema A**, calcolato **live** nel browser: `senza` = A senza batteria,
  `con` = A con la sua batteria. Se la **batteria utile di A = 0** → si mostra **solo `senza`** (FV puro):
  niente colonna/sezione "con".
- Il **Confronto** compara il Sistema A reale (editato) vs Sistema B. La colonna "senza FV" resta sempre
  in tabella; la colonna B compare quando B **differisce da A** (non più "da baseline").
- `viz.json` continua a contenere gli scenari precotti (li usa ancora la pipeline a script e i golden
  test); la SPA semplicemente **non li legge più** nelle viste mono. Una sola fonte di verità a runtime:
  `computeSystem`. (Rimuoverli da `viz.json` è una pulizia futura, fuori scope qui.)

### Perché non "A sempre puro"
A con batteria=0 è già "FV puro": l'editabilità piena è un superset. Tenere A editabile permette anche
di vedere A-con-batteria come singolo sistema nelle viste mono (il cuore della domanda "conviene la
batteria?").

## Architettura

### 1. Stato e persistenza (`App.tsx`)
- Nuovo stato `systemA: SystemConfigB`, seed `{ ...cloneFromBaseline(viz), label: "Sistema A" }`,
  persistito in `localStorage["systemA"]`, validato con `validateAgainstBaseline` al load (come B).
- `systemB` invariato. Entrambi seedati dagli stessi default.
- Le viste mono ricevono una **Viz derivata da A** (`vizA`) + `hasBatteryA`; il Confronto riceve
  `systemA` e `systemB` reali.

### 2. Derivazione live (`web/src/lib/monoView.ts`, nuovo, puro)
```ts
export interface MonoView { vizA: Viz; hasBattery: boolean }
export function deriveMonoViz(viz: Viz, systemA: SystemConfigB): MonoView
```
Calcola due risultati con `runSystem`:
- `resSenza = runSystem({ ...systemA, batteryTotalKwh: 0 }, viz)` (forza no-batteria),
- `resCon   = runSystem(systemA, viz)` (con la batteria di A; identico a `resSenza` se batteria=0).

`hasBattery = batteryUsableKwh(systemA) > 0`.

Ricostruisce un oggetto `Viz` con la **stessa forma** che le viste già consumano, così i componenti
cambiano pochissimo:
- `meta`: `{ ...viz.meta, acCapKw, batteryUsableKwh, batteryTotalKwh, batteryUsablePct,
  batteryRoundTrip, installationCostEur, falde }` riflettono A (`falde[].peakKwp` ricalcolata da A).
- `annual.production`: da `resCon.production.annual` (teorica/pratica/clipping/clippedHours/peak);
  `multiyearKwh` = `viz.annual.production.multiyearKwh × (kWpTotale(A) / kWpTotale(baseline))`
  (linearità PVGIS; guardia se baseline kWp = 0).
- `annual.noBattery` = `resSenza.metrics`; `annual.withBattery` = `resCon.metrics` (+ `battery`).
- `annual.delta`: ricalcolata (`selfConsumedKwh`, `selfSufficiencyPoints`, `importReductionKwh`,
  `exportReductionKwh`) da nb/wb.
- `monthly[]`: da `resCon.production.monthly` (prod) + `resSenza.monthly` (nb) + `resCon.monthly` (wb).
- `hourly`: `{ ...viz.hourly }` (timestamps, months, localHour, weekday, falde, loadKwh condivisi)
  con `productionTheoretical/Practical/clipping` da `resCon.production.hourly`, `nb` da
  `resSenza.hourly`, `wb` da `resCon.hourly`.

`scenarioCost(vizA, "con"|"senza", tariff)` funziona invariato perché legge `vizA.hourly.nb/wb`.

### 3. Editor generico (`SystemEditor`, da `SystemBEditor`)
Rinominare/generalizzare `SystemBEditor` → `SystemEditor` con props
`{ viz, system, setSystem, title, downloadName, copyFrom? }`:
- etichette parametriche (es. "Nome", "Totale") senza "B" hardcoded;
- riga di riferimento mostra i **default da config** (`viz.meta`) come seed;
- bottoni: **"Reset ai default"** (`{ ...cloneFromBaseline(viz), label }`), **Esporta**, **Importa**;
  per B anche **"Copia da A"** (`copyFrom` = `systemA` corrente).
- `Sidebar` espone due sezioni: **"Sistema A"** e **"Sistema B"**, entrambe `SystemEditor`.

### 4. Adattamento `hasBattery` nelle viste mono
Quando `hasBattery = false`, niente "con":
- **AnnualOverview**: card KPI a valore singolo (solo `senza`); nascondi card "Cicli" e
  "Perdita round-trip"; tabella costi a **una colonna** ("FV"); payback usa il netto `senza`
  (FV-only) vs «senza FV».
- **MonthlyView**: tabella costi una colonna; toggle scenario nascosto (solo barre `senza`).
- **DailyExplorer**: scenario forzato a `senza`, bottoni scenario + grafico SoC nascosti, tabella a
  una colonna.
Quando `hasBattery = true`: comportamento attuale (senza/con + Δ = effetto batteria).

### 5. Confronto (`ComparePage`)
- Prop in ingresso: `systemA` (reale) oltre a `systemB`. `caseA = runSystem(systemA)` (non più
  `cloneFromBaseline`).
- `bDiffers` = `!equalsSystems(systemA, systemB)` (nuovo helper, generalizza `equalsBaseline`):
  colonne `[senza FV | A | B]` se B≠A, altrimenti `[senza FV | A]`.
- Etichetta colonna A = `systemA.label` (default "Sistema A"); CAPEX A = `systemA.installationCostEur`.
- I grafici (giorno/mensile/annuale) restano A vs B; capacità batteria A/B già passate.

### 6. Header (`App.tsx`)
Il sottotitolo riflette A corrente (falde, tetto AC, batteria utile di A) invece dei valori cotti.

## Componenti toccati
- Nuovo: `web/src/lib/monoView.ts` (puro) + `test/monoView.test.ts`.
- `web/src/lib/systemConfig.ts`: `equalsSystems(a, b)`; `cloneFromBaseline` accetta label opzionale
  (o si setta a valle).
- `web/src/components/SystemEditor.tsx` (ex `SystemBEditor.tsx`).
- `web/src/components/Sidebar.tsx`: sezione "Sistema A".
- `web/src/components/AnnualOverview.tsx`, `MonthlyView.tsx`, `DailyExplorer.tsx`: prop `vizA` +
  `hasBattery`, adattamenti.
- `web/src/components/ComparePage.tsx`: prop `systemA`, `equalsSystems`.
- `web/src/App.tsx`: stato `systemA`, persistenza, derivazione `vizA`, wiring.
- Doc: questo file + aggiornamento `04`/`05`/`06` dove citano "baseline cotta".

## Invarianti / test
- **Golden di coerenza**: `deriveMonoViz(viz, { ...cloneFromBaseline(viz), label })` riproduce
  `viz.annual`/`viz.monthly`/`viz.hourly` originali entro arrotondamento (garanzia che il path live ==
  pipeline a script; poggia su `comparison.test.ts`).
- `hasBattery` true sse e solo se `batteryUsableKwh(systemA) > 0`.
- Batteria=0 ⇒ `resCon` numericamente identico a `resSenza` (nessun "con" spurio).
- `equalsSystems(a, a)` = true; differenza su qualunque campo equipaggiamento/costo ⇒ false.

## Fuori scope (ora)
- Rimuovere gli scenari precotti da `viz.json` (pulizia successiva).
- Far seguire alle viste mono un sistema scelto (A **o** B): per ora mono = A.
- Editare geometria (azimuth/tilt/sito): resta vincolata alla baseline (richiederebbe ri-download).
