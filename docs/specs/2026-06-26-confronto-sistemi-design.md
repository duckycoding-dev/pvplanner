---
title: Confronto tra sistemi (opzione A) — design
last_updated: 2026-06-26
summary: Confronto live nel browser di due sistemi FV che differiscono solo per equipaggiamento (n° pannelli/W per falda, tetto inverter, batteria) sullo stesso sito/geometria, senza nuove chiamate PVGIS. Pagina Configurazione + pagina Confronto.
status: draft
related:
  - 2026-06-25-visualizzazione-dashboard-design.md
  - 02-modello-produzione.md
  - 03-simulazione-batteria.md
---

# Confronto tra sistemi (opzione A) — design

## Context
L'utente vuole confrontare sistemi alternativi per lo stesso caso (es. "più pannelli senza batteria"
vs "meno pannelli con batteria") e capire quale conviene. I sistemi differiscono **solo per
equipaggiamento/dimensionamento** (opzione A): n° pannelli e W per falda, tetto AC inverter, batteria
(taglia, 0 = nessuna). Geometria, sito, tecnologia, perdite, anno **restano** quelli della baseline.

**Base tecnica (verificata empiricamente):** la `P` oraria PVGIS è **esattamente lineare** in
`peakpower` (scaricata la falda est a potenza doppia: `P_doppio = 2 × P_base` con scostamento max
0.01 W = solo arrotondamento a 2 decimali). Perché PVGIS calcola `P = peakpower × resa-per-kWp`, e la
resa-per-kWp dipende solo da irraggiamento/temperatura/perdite, non dalla taglia. Quindi cambiare
pannelli = **riscalare** la oraria esistente; inverter/batteria/consumi si applicano a valle nel nostro
codice. **Nessuna chiamata PVGIS a runtime.**

## Scope
- **Confronto live nel browser** di **2 sistemi alla volta** (A = baseline precalcolata, B =
  modificabile), ricalcolando con il **core TS puro importato** nella SPA.
- **2 nuove pagine**: **Configurazione** (definizione System B + export/import) e **Confronto**
  (risultati A vs B). Le 3 pagine esistenti (annuale/mensile/giorno) restano mono-sistema, intatte.
- **Consumi condivisi** tra A e B (stessa casa), fissi al target della baseline in questa v1.

### Non-goals (per ora)
Variazione di geometria/sito (opz. B/C, richiede download), confronti dentro le pagine esistenti
(opz. ii), >2 sistemi simultanei a schermo, modifica del consumo, analisi economica (€) — vedi
"Evoluzioni".

## Modifiche ai dati (`viz.json`)
`writeVizJson` aggiunge:
- `meta.falde[].panelCount`, `meta.falde[].wp` (da config `panel_count` e `module.peak_power_wp`) →
  per mostrare "11 × 465 W" e per clonare A in B.
- `meta.batteryRoundTrip` (default 0.90), `meta.consumptionAnnualKwh` (target baseline).
- `hourly.falde`: `[{ id, azimuth, peakKwp, productionKwh:[8760] }]` (arrotondati 3 dp) — **necessari**
  per ricomporre il combinato quando B cambia i pannelli **per singola falda**. Impatto ~+150 KB
  (viz totale ~730 KB, accettabile).

## Core: `computeSystem` (puro, `src/core/comparison/computeSystem.ts`)
Riusa le funzioni pure esistenti (`combineProduction`, `applyAcCap`, `runNoBattery`,
`runWithBattery`, `buildBatteryConfig`, `annualMetrics`/`monthlyScenario`).

```
computeSystem({
  faldeBase: { peakKwp, productionKwh:number[] }[],   // serie baseline (da viz.hourly.falde)
  newPeakKwp: number[],                                // kWp per falda del sistema da calcolare
  acCapKw: number,
  batteryUsableKwh: number,                            // 0 = nessuna batteria
  roundTrip: number,
  loadKwh: number[], months: number[],
}) => SystemResult
```
Passi: per ogni falda `scaled[i] = base.productionKwh[i] × (newPeakKwp/peakKwp)` → `combine` →
`applyAcCap(acCap)` → produzione pratica + clipping. Poi: se `batteryUsableKwh>0` →
`runWithBattery` (pMax = acCapKw), altrimenti `runNoBattery`. `SystemResult` = { produzione
(annua+mensile+orari), metriche annue, mensili, orari per i grafici }. Ogni sistema rende **un**
risultato secondo la sua config (la batteria è parte del sistema, niente toggle con/senza qui).

