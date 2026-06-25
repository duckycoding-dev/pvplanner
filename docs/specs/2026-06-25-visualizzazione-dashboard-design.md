---
title: Dashboard di visualizzazione (SPA) — design
last_updated: 2026-06-25
summary: SPA Bun+React+Recharts che visualizza i risultati pre-calcolati (produzione, clipping, simulazione batteria) in 3 viste — annuale, mensile, giorno-per-giorno — leggendo un viz.json compatto.
status: draft
related:
  - 02-modello-produzione.md
  - 03-simulazione-batteria.md
---

# Dashboard di visualizzazione — design

## Context
I CSV/JSON in `output/` non sono verificabili a occhio. Serve una **visualizzazione** per leggere i
risultati (produzione, clipping, autoconsumo, batteria) e validare il modello. Scelta confermata con
l'utente: **opzione 1** = visualizzare risultati **pre-calcolati** (niente ricalcolo nel browser);
stack **Bun + React + Recharts** (un solo toolchain, `bun init --react`, dev server HTML integrato con
HMR a zero config). Il ricalcolo dal vivo (slider) sarà un'evoluzione futura (opzione 2), resa facile
dal fatto che il `core` è TS puro importabile.

## Scope
Una SPA in `web/` con 3 viste. Il `core` e i dati restano intatti; si aggiunge **un solo** export
(`viz.json`) consumato dalla SPA. Niente economia (arriva nello Step 4); i grafici useranno il profilo
consumi **sintetico** (etichettato), sostituibile quando arriveranno dati reali.

## Architettura
- `core` invariato (puro). Nuovo modulo `src/export/writeVizJson.ts` che, dai risultati di
  `analyzeProduction` + `analyzeSimulation`, scrive un **`viz.json` compatto** (numeri arrotondati a 3
  decimali). Agganciato a `scripts/run-analysis.ts`. Scritto in `web/viz.json` (accanto a
  `index.html`, gitignored).
- `web/`: app React servita da `bun ./web/index.html` (script `web` in package.json). All'avvio carica
  i dati via `fetch("viz.json")` (servito dal dev server accanto a `index.html`; fallback = import JSON
  bundizzato), **una volta**, poi affetta gli array orari per giorno lato browser (8760 valori =
  trascurabile).
- Dipendenze frontend nuove: `react`, `react-dom`, `recharts` (solo per la SPA; il core resta zero-dep).

## Data contract — `viz.json`
```
{
  meta: { year, hoursInYear, acCapKw, batteryUsableKwh,
          falde:[{id,azimuth,peakKwp}], consumptionSource, generatedNote },
  annual: {
    production: { theoreticalKwh, practicalKwh, clippingLossKwh, clippingPct,
                  clippedHours, peakKw, multiyearKwh },
    noBattery:  { selfConsumedKwh, selfConsumptionRate, selfSufficiency, importKwh, exportKwh },
    withBattery:{ ...stessi campi, + battery:{ throughputKwh, equivalentCycles, roundTripLossKwh } },
    delta: { selfConsumedKwh, selfSufficiencyPoints, importReductionKwh, exportReductionKwh }
  },
  monthly: [ { month, prodTheoreticalKwh, prodPracticalKwh, clippingKwh,
               nb:{selfConsumedKwh,importKwh,exportKwh},
               wb:{selfConsumedKwh,importKwh,exportKwh,dischargeKwh} } ],   // 12
  hourly: {                                  // tutti array di lunghezza hoursInYear
    timestampsUtc:[], months:[],
    productionTheoreticalKwh:[], productionPracticalKwh:[], clippingKwh:[], loadKwh:[],
    nb:{ selfConsumedKwh:[], importKwh:[], exportKwh:[] },
    wb:{ selfConsumedKwh:[], importKwh:[], exportKwh:[], chargeKwh:[], dischargeKwh:[], socKwh:[] }
  }
}
```
Lo slicing per giorno: l'asse è UTC contiguo (365×24); giorno `d` = righe `[d*24, d*24+24)`. (Slice =
giorno UTC, ~1h di sfasamento dal locale — accettabile per la lettura, documentato.)

## Viste

### 1. Panoramica annuale
KPI a confronto **senza vs con batteria**: tasso autoconsumo, autosufficienza, import, export,
clipping (kWh + %), cicli/anno, perdita round-trip. + bar chart (autoconsumo / import / export nei due
scenari). Card "delta batteria" (autosufficienza +pti, import evitato).

### 2. Mensile
Bar chart per mese: produzione (teorico / pratico / clipping) e, in un secondo grafico,
autoconsumo·import·export con vs senza batteria. Evidenzia la stagionalità (e che il clipping è estivo).

### 3. Giorno per giorno (principale)
Selettore: **date picker** + frecce ‹ › + quick-pick calcolati (*max clipping*, *max produzione*,
*min produzione*). **Scenario: con / senza / entrambi (sovrapposti)**. Due grafici impilati, asse x =
ore 0–23 del giorno scelto:

- **Potenza (kW)** (Recharts `ComposedChart`): linea **produzione pratica**, linea **teorica**
  (tratteggiata → il gap è il clipping), linea **consumo** (sintetico), **area "coperto da PV+batteria"**
  (sotto la linea consumo → dove sta sotto = import), `ReferenceLine` orizzontale **tetto AC** e
  **picco**. In modalità *entrambi*: si sovrappongono "coperto" e "import" dei due scenari (la
  produzione/consumo sono uguali nei due).
- **Batteria (kWh)**: barre **SoC** per ora + `ReferenceLine` **capacità max** (10.24); opzionale
  carica/scarica come barre ±. Vuoto in modalità *senza*.
- **Strip riepilogo del giorno**: produzione, consumo, autoconsumo, import, export, clipping, cicli.

## Componenti
- `web/index.html` (entry) → monta `App`.
- `App`: fetch `viz.json`, stato tab + (per la vista giorno) `dayIndex` e `scenario`.
- `AnnualOverview`, `MonthlyView`, `DailyExplorer` (con `PowerChart`, `BatteryChart`, `DaySummary`,
  `DaySelector`).
- `web/src/lib/`: funzioni **pure** testabili — `sliceDay(hourly, dayIndex)` → 24 punti per i grafici;
  `quickPickDays(hourly)` → indici di max-clipping / max-prod / min-prod; `formatDayLabel(tsUtc)`.

## Error handling
- `viz.json` assente/malformato → schermata con messaggio "esegui prima `bun run analysis`".
- `dayIndex` fuori range → clamp.

## Testing
- `bun test`: `writeVizJson` (shape + alcuni valori annui coincidono con l'analisi), `sliceDay`
  (lunghezza 24, indici corretti), `quickPickDays` (trova il giorno di max clipping noto).
- UI: verifica manuale (`bun run web`, apri, controlla i 3 tab e qualche giorno).

## Verifica end-to-end
1. `bun scripts/run-analysis.ts` → scrive anche `web/viz.json`.
2. `bun run web` → dev server; apri il browser: 3 tab funzionanti; vista giorno con selettore,
   3 modalità scenario, i due grafici e lo strip coerenti coi numeri di `output/`.
3. `bun test` verde (exporter + util).

## Non-goals (per ora)
Ricalcolo dal vivo / slider parametri (opzione 2), economia/€ (Step 4), export PNG, multi-anno nelle
viste giorno.
