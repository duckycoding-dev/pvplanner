---
title: Fix post-deploy — quick-pick confronto, nomi lenti, wizard consumi/incentivi/potenza
last_updated: 2026-07-07
summary: >
  Sei correzioni emerse dopo il deploy pubblico: il quick-pick "giorno max
  clipping" nella vista confronto legge la viz baseline (zeri) invece dei
  sistemi ricomputati; la digitazione del nome sistema rilancia l'intera
  simulazione; nel wizard consumi il ruolo di "Applica" vs "Fine" è ambiguo;
  gli incentivi trascinano il valore numerico tra le tab percentuale/fisso;
  il seed del tetto AC diventa 6 kW fisso (dato inverter, non derivabile dai
  pannelli); il wizard smette di chiedere pannelli×Wp perché PVGIS è lineare
  nella potenza di picco e l'app riscala già le serie.
status: approved
legend:
  - "quick-pick: bottoni che saltano al giorno notevole (max clipping, ecc.)"
  - "viz baseline: dataset PVGIS canonico salvato; i sistemi A/B sono derivati riscalandolo"
  - "tetto AC: potenza nominale AC dell'inverter (clipping), proprietà dell'inverter"
  - "falda: una orientazione del tetto; una chiamata PVGIS per falda"
related:
  - ../08-wizard-setup.md
  - 2026-07-04-webapp-pubblica-design.md
---

# Fix post-deploy — design

Sei interventi indipendenti, tutti nella webapp (`web/src/`). Nessuna modifica al
motore di calcolo (`src/core/`).

## 1. Quick-pick "giorno max clipping" nella vista confronto

**Sintomo.** Nella vista giorno-per-giorno il bottone seleziona il giorno giusto
(es. 4 aprile); nella vista confronto seleziona sempre il 1° gennaio.

**Causa.** `CompareDayChart.tsx:76` calcola i picks con
`quickPickDays(viz.hourly)` dove `viz` è la baseline (`activeViz`): il suo
`clippingKwh` è la serie baked-in del dataset, tutta zero quando la baseline non
clippa mai. `argmax` su zeri restituisce l'indice 0 → 1 gennaio. La vista
giorno-per-giorno usa invece `vizA` ricomputata (`DailyExplorer.tsx:36`), che ha
il clipping reale del sistema A. Non è stale state: è la sorgente dati sbagliata.

**Fix.**
- I picks del confronto si calcolano dal clipping per-sistema già disponibile:
  per ogni giorno, `clipA[d] + clipB[d]` da
  `caseA.production.hourly.clippingLossKwh` e idem per B; il giorno max clipping
  è l'argmax di questa somma. Gli altri picks (se dipendenti da produzione)
  vanno anch'essi calcolati dalle serie per-sistema, non dalla baseline.
- Se il clipping è zero per entrambi i sistemi, il bottone max-clipping è
  disabilitato (in entrambe le viste), non punta a un giorno arbitrario.
- Nel grafico giorno del confronto si aggiungono le `ReferenceLine` del tetto AC
  di A e di B (colori dei rispettivi sistemi), oggi assenti — è la "linea" che
  l'utente si aspettava di vedere (nella vista mono esiste:
  `PowerChart.tsx:108-111`).

## 2. Digitazione nome sistema lenta

**Causa.** `label` vive dentro `SystemConfigB`; ogni keystroke sostituisce
l'oggetto (`SystemEditor.tsx:66-69`), che è dipendenza dei memo costosi
(`deriveMonoViz` in `App.tsx:201`, `caseA`/`caseB` in `ComparePage.tsx:74-85`).
Ogni carattere rilancia la simulazione completa. `equalsSystems` ignora già
`label` (`systemConfig.ts:48`): il ricalcolo è puro spreco.

**Fix.** Hook `useStableSystem(system)`: mantiene in un ref l'ultimo valore e lo
restituisce identico finché `equalsSystems(prev, next)` è vero; riferimento
nuovo solo quando cambia un campo computazionale. I memo costosi dipendono dalla
versione stabile. Niente debouncing: il ricalcolo su cambio nome non deve
avvenire affatto.

## 3. Wizard consumi: "Salta" / "Fine"

