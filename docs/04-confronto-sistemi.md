---
title: Confronto tra sistemi (calcolo live)
last_updated: 2026-06-26
summary: Come si calcola il confronto fra due sistemi che differiscono solo per equipaggiamento (pannelli/W per falda, tetto inverter, batteria). Il ricalcolo avviene live nel browser riscalando la produzione PVGIS della baseline; non c'è uno script dedicato.
status: draft
legend:
  - "kWp: potenza di picco a STC [kW]"
  - "P(t): produzione FV oraria PVGIS [W] (già al netto di temperatura e perdite di sistema)"
  - "G(t): produzione combinata pratica dopo clipping [kWh]"
  - "L(t): consumo orario [kWh] (condiviso fra i sistemi)"
  - "tetto AC: potenza massima in uscita dell'inverter [kW]"
  - "utile batteria: energia effettivamente ciclata = totale × %utilizzabile [kWh]"
related:
  - 02-modello-produzione.md
  - 03-simulazione-batteria.md
  - specs/2026-06-26-confronto-sistemi-design.md
---

# Confronto tra sistemi (calcolo live)

Questa sezione confronta due sistemi alternativi sullo **stesso sito e geometria** (es. "più pannelli
senza batteria" vs "meno pannelli con batteria") per capire quale conviene. I sistemi differiscono
**solo per equipaggiamento**: numero pannelli e W per falda, tetto AC dell'inverter, batteria (taglia
e percentuale utilizzabile). Orientamento, inclinazione, sito, tecnologia, perdite e anno restano
quelli della baseline.

## Non c'è uno script dedicato: si calcola nel browser

Il confronto **non** è un comando CLI a parte. Il motore di calcolo (`src/core/comparison/computeSystem.ts`)
è puro (nessun `fs`/rete) ed è importato direttamente dalla dashboard, che ricalcola i sistemi **dal
vivo** a ogni modifica, **senza alcuna chiamata PVGIS**.

L'unico passaggio "da script" è la normale analisi, che ora arricchisce `web/viz.json` con i dati che
servono al confronto:

```sh
bun run analysis   # rigenera web/viz.json (produzione per-falda + meta batteria)
bun run web        # dashboard su http://localhost:2345 → schede "Configurazione" e "Confronto"
```

In `viz.json` vengono aggiunti:

- `hourly.falde[]`: per ogni falda `{ id, azimuth, peakKwp, productionKwh[8760] }` — la serie oraria
  alla potenza di picco della baseline.
- `meta.falde[].panelCount`, `meta.falde[].wp` — per mostrare "11 × 465 W" e clonare la baseline.
- `meta.batteryTotalKwh`, `meta.batteryUsablePct`, `meta.batteryRoundTrip`, `meta.batteryPortKw`,
  `meta.consumptionAnnualKwh`.

## Perché basta riscalare (linearità di PVGIS)

PVGIS calcola la produzione oraria come `P = peakpower × resa-per-kWp`, dove la resa-per-kWp dipende
solo da irraggiamento, temperatura e perdite — **non** dalla taglia. La `P` è quindi **esattamente
lineare** in `peakpower` (verificato empiricamente: a potenza doppia `P` raddoppia, scostamento max
0.01 W = solo arrotondamento). Cambiare i pannelli equivale a **riscalare** la serie oraria esistente:

```
scaled_falda(t) = P_baseline_falda(t) × (kWp_nuovo / kWp_baseline)
```

Inverter, batteria e consumi si applicano a valle, nel nostro codice. Nessun ri-download.

## Pipeline di `computeSystem`

Dato un sistema (la baseline A o il sistema B modificato), il calcolo è:

1. **Scaling per falda** — `scaled_i(t) = base_i.productionKwh(t) × (kWp_nuovo_i / kWp_base_i)`.
   Le falde sono abbinate per `id` (l'ordine in config è irrilevante). `kWp = n°pannelli × W / 1000`.
2. **Combinazione** — `G_teorico(t) = Σ_i scaled_i(t)` (somma index-aligned delle falde).
3. **Clipping** — `G(t) = min(G_teorico(t), tetto_AC)`; `clipping(t) = G_teorico(t) − G(t)`.
   Il clipping è ricalcolato sul **nuovo** tetto AC. Conservazione: `teorico = pratico + clipping`.
4. **Simulazione** — sulla produzione pratica `G(t)` e sul consumo **condiviso** `L(t)`:
   - se `utile batteria > 0` → dispatch greedy di autoconsumo (vedi `03-simulazione-batteria.md`),
   - altrimenti → scenario senza batteria.

Ogni sistema produce **un** risultato secondo la propria configurazione (la batteria è parte del
sistema; qui non c'è il toggle con/senza della pagina mono-sistema).

### Batteria: capacità totale × percentuale utilizzabile

L'energia effettivamente ciclata è `utile = totale_kWh × %utilizzabile / 100`. La `%utilizzabile` è
una proprietà **documentata della batteria** (`usable_percent` nel file tecnico), non un valore fisso
nel codice: batterie diverse hanno DoD/utile diversi. Per la BYD HVS 10.2 `usable_percent = 100`,
perché il datasheet riporta `usable_energy_kwh` già a 100% DOD → utile = 10.24 kWh. La potenza di
carica/scarica (`pMax`) resta quella della porta batteria dell'inverter.

### Consumi condivisi

A e B usano lo **stesso** profilo di consumo `L(t)` (stessa casa), in questa versione fissato a quello
della baseline. Questo isola l'effetto del solo equipaggiamento.

## Indicatori del confronto

Per ciascun sistema, dalle metriche annue (vedi `03-simulazione-batteria.md`):
produzione pratica, clipping, autoconsumo, tasso di autoconsumo, autosufficienza, import, export,
cicli batteria. La dashboard mostra `A | B | Δ` con `Δ = valore(B) − valore(A)` (per i tassi in punti
percentuali).

## Garanzia di coerenza (test golden)

Alimentando `computeSystem` con la configurazione della baseline (kWp per falda, tetto, batteria,
round-trip, consumo della baseline) i numeri **riproducono** quelli prodotti dalla pipeline dello
script (`bun run analysis`): è verificato in `test/comparison.test.ts`. Questo garantisce che lo
scaling + ricalcolo nel browser sia coerente con i calcoli "ufficiali".

## Evoluzioni (non ora)

- Analisi economica (€): il confronto è **agnostico alla metrica**, i risparmi/payback si aggiungono
  alla tabella `A | B | Δ` quando ci saranno prezzi e consumi reali.
- Variazione di geometria/sito (richiederebbe nuovi download e cache lato script).
