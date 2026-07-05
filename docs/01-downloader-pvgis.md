---
title: Downloader PVGIS
last_updated: 2026-07-05
summary: Come il sistema scarica in modo riproducibile tutti i dati da PVGIS v5.3 — endpoint, mappa parametri output→query, set per tool, derivazione peakpower e validazione non distruttiva.
status: draft
legend:
  - "seriescalc: orario (PV + radiazione)"
  - "PVcalc: mensile + totali multi-anno"
  - "DRcalc: profilo giornaliero medio (radiazione) per mese — rimosso 2026-07-04, mai consumato dall'analisi"
  - "MRcalc: radiazione mensile su piano scelto — rimosso 2026-07-04, mai consumato dall'analisi"
  - "aspect: azimuth [°], 0=Sud, 90=Ovest, -90=Est"
  - "angle: inclinazione/slope [°]"
  - "peakpower: potenza di picco impianto/falda [kWp]"
related:
  - index.md
---

# Downloader PVGIS

Ricrea in modo riproducibile tutti i file in `data/` dalle API PVGIS v5.3. Le chiamate sono **GET
libere** (uso non commerciale). Codice in `src/fetch/`, avvio da `scripts/download.ts`.

## Base URL e tool

`https://re.jrc.ec.europa.eu/api/v5_3/<tool>` (versione con underscore `v5_3`). Due tool:

| File generato | Tool | Contenuto |
|---|---|---|
| `data/falde/<az>/hourly.json` | `seriescalc` | 8760 valori orari di `P` (W) + componenti radiazione, T2m, vento (anno singolo) |
| `data/falde/<az>/power.json` | `PVcalc` | medie mensili `E_m` + totali `E_y` (range DB 2005-2023) |

Conteggio file = `n_falde × 2`.

> **Rimossi 2026-07-04:** `DRcalc` (`data/falde/<az>/daily_01..12.json`, profilo giornaliero medio
> per mese) e `MRcalc` (`data/generic/monthly.json`, radiazione mensile piano Sud di riferimento).
> Scaricati fin dall'inizio ma mai letti da nessun calcolo dell'analisi (~26 chiamate PVGIS in meno
> per falda/progetto) — vedi `docs/index.md` per il changelog. Il codice e i dati corrispondenti
> sono stati rimossi da `src/fetch/` e `data/`.

## Mappa parametri: output `inputs` → query

I nomi nel blocco `inputs` dei file scaricati **differiscono** dai nomi dei query param. La mappa
(in `src/config/pvgisConventions.ts` per i valori, `src/fetch/urlBuilder.ts` per i nomi):

| `inputs.*` (output) | query param | trasformazione valore |
|---|---|---|
| `location.latitude` / `longitude` | `lat` / `lon` | — |
| `meteo_data.radiation_db` | `raddatabase` | — |
| `meteo_data.use_horizon` | `usehorizon` | bool → `1`/`0` |
| `meteo_data.year_min` / `year_max` | `startyear` / `endyear` | solo seriescalc |
| `…fixed.slope.value` | `angle` | — |
| `…fixed.azimuth.value` | `aspect` | — |
| `pv_module.peak_power` | `peakpower` | **derivata** (vedi sotto) |
| `pv_module.system_loss` | `loss` | — |
| `pv_module.technology` `c-Si2025` | `pvtechchoice` | → `crystSi2025` |
| `mounting_system.fixed.type` `building-integrated` | `mountingplace` | → `building` |

La mappa inversa (file → query) è in `src/fetch/paramsFromInputs.ts` ed è usata dai test per il
**round-trip** contro i file esistenti.

## Set di parametri per tool

Comuni: `lat, lon, raddatabase, usehorizon, outputformat=json, browser=0`.

- **seriescalc** (`hourly`): `+ pvcalculation=1, peakpower, pvtechchoice, mountingplace, loss,
  angle, aspect, startyear=endyear=<anno>, components=1`
- **PVcalc** (`power`): `+ peakpower, pvtechchoice, mountingplace, loss, fixed=1, angle, aspect`
  — **senza** `startyear/endyear` (→ range completo DB 2005-2023), senza `pvcalculation/components`

## Derivazione `peakpower`

`peakpower_kw = panel_count × module.peak_power_wp / 1000`. Esempio: 11 × 465 / 1000 = **5.115 kWp**
per falda. Non è mai salvata a mano: cambiare modulo o n° pannelli in `config.json` la ricalcola →
ri-scaricando si ottengono dati con la potenza giusta.

## Esecuzione e validazione

`scripts/download.ts` con flag:

- `--validate` (**default, non distruttivo**): scarica ogni file fresco in memoria e lo **diffa** contro
  quello su disco (numeri con tolleranza `1e-6 + 1e-4·|valore|`, resto esatto). Stampa una tabella
  PASS/FAIL con metrica headline (es. `ΣP` orario, `E_y` mensile) ed esce `0` solo se tutto PASS.
- `--dry-run`: stampa solo URL e percorso di output.
- `--write`: scarica e **sovrascrive** i file in `data/`.
- `--only=hourly,power` e `--delay=<ms>` (default 300 ms tra le richieste).

Il client (`src/fetch/pvgisClient.ts`) è sequenziale, con retry su 429/5xx (backoff esponenziale,
rispetta `Retry-After`) e User-Agent descrittivo.

## Valori di riferimento (golden) per la validazione

- `hourly` est (aspect -45): `ΣP/1000 ≈ 6424.8 kWh`, 8760 righe.
- `hourly` ovest (aspect 45): `ΣP/1000 ≈ 6467.8 kWh`, 8760 righe.
- `power` est: `totals.fixed.E_y ≈ 6507.5 kWh`.

> Nota campo: in `power.json`, `outputs.totals.fixed.l_spec` è una **stringa** (es. `"1.12"`) — va
> convertita a numero a valle.
