---
title: Indice e convenzioni generali
last_updated: 2026-07-05
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
- [`04-confronto-sistemi.md`](04-confronto-sistemi.md) — confronto live di due sistemi (scaling + ricalcolo nel browser)
- [`05-costi-fasce.md`](05-costi-fasce.md) — costi/ricavi energia per fasce orarie (acquisto, vendita, netto, risparmio batteria)
- [`06-economia.md`](06-economia.md) — costo installazione, incentivi e tempo di rientro (payback)
- [`07-consumi.md`](07-consumi.md) — profilo di consumo sintetico V2 (PDC + puffer, da dati casa + T2m sito)
- _(prossimi)_ dataset consumi reali (CSV), NPV/TIR + sensibilità

## Esecuzione

```sh
bun run download   # (opzionale) valida/riscarica i dati PVGIS
bun run analysis   # calcola tutto → scrive output/*.{json,csv} e web/viz.json
bun run web        # dashboard su http://localhost:2345  (richiede prima `analysis`)
bun test           # suite di test
```

Dashboard (SPA Bun+React+Recharts): panoramica annuale, mensile, giorno-per-giorno, **Confronto**
(A vs B) e glossario, **tutto calcolato live nel browser**. Le viste mono seguono il **Sistema A**,
ricalcolato dal vivo (senza/con = batteria di A off/on; se la batteria di A è 0, si mostra solo
«senza»). Sistema A e Sistema B sono **pienamente editabili** (pannelli, W, inverter, batteria,
round-trip, costo installazione): `config.json` è solo il **seed** dei default. La configurazione
(Sistema A, Sistema B, tariffa, incentivi) si apre dalla colonna a sinistra in un **menu modale**
(`<dialog>`, hotkey `m`); i costi a fasce orarie compaiono in tutte le view, in tabelle con/senza
batteria collassabili. Spec di design: `docs/specs/2026-06-25-visualizzazione-dashboard-design.md`
(dashboard), `docs/specs/2026-06-26-confronto-sistemi-design.md` (confronto),
`docs/specs/2026-06-29-config-sidebar-e-prezzi-fasce-design.md` (sidebar + prezzi),
`docs/specs/2026-06-29-sistema-a-editabile-design.md` (Sistema A editabile + viste mono live),
`docs/specs/2026-06-29-cashflow-scomposizione-design.md` (cashflow + scomposizione rientro);
calcoli in `04-confronto-sistemi.md`, `05-costi-fasce.md`, `06-economia.md`.
