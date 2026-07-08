---
title: Linea temperatura oraria nei grafici giorno-per-giorno e confronto
date: 2026-07-08
status: approved
autore: davide.milan
---

# Linea temperatura oraria nei grafici

## Obiettivo
Mostrare la temperatura esterna oraria (T2m, °C) come linea nei grafici
giorno-per-giorno (`PowerChart`) e confronto (`CompareDayChart`, grafico
principale), per rendere leggibile il nesso tra temperatura e consumi elevati.

## Contesto (dall'indagine sul codice)
- T2m è già presente nel pipeline: `parseHourly.ts` la estrae, `typicalYear.ts`
  ne calcola la **media aritmetica multi-anno** per bucket (mese, giorno, ora),
  esattamente come per la produzione.
- Oggi T2m **non** arriva al viz: `viz.hourly` (`buildViz.ts`) non la include,
  quindi i grafici non la vedono.
- `buildVizObject` è condiviso tra generazione demo (server) e fetch browser
  (`buildDataset.ts`), quindi un'unica aggiunta in `buildViz.ts` propaga ovunque.
- `monoView.ts` costruisce la vista con `{ ...viz.hourly }`: `t2m` viene ereditato
  automaticamente dal ricalcolo/rescaling in-browser.

## Decisioni
- **Colore**: arancione `#f59e0b` (già in palette, leggibile su chiaro e scuro).
  Nessun conflitto: nel confronto l'arancione è usato solo nel grafico SOC
  separato, non nel grafico principale.
- **Asse**: la temperatura (°C) va su un **asse Y secondario a destra**
  (`yAxisId="temp"`, `orientation="right"`, label `°C`), scala indipendente da
  kW/kWh. Domain automatico.
- **Confronto**: una sola linea temperatura (T2m è del sito, identica per A e B),
  letta da `viz.hourly.t2m`.
- **Visibilità**: **visibile di default**; toggleabile dalla legenda come le
  altre serie (riusa `useLegendToggle`).
- **Retrocompatibilità**: `t2m` è **opzionale** in `Hourly`/`DayPoint`; se assente
  (viz vecchi in cache IndexedDB) la linea semplicemente non viene resa.
- **Demo**: rigenerare `web/viz.demo.json` con `bun scripts/build-demo.ts`.

## Fuori scope
- Nessuna nuova metrica/statistica sulla temperatura (min/max/media in tabella).
- Nessuna linea temperatura nei grafici mensili/annuali.
- Nessuna linea temperatura nel sotto-grafico SOC del confronto.

## File toccati
- `src/core/viz/buildViz.ts` — aggiungere `t2m` al tipo di output e all'oggetto
  `hourly` (da `base.t2m`).
- `web/src/types.ts` — `t2m?: number[]` in `Hourly`.
- `web/src/lib/sliceDay.ts` — `temp?` in `DayPoint`, popolato in `sliceDay`.
- `web/src/components/PowerChart.tsx` — asse destro °C + `<Line dataKey="temp">`.
- `web/src/components/CompareDayChart.tsx` — `temp` nei punti (`sliceCompareDay`),
  asse destro °C + linea nel grafico principale.
- `web/src/i18n/it.ts`, `web/src/i18n/en.ts` — chiave `chart.temperature`.
- `web/viz.demo.json` — rigenerato.