**Sintomo.** "Applica" e "Fine ✓" sembrano equivalenti; se l'utente preme solo
"Fine" i consumi inseriti non vengono applicati.

**Fix.**
- "Fine ✓" applica i valori correnti del metodo attivo (se validi) e chiude il
  wizard.
- Il bottone per-metodo "Applica" sparisce dal contesto wizard; al suo posto un
  bottone "Salta" chiude il wizard senza applicare consumi.
- La sidebar è invariata: lì `ConsumptionEditor` mantiene "Applica" (è l'unica
  azione disponibile).
- Implementazione: `ConsumptionEditor` espone al padre i valori correnti
  validati del metodo attivo (callback di registrazione o ref imperativo);
  `StepConsumption`/`SetupWizard` li applicano dentro `finish` prima di
  `onComplete`. Se i valori correnti non sono validi, "Fine" applica nulla e
  chiude (equivale a "Salta"); nessun blocco.

## 4. Incentivi: reset al cambio tab

**Sintomo.** Il valore numerico viaggia tra le tab: 45 % diventa 45 € fisso e
viceversa (`IncentiveEditor.tsx:11-16` fa spread di `value` cambiando solo
`mode`).

**Fix.** Al click sulla tab si imposta sempre il default del modo:
`percent` → `value: 50`; `fixed` → `value: 0`. `years` resta invariato. Nessun
carry-over né conversione.

## 5. Seed tetto AC = 6 kW fisso

**Contesto.** Oggi il wizard seeda `acCapKw = max(1, round(Σ kWp falde))`
(`buildDataset.ts:98-99`). Ma il tetto AC è una proprietà dell'inverter, non
derivabile dalla potenza dei pannelli.

**Fix.** Seed fisso: `acCapKw = 6` e `batteryPortKw = 6` nei dataset generati
dal wizard. Taglia residenziale più comune; l'utente lo corregge in
`SystemEditor` quando configura il sistema reale. La pipeline CLI è invariata
(legge già la potenza nominale dell'inverter dalla scheda tecnica).

## 6. Wizard senza potenza (via pannelli × Wp)

**Contesto.** PVGIS richiede `peakpower` ma l'output è lineare nella potenza di
picco, e `runSystem` (`runSystem.ts:12-16`) riscala già le serie baseline al
kWp del sistema configurato. Numero pannelli e Wp non sono mai usati: conta solo
il prodotto, e nemmeno quello è necessario alla fetch.

**Fix.**
- `StepRoof` perde i campi "numero pannelli" e "Wp per pannello": per ogni falda
  restano tilt e azimuth.
- La fetch PVGIS usa `peakpower=1` per ogni falda; `hourly.falde[].peakKwp = 1`
  è la scala base per il rescaling di `runSystem`.
- `meta.falde[]` viene seedata con un default plausibile — 10 pannelli × 450 Wp
  (4.5 kWp) per falda — che è ciò che il clone di sistema A/B eredita.
  `SystemEditor` resta a pannelli × Wp com'è oggi.
- Attenzione a `deriveMonoViz:40-42` (scaling `multiyearKwh` su
  `meta.falde[].peakKwp`): nei dataset wizard `multiyearKwh` è 0, ma il
  rapporto va calcolato sulla stessa base usata dal clone (4.5), non sulla scala
  di fetch (1). Verificare in fase di piano che meta e hourly restino coerenti
  ciascuna col proprio consumatore.
- Test di `buildDataset`/wizard aggiornati (URL con `peakpower=1`, meta seedata,
  acCap 6).

## Test

Per ogni punto: test mirato che riproduce il sintomo prima del fix
(quick-pick da serie per-sistema; `useStableSystem` non cambia riferimento su
cambio label; "Fine" applica i consumi correnti; reset default al cambio tab
incentivi; seed 6 kW; URL PVGIS `peakpower=1`). Il punto 2 si verifica anche a
mano: digitare nel campo nome non deve produrre lag percepibile.

## Fuori scope

Linea/serie "clipping" come area dedicata nel grafico confronto (si aggiunge
solo la ReferenceLine del tetto AC); campo inverter nel wizard; migrazione del
modello falda a kWp diretto (si è scelto di tenere pannelli × Wp in
`SystemEditor`).
