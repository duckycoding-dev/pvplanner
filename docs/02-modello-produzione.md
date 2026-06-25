---
title: Modello di produzione (combine falde + clipping)
last_updated: 2026-06-25
summary: Come si calcola la produzione dell'impianto a partire dalla P oraria PVGIS — somma delle falde, applicazione del tetto AC dell'inverter (clipping), aggregati annuali/mensili e riferimento multi-anno.
status: draft
legend:
  - "P(t): potenza oraria PVGIS per falda [W] → kWh/h dividendo per 1000"
  - "G_teo(t): produzione combinata teorica = somma falde [kWh]"
  - "G_pra(t): produzione pratica dopo tetto AC [kWh]"
  - "clip(t): energia persa per clipping = G_teo − G_pra [kWh]"
  - "cap: tetto di uscita AC dell'inverter [kW] (= kWh/h con Δt=1h)"
related:
  - index.md
  - 01-downloader-pvgis.md
---

# Modello di produzione

Calcola la produzione dell'impianto reale (due falde, un solo inverter) dai dati orari PVGIS.
Codice: `src/core/production/` (puro) + loader `src/io/loadFaldaHourly.ts` / `loadPower.ts` +
orchestratore `src/app/analyzeProduction.ts`.

## Input
- **`hourly.json`** per falda → `P` oraria (W). Conversione `kWh = P / 1000` (Δt = 1h). La `P` PVGIS
  è **già** al netto di temperatura e perdite di sistema (14%): **non** si ri-applicano.
- **`power.json`** per falda → produzione mensile media + totale `E_y` (2005-2023), usata come
  **riferimento "anno tipico"**.
- **Tetto AC** `cap` = `inverter.output_ac_grid.nominal_power_kw` (6 kW), letto dalla scheda prodotto.

## Formule

Per ogni ora `t` (kWh):

```
G_teo(t) = Σ_falde  P_falda(t) / 1000          (somma delle falde — combine)
G_pra(t) = min( G_teo(t), cap )                 (tetto AC, cap in kWh/h)
clip(t)  = G_teo(t) − G_pra(t)   ≥ 0            (perdita per clipping)
```

- **Combine** (`combine.ts`): somma le N falde index-allineate. Necessaria perché PVGIS modella un
  solo azimuth per chiamata; l'impianto reale ha due falde (vedi `01-downloader-pvgis.md`).
- **Clipping** (`clipping.ts`): fenomeno del **solo combinato** — l'inverter ha un'unica uscita AC.
  Le singole falde (~5 kW di picco) non clippano quasi mai; la sovrapposizione SE+SW a metà giornata
  supera i 6 kW.

## Aggregati (`buildProductionSeries.ts`)
- **Annuo**: `Σ G_teo`, `Σ G_pra`, `Σ clip`, `clip% = Σclip/ΣG_teo·100`, n° ore clippate (clip>0),
  picco combinato `max G_teo` [kW].
- **Mensile**: somma per mese (mese ricavato dal timestamp UTC; effetto bordo notturno trascurabile).
- **Multi-anno**: somma per-falda di `E_y`/`E_m` da `power.json` — **senza clipping** (sono aggregati
  mensili, non si può clippare). È un riferimento "anno tipico", distinto dal 2023 orario.

## Output (`src/export/writeProductionOutputs.ts` → `output/`)
- `production.json` — riepilogo (annuo, mensile, multi-anno, per falda) senza gli array orari.
- `production_summary.csv` — metriche annue (metric,value).
- `production_monthly.csv` — una riga per mese (falde 2023, combinato teo/pra/clip, multi-anno).
- `production_hourly.csv` — 8760 righe (timestamp UTC, per falda, teorico/pratico/clipping).

## Valori di riferimento (golden, anno 2023)
| Grandezza | Valore |
|---|---|
| est (az -45) | 6424.78 kWh |
| ovest (az +45) | 6467.77 kWh |
| combinato teorico | 12892.55 kWh |
| combinato pratico (cap 6 kW) | 12433.45 kWh |
| **clipping** | **459.1 kWh (3.56%)**, 589 ore |
| picco combinato | 8.02 kW |
| riferimento multi-anno (somma E_y) | 13070.78 kWh |

> Il clipping (~459 kWh/anno) è la perdita che PVGIS da solo non mostra: è uno degli output chiave per
> valutare il dimensionamento inverter. Nota: la risoluzione **oraria** può sottostimare leggermente i
> picchi sub-orari, quindi il clipping reale potrebbe essere un filo superiore.
