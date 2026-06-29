---
title: Costi energia per fasce orarie
last_updated: 2026-06-29
summary: Come si calcolano spesa di acquisto, ricavo di vendita, costo netto e risparmio batteria a partire dai flussi orari import/export e da una tariffa a fasce (ora locale + giorno settimana). Calcolo live nel browser.
status: draft
legend:
  - "import(t): energia prelevata dalla rete nell'ora t [kWh]"
  - "export(t): energia immessa in rete nell'ora t [kWh]"
  - "fascia: insieme di ore+giorni con uno stesso prezzo d'acquisto"
  - "netto: bolletta netta = spesa acquisto − ricavo vendita [€]"
  - "weekday: giorno settimana, 0=Lun .. 6=Dom"
related:
  - 03-simulazione-batteria.md
  - 04-confronto-sistemi.md
  - specs/2026-06-29-config-sidebar-e-prezzi-fasce-design.md
---

# Costi energia per fasce orarie

Tutte le view della dashboard mostrano i **costi/ricavi** dell'energia, calcolati applicando una
**tariffa** ai flussi orari di import/export. La tariffa è **una sola, condivisa** (come i consumi),
modificabile dalla sidebar e salvata nel browser. Il calcolo è **live** (nessun ricalcolo dello script,
nessuna chiamata di rete).

## Modello tariffario
Una tariffa è un insieme di **fasce** più un prezzo di default e un prezzo di vendita:

- **fascia** = nome, colore, uno o più **intervalli orari** `[da, a)` in ora locale (0..24; se `da > a`
  la fascia avvolge la mezzanotte), i **giorni** in cui vale (0=Lun .. 6=Dom) e un **prezzo d'acquisto**
  €/kWh.
- **prezzo default**: vale per le ore/giorni non coperti da alcuna fascia.
- **prezzo di vendita**: €/kWh unico per l'energia esportata (RID/ritiro dedicato).

**Prezzo d'acquisto dell'ora `t`** (ora locale `lh`, giorno `wd`): la **prima fascia** con `wd` tra i
suoi giorni e `lh` dentro uno dei suoi intervalli; se nessuna combacia → prezzo default.

Preset: **Monorario** (nessuna fascia, solo default) e **F1/F2/F3** ARERA (F1 = Lun–Ven 08–19; F2 =
Lun–Ven 07–08 e 19–23 + Sab 07–23; F3 = tutto il resto = prezzo default). I festivi nazionali sono
trattati come domenica/F3 (semplificazione). Granularità **oraria** (la simulazione è oraria).

## Formule
Per ogni ora `t`:

```
prezzo_acquisto(t) = priceForHour(tariffa, ora_locale(t), giorno(t))
```

Aggregati (scenario fissato: con o senza batteria):

```
spesa acquisto = Σ_t import(t) × prezzo_acquisto(t)
ricavo vendita = Σ_t export(t) × prezzo_vendita
costo netto    = spesa acquisto − ricavo vendita          (può essere negativo = saldo a credito)
```

La **batteria è già dentro** `import`/`export` (li abbassa entrambi): non si aggiunge alcun termine
batteria al netto, altrimenti si conterebbe due volte.

**Valore/risparmio della batteria** (per un dato sistema): differenza tra i netti dei due scenari

```
risparmio batteria = costo netto(senza batteria) − costo netto(con batteria)
```

È **esatto**: tiene conto del rendimento round-trip (la batteria carica più di quanto scarica) e del
fatto che scarica in fascia cara avendo caricato in fascia economica o da surplus altrimenti esportato.
È più preciso dell'approssimazione `Σ scarica × (acquisto − vendita)`.

## Dati e asse temporale
Il calcolo a fasce richiede l'**ora locale** e il **giorno della settimana** di ciascuna delle 8760
ore. Sono **precalcolati nello script** e salvati in `viz.json` (`hourly.localHour`, `hourly.weekday`),
DST-corretti via `Intl` su `Europe/Rome` (le due transizioni dell'ora legale sono gestite). La
simulazione resta sull'asse UTC; questi due array servono solo alla tariffazione.

## Dove si vedono i costi
Tutti i recap usano una **tabella unica** (`MetricsTable`): colonne = casi, righe = metriche, **Δ**
quando le colonne sono due. Ogni riga ha una **direzione "buona"** (alto o basso è meglio) e le celle
sono colorate di conseguenza (verde = migliore, rosso = peggiore); il Δ è verde se rappresenta un
miglioramento. Le righe si possono **nascondere** (click sull'etichetta).

- **Panoramica annuale**: tabella costi **senza | con batteria** (spesa/ricavo/netto) con Δ = effetto
  batteria (il netto Δ negativo = risparmio, in verde).
- **Mensile**: stessa tabella costi annui + una tabella **netto per mese** (senza | con | Δ).
- **Giorno per giorno**: tabella riepilogo del giorno (produzione/consumo/autoconsumo/import/export/
  clipping/cicli/**netto €**) per **senza | con** con Δ; mostra sempre entrambi gli scenari.
- **Confronto**: tabella con indicatori energetici **e** di costo. Due colonne valore + Δ: se il
  Sistema B è stato modificato → **A | B | Δ(B−A)**; se B è ancora uguale alla baseline → **senza FV |
  A | Δ(A−senza FV)** (così un B non toccato mostra comunque il valore dell'impianto). Il caso
  **senza FV** = impianto a 0 pannelli (import = intero consumo, export 0).

## Implementazione
- `src/core/economics/tariff.ts` (puro): tipi `Tariff`/`TariffBand`/`CostResult`, `priceForHour`,
  `aggregateCost`.
- `web/src/lib/tariffPresets.ts`: default/monorario/F1·F2·F3, serialize/parse/validate.
- `web/src/lib/viewCosts.ts`: `scenarioCost` (baseline con/senza), `systemCost` (per sistema nel
  confronto), `batterySavingEur`.
- `web/src/components/MetricsTable.tsx` + `web/src/lib/metricsTable.ts` (`bestWorstClasses`,
  `deltaClass`): tabella riusabile con colorazione per direzione e righe nascondibili. Usata da tutte
  le view e dal confronto.
- `web/src/lib/systemConfig.ts`: `equalsBaseline` (B = baseline?) e `noPvConfig` (caso senza FV).

## Evoluzioni (non ora)
Offerte multiple a confronto (il motore accetta già più tariffe), prezzo di vendita a fasce, scambio
sul posto, quote fisse/oneri, calendario festivi completo; payback/NPV costruiti su netto e risparmio.