**Test golden:** alimentando `computeSystem` con la config della baseline (kWp/inverter/batteria di A)
i numeri devono riprodurre `viz.annual` (entro arrotondamento) — verifica che lo scaling+ricalcolo nel
browser sia coerente con la pipeline dello script.

## UI

### Pagina Configurazione
- **System A** (sola lettura): falde suddivise (`est az -45 · 11 × 465 W`, ecc.), kWp derivato, tetto
  inverter, batteria, round-trip.
- **System B** (editabile): per falda `panelCount` + `wp`; `acCapKw`; `batteryUsableKwh` (0=nessuna);
  `roundTrip`. kWp ricalcolato live. Pre-compilato clonando A.
- Azioni: **Copia da A** · **Esporta B** (scarica JSON
  `{label, falde:[{id,panelCount,wp}], acCapKw, batteryUsableKwh, roundTrip}`) · **Importa B** (apre
  **modale con drag-and-drop** + file picker; valida; se gli `id`/azimuth/inclinazione delle falde non
  combaciano con A → avviso "geometria diversa, non supportata", import rifiutato).
- Geometria/sito ereditati da A (non modificabili).

### Pagina Confronto
- Se B non configurato → invito a configurarlo.
- **Tabella KPI** A | B | Δ: produzione pratica, clipping, autoconsumo, tasso, autosufficienza,
  import, export, cicli batteria (se presente).
- **Giorno**: date picker + quick-pick; grafico con A vs B **sovrapposti** (produzione A piena / B
  tratteggiata; coperto A/B; SoC A/B), consumo unico; toggle di legenda riusati.
- **Mensile / Annuale**: barre **raggruppate** A vs B.
- Ricalcolo **live** a ogni modifica di B (nessuna rete).

### Stato
`App` tiene `systemB` in `useState` (seed = clone di A da `viz.meta`), passato a Configurazione
(edita) e Confronto (legge). Persistenza opzionale in `localStorage`. Nessun router: restano tab.

## Componenti
- `src/core/comparison/computeSystem.ts` (puro) + tipo `SystemResult`.
- `web/src/lib/systemConfig.ts`: tipo `SystemConfigB`, `cloneFromBaseline(viz)`, `serialize`/`parse`,
  `validateAgainstBaseline` (geometria).
- `web/src/components/ConfigPage.tsx`, `ImportModal.tsx`.
- `web/src/components/ComparePage.tsx` + `KpiTable.tsx`, `CompareDayChart.tsx`, `CompareBars.tsx`.
- `App.tsx`: tab "config" + "confronto"; stato `systemB`.

## Testing
- **Core** (`computeSystem`): scaling lineare (×2 kWp → ×2 produzione), clipping ricalcolato al nuovo
  cap, conservazione (teorico = pratico + clipping), no-battery vs with-battery, **golden = riproduce
  la baseline** di `viz`.
- **Web lib**: `cloneFromBaseline`, serialize/parse round-trip, `validateAgainstBaseline` (rifiuta
  geometria diversa).
- UI: verifica manuale (edita B → KPI/grafici aggiornati; export→import ricrea B).

## Edge case
batteria 0 → percorso no-battery; pannelli 0 su una falda → contributo 0; import con geometria diversa
→ rifiuto con messaggio; campi non numerici → validazione; B = A → Δ tutti 0.

## Verifica end-to-end
1. `bun test` verde (incl. golden `computeSystem` = baseline).
2. `bun run web` → pagina **Configurazione**: modifica B, esporta, reimporta (modale drag-and-drop).
3. Pagina **Confronto**: tabella KPI A|B|Δ + grafici A-vs-B che si aggiornano **dal vivo**, **zero**
   chiamate di rete (verificabile da Network tab).

## Evoluzioni (non ora)
- Confronti dentro le pagine esistenti (opz. ii).
- Variazione geometria/sito (richiede download + cache lato script).
- **Economia**: quando ci saranno consumi reali + prezzi, il confronto resta **agnostico alla
  metrica** → i € (risparmio/payback/NPV) si aggiungono alla tabella KPI A|B|Δ e ai grafici senza
  riprogettare.
