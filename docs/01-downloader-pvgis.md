---
title: Downloader PVGIS
last_updated: 2026-07-06
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
  - 08-wizard-setup.md
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
- `--config=PATH`: usa un config diverso da `config.json` (stesso flag su `scripts/run-analysis.ts`).

Il client (`src/fetch/pvgisClient.ts`) è sequenziale, con retry su 429/5xx (backoff esponenziale,
rispetta `Retry-After`) e User-Agent descrittivo.

## Configurazione: campi principali

Il sistema è descritto da un file JSON (JSON non ammette commenti, quindi i campi sono documentati
qui). `config.json` è **personale e fuori da git**; su un clone fresco `loadConfig` ripiega su
`config.demo.json` (dataset demo Roma) con un warning. `config.example.json` è una copia del demo da
cui partire per il proprio setup.

| Campo | Tipo | Note |
|---|---|---|
| `location.latitude` / `longitude` | number | Coordinate impianto. `elevation` opzionale. |
| `timezone` | string | Es. `Europe/Rome`. |
| `pvgis.base_url` | string | Base URL API v5.3. |
| `pvgis.radiation_db` | string | DB radiazione, es. `PVGIS-SARAH3` → `raddatabase`. |
| `pvgis.pvtechchoice` / `mountingplace` | string | Valori di query già pronti (`crystSi2025`, `building`). |
| `pvgis.system_loss_percent` | number | Perdite di sistema → `loss`. |
| `pvgis.use_horizon` | boolean | `usehorizon`. |
| `pvgis.single_year` | number | Anno per `seriescalc`. |
| `pvgis.components` | boolean | Flag componenti radiazione. |
| `pvgis.data_root` | string? | **Opzionale**, default `data/falde`. Root delle cartelle per-falda (`<data_root>/<azimuth>/`). Il demo usa `data/demo`. |
| `products.module` / `inverter` / `battery` | string | Path ai datasheet JSON in `system_technical_data/`. `peakpower` per falda deriva dal Wp del modulo. |
| `falde[]` | array | `id`, `azimuth` (0=S, 90=O, -90=E), `tilt`, `panel_count`. Almeno una. |
| `consumption.source` | `"synthetic"` \| `"csv"` | Sintetico = modello casa; csv = profilo importato. |
| `consumption.house` | object? | Parametri casa/pompa di calore (tutti opzionali, hanno default). |
| `simulation.battery_coupling` | `"dc"` \| `"ac"` | Accoppiamento batteria. |
| `simulation.battery_round_trip` | number | Efficienza AC↔AC in (0,1]. |
| `economics.installation_cost_eur` | number | CAPEX di riferimento. |
| `economics.incentive` | object | `mode` (`percent`/`fixed`), `value`, `years`. |

## Valori di riferimento (golden) per la validazione

- `hourly` est (aspect -45): `ΣP/1000 ≈ 6424.8 kWh`, 8760 righe.
- `hourly` ovest (aspect 45): `ΣP/1000 ≈ 6467.8 kWh`, 8760 righe.
- `power` est: `totals.fixed.E_y ≈ 6507.5 kWh`.

> Nota campo: in `power.json`, `outputs.totals.fixed.l_spec` è una **stringa** (es. `"1.12"`) — va
> convertita a numero a valle.

## Uso dal browser: proxy PVGIS

Questo downloader è la via **CLI/fs** (script Bun che scrivono in `data/`). La stessa PVGIS è
raggiungibile anche dalla **SPA**, dove l'utente configura l'impianto e scarica i dati dal browser
(vedi `08-wizard-setup.md`). Le due vie **condividono il parser** dei file `seriescalc`
(`src/core/pvgis/parseHourly.ts`, puro): i loader fs in `src/io/` e la pipeline browser
(`web/src/lib/buildDataset.ts`) lo chiamano entrambi, così un file scaricato da CLI e uno scaricato dal
browser vengono interpretati in modo identico.

La costruzione dell'URL, invece, differisce: il downloader CLI usa `src/fetch/urlBuilder.ts` (URL
diretto verso PVGIS, chiamata server-side); il browser costruisce un URL **same-origin** verso il proxy
`/api/pvgis` (in `buildDataset.ts`). Il proxy serve perché **PVGIS non emette header CORS**, quindi il
browser non può chiamarla direttamente. Handler unico in `src/server/pvgisProxy.ts` (whitelist di tool e
parametri, timeout 30 s, 502 su errore, nessun log di coordinate), montato sia dal dev server Bun
(`web/serve.ts`, `bun run web`) sia come Cloudflare Pages Function (`functions/api/pvgis.ts`). Dal
browser si usa solo `seriescalc` (produzione oraria): niente `PVcalc`, quindi nessun totale multi-anno.
