---
title: Indice e convenzioni generali
last_updated: 2026-06-25
summary: Punto d'ingresso alla documentazione dei calcoli; convenzioni di unità, asse temporale e fonti dati condivise da tutti i documenti.
status: draft
legend:
  - "kWp: potenza di picco a STC [kW]"
  - "kWh: energia [kilowattora]"
  - "falda: una orientazione del tetto (= una stringa = un MPPT)"
  - "azimuth/aspect: orientamento [°], 0=Sud, 90=Ovest, -90=Est (convenzione PVGIS)"
related:
  - 01-downloader-pvgis.md
---

# Documentazione calcoli — analisi_fotovoltaico

Questo progetto stima i benefici economici di un impianto FV e se convenga aggiungere una batteria.
Ogni area di calcolo è documentata in un file dedicato sotto `docs/`, aggiornato man mano che il
codice cresce. Tutti i documenti usano lo **stesso frontmatter** (titolo, data ultimo aggiornamento,
riassunto, stato, legenda simboli/unità, documenti collegati).

## Convenzioni condivise

- **Unità**: si lavora internamente in **kWh per ora** (Δt = 1 h). I dati PVGIS orari danno la potenza
  `P` in **W**; poiché il passo è orario, `P / 1000` = kWh in quell'ora. La conversione avviene una
  sola volta nel loader.
- **Asse temporale**: la simulazione gira sull'**asse UTC hour-of-year (0..8759)**, l'unico contiguo
  (niente buco/duplicato dei cambi ora legale). La serie FV resta nativa UTC; il consumo (ora locale)
  viene mappato dentro l'indice UTC. L'ora locale `Europe/Rome` è solo etichetta di presentazione.
- **Fonti dati**: produzione da **PVGIS v5.3** (vedi `01-downloader-pvgis.md`). Specifiche prodotti in
  `system_technical_data/*.json`. Definizione del sistema in `config.json`.
- **Potenza di picco**: `peakpower` non è mai salvata a mano — è **derivata** da
  `n° pannelli × potenza modulo / 1000`.

## Indice documenti

- [`01-downloader-pvgis.md`](01-downloader-pvgis.md) — come si scaricano e validano i dati PVGIS
- [`02-modello-produzione.md`](02-modello-produzione.md) — combine falde + clipping
- [`03-simulazione-batteria.md`](03-simulazione-batteria.md) — bilancio orario + dispatch + confronto
- _(prossimi)_ `04-economia.md`, `05-consumi.md`

## Esecuzione

```sh
bun run download   # (opzionale) valida/riscarica i dati PVGIS
bun run analysis   # calcola tutto → scrive output/*.{json,csv} e web/viz.json
bun run web        # dashboard su http://localhost:5180  (richiede prima `analysis`)
bun test           # suite di test
```

Dashboard (SPA Bun+React+Recharts): 3 viste — panoramica annuale, mensile, giorno-per-giorno —
che leggono `web/viz.json`. Spec di design: `docs/specs/2026-06-25-visualizzazione-dashboard-design.md`.
