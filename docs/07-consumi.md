---
title: Consumi — tre metodi di inserimento (CSV reale, template mensili, stima parametrica)
last_updated: 2026-07-06
summary: I tre modi per dare i consumi elettrici della casa — CSV reale (curva di carico), template mensili, stima parametrica fisica — che convergono nella forma canonica (8760 kWh/ora) che sblocca economia/batteria. Include il modello fisico sintetico (PDC + puffer) usato dalla stima parametrica.
status: draft
legend:
  - "HDH: gradi-ora di riscaldamento = Σ max(0, T_base − T2m) [K·h]"
  - "T2m: temperatura esterna oraria del sito (PVGIS) [°C]"
  - "COP: resa istantanea della PDC = termico/elettrico"
  - "SCOP: COP stagionale medio (riscaldamento)"
  - "ACS: acqua calda sanitaria"
  - "puffer: accumulo termico inerziale del circuito di riscaldamento"
  - "forma canonica: array 8760 kWh/ora (asse = viz.hourly.timestampsUtc) + metadati (fonte, copertura)"
  - "curva di carico: export orario/quartorario dei consumi reali dal portale del distributore"
  - "copertura: % di ore con dato reale nel CSV (le mancanti sono stimate dal profilo medio)"
related:
  - 03-simulazione-batteria.md
  - 05-costi-fasce.md
  - 08-wizard-setup.md
---

# Consumi — tre metodi di inserimento

Il consumo elettrico orario `L(t)` è la base di tutta l'analisi batteria/economia: senza consumi la
dashboard resta in modalità **solo-produzione**. La Fase 2 offre **tre modi** per fornirlo, tutti puri
in `src/core/consumption/` e tutti convergenti nella stessa **forma canonica** — l'array di 8760 kWh/ora
(stesso asse di `viz.hourly.timestampsUtc`) più i metadati (fonte, etichetta, kWh/anno, copertura,
eventuale disclaimer). L'editor UI applica il risultato al dataset e sblocca economia/batteria.

## Forma canonica e intercambiabilità

`CanonicalConsumption` (`canonical.ts`) è il contratto comune: `{ hourlyKwh: number[]; meta: { source,
label, annualKwh, coveragePct, disclaimer? } }`. `validateCanonical(c, expectedLength)` verifica
lunghezza, valori finiti e non negativi. `applyConsumption` (`web/src/lib/applyConsumption.ts`)
sostituisce `viz.hourly.loadKwh` col nuovo array, aggiorna i metadati consumo
(`consumptionSource/AnnualKwh/Note`) e **ricalcola i blocchi baked** nb/wb (annual/monthly/hourly) via
`deriveMonoViz(viz, cloneFromBaseline(viz))` — così l'invariante golder regge: ri-derivare dal viz
riproduce esattamente i blocchi (stesso golden della Fase 0). Il CSV **grezzo non si salva**: nello `StoredSetup` finiscono solo la
`ConsumptionSpec` (metodo + input) e il risultato canonico.

I tre metodi sono **intercambiabili**: applicandone uno nuovo si rimpiazza il precedente. Il demo
(`viz.demo.json`) è concettualmente read-only: l'editor consumi è disponibile solo sui dataset creati
dal wizard.

## Metodo A — CSV reale (curva di carico)

La via più accurata: la **curva di carico** oraria/quartoraria scaricata dal portale del distributore
(es. e-distribuzione) o un CSV generico a due colonne. Il flusso UI prova prima il detector
e-distribuzione, poi il parser generico: `detectEDistribuzione(text) ? parseEDistribuzione : parseConsumptionCsv`.

**Parser generico** (`parseCsv.ts`) — regole vincolanti:

1. **Dialetto.** Delimitatore auto: se la prima riga contiene `;` il separatore è `;` e la **virgola è
   decimale** (uso italiano tipico); altrimenti `,` con punto decimale. Il conteggio puro `;` vs `,`
   non basta (la virgola decimale nel valore lo falsa), quindi la presenza di `;` è dirimente. Header
   opzionale: se la prima riga ha un valore non numerico o un timestamp illeggibile viene saltata.
2. **Colonne.** Due: `timestamp, kWh`. Timestamp accettati: ISO `YYYY-MM-DD[T ]HH:mm(:ss)?` oppure
   `DD/MM/YYYY HH:mm`. Interpretati come **ora locale** del setup.
3. **Risoluzione.** Righe a 15 min sommate nell'ora; righe orarie prese così.
4. **Allineamento calendario.** L'anno dei dati può differire dall'anno PVGIS → si allinea per **chiave
   calendario LOCALE `MM-DD-HH`** (mese, giorno e ora locali), sia sull'asse del dataset sia sulle righe
   utente. Così l'anno è irrilevante. *(Deviazione dal piano: il piano suggeriva mese/giorno da `Date`
   UTC + ora locale; qui la chiave è interamente locale — più semplice e internamente consistente,
   nessuna conversione locale→UTC dei timestamp utente.)* Il **29 febbraio** nei dati utente è scartato
   con warning.
5. **DST.** Nell'ora duplicata di fine ora legale due indici dell'asse condividono la stessa chiave: il
   valore va sul **primo**, il secondo resta buco. L'ora inesistente di inizio ora legale è un buco.
6. **Buchi.** Riempiti con la **media stesso-mese / stesso-tipo-giorno (feriale|weekend) / stessa-ora**
   dai dati presenti; se manca il campione per tipo giorno → media mese/ora; se ancora vuota → 0 con
   warning. `coveragePct` = ore con dato reale / 8760 × 100, arrotondata a 1 decimale.
7. **Soglia.** Copertura < 50% → **errore** (il file copre troppe poche ore).

**Parser e-distribuzione** (`parseEDistribuzione.ts`). `detectEDistribuzione` è conservativo: richiede
`POD` (case-insensitive) + almeno uno tra `curva`, l'intestazione `Giorno`, o ≥24 token orari `HH:mm`;
un CSV generico non lo attiva mai. Gestisce il **formato wide** (data + 96 colonne quarto-orarie, sommate
in 24 ore) e il **formato lungo** `Data;Ora;Consumo`. Riusa l'infrastruttura di allineamento condivisa
(`align.ts`, `alignToAxis`). **Assunzioni** sul formato reale (da verificare su un export vero): CSV
`;`-separated, decimale con virgola, header con `POD`. Le celle **vuote** sono dati mancanti (buchi),
non zeri; nel formato wide i quarti sono letti per **posizione di colonna**, così un buco non fa
scalare le ore successive.

In `examples/` ci sono due file sintetici pronti da caricare per provare il flusso — uno per parser:
`consumi-esempio-orario.csv` (generico, `timestamp,kWh`) e `consumi-esempio-edistribuzione.csv`
(wide, 96 quarti). Un test (`test/exampleCsv.test.ts`) garantisce che restino caricabili.

## Metodo B — Template mensili

Per chi non ha il CSV: `monthlyTemplate.ts`. Per ogni mese si dà **kWh/giorno** e una **sagoma del
giorno** (preset `flat`, `morningEvening`, `daytimeWfh`, `nightHeavy`, o 24 valori custom), più un
**fattore weekend**. `expandMonthlyTemplate` distribuisce, per ogni ora, `sagoma[ora locale] ×
(weekendFactor nei giorni locali di weekend)`, poi **rinormalizza ogni mese** perché il totale resti
`kWh/giorno × giorni del mese` (giorni = ore del mese / 24 sull'asse UTC), **indipendentemente** dal
fattore weekend. Le sagome preset `morningEvening`/`daytimeWfh` riusano i profili di `houseLoad.ts`
(copiati, moduli indipendenti); `nightHeavy` = 1.6 (0–7) / 0.8 (8–17) / 1.2 (18–23).

## Metodo C — Stima parametrica (modello fisico)

Il modello fisico deterministico descritto sotto, esposto come adapter
`web/src/lib/parametricConsumption.ts` (`parametricConsumption(house, setup)`): usa `syntheticHouseLoad`
sulle **temperature reali del sito** (`setup.hourlyT2m`, non nel viz). **Nessuna generazione LLM a
runtime**: solo il modello fisico. Richiede la T2m del sito → sul demo / senza setup è **disabilitato**
con spiegazione. **Disclaimer obbligatorio**, sempre visibile nel form e nei metadati in dashboard:

> *Stima approssimativa calcolata dai parametri inseriti: non sono dati reali, usala come ordine di grandezza.*

Il modello (funzione pura `src/core/consumption/houseLoad.ts`, `syntheticHouseLoad`) stima il profilo da
pochi parametri della casa + le temperature reali del sito. È un profilo **sintetico** (non misurato),
tarabile anche in `config.json` per la CLI.

## Tre componenti del modello fisico

### 1. Riscaldamento (PDC, elettrico)
- **Fabbisogno termico annuo** = `superficie_riscaldata × domanda_specifica` (+ perdite di accumulo).
- **Distribuzione oraria** ∝ `HDH(t) = max(0, T_base − T2m(t))`: usa la temperatura **reale oraria** del
  sito → stagionalità vera (picco gennaio, zero d'estate). `T_base` = 16 °C (sconta i guadagni
  solari/interni).
- **Elettrico** = termico / `COP(T2m)`. La curva `COP(T)` è una forma di Carnot **ancorata al
  datasheet** della PDC, poi il totale è **riscalato così che la resa stagionale sia esattamente lo
  SCOP**. Così la *forma* oraria riflette demanda+efficienza (più elettrico nelle ore fredde), ma la
  *magnitudine* annua rispetta il dato ufficiale.
- **Puffer**: accumulo termico → modellato come **media mobile di ~3 h** sul prelievo di riscaldamento
  (inerzia) + piccole **perdite di standby** sul termico. Non sposta energia nel tempo PV-aware (vedi
  Limiti).

### 2. Acqua calda sanitaria (ACS, elettrico)
`occupanti × kWh_termici_persona_anno` (+ standby) / `COP_ACS`, in **blocchi mattina/sera** (consentiti
dal tank-in-tank).

### 3. Base (elettrodomestici/luci/induzione)
Totale annuo per N occupanti, con **sagoma feriale vs weekend**; ogni occupante in **smart-working**
aggiunge un **plateau diurno** nei giorni feriali (rilevante per l'autoconsumo PV).

`L(t) = riscaldamento_smussato(t) + ACS(t) + base(t)`. Asse UTC; l'ora locale usata per le sagome
(picchi, blocchi ACS, plateau) è **DST-corretta** — vedi nota sotto.

> **Fix DST (2026-07-04):** la sagomatura oraria (picchi base, blocchi ACS,
> plateau smart-working) usa l'ora locale **DST-corretta** della timezone in
> `consumption.timezone` (fallback: `timezone` di root), via
> `src/core/time/localTime.ts` — la stessa usata dalle fasce tariffarie.
> Prima usava UTC+1 fisso: in estate i picchi cadevano 1 h fuori fascia.
> Anche il giorno feriale/weekend segue il giorno locale.

## Dati di questo impianto

**Pompa di calore Bongioanni UNITEC 2.16** (datasheet, clima medio):
- potenza termica 16 kW; COP **4,50** a A7/W35, 3,45 a W45, 2,85 a W55;
- **SCOP = 4,84** (LWT 35 °C, classe A++). Mandata impostata a **30 °C** → COP/SCOP reali un filo
  migliori; si usa 4,84 come valore **prudente**.
- ACS e riscaldamento gestiti dalla PDC; **caldaia a condensazione a gas** Play Combi 32 solo come
  backup nei giorni più freddi.

**Sito** (anno 2023, da PVGIS): `ΣHDH(base 16) = 37.146 K·h`, T minima −2,5 °C, 92 ore sotto 0 °C.

**Default in `config.json` → `consumption.house`** (tutti tarabili):

| Parametro | Valore | Significato |
|---|---|---|
| `heated_area_m2` | 250 | 300 m² − taverna semi-interrata |
| `specific_heat_demand_kwh_m2y` | 90 | domanda termica netta (muratura spessa, '83, sud, doppi vetri) |
| `heating_base_temp_c` | 16 | soglia HDH |
| `occupants` / `wfh_occupants` | 2 / 1 | uno in smart-working |
| `heat_pump_scop` | 4,84 | dal datasheet |
| `heat_pump_cop_ref` @ `_outdoor_c` / `flow_temp_c` | 4,5 @ 7 °C / 30 °C | ancora della curva COP |
| `dhw_cop` / `dhw_kwh_per_person_y` | 2,8 / 700 | ACS |
| `base_load_annual_kwh` | 3000 | base |
| `storage_standby_loss_pct` / `buffer_smoothing_hours` | 4 / 3 | puffer |

**Stima risultante (elettrica):** riscaldamento ~4.835 + ACS ~520 + base ~3.000 ≈ **8.355 kWh/anno**
(forte picco invernale, plateau diurno feriale). Con questo profilo: autosufficienza 34 % → 58 % con
la batteria; import 5.512 → 3.504 kWh/anno.

## Limiti (v2)
- **Sintetico, non misurato**: i parametri (specie domanda specifica e base) sono stime.
- **Caldaia a gas non modellata**: nei giorni più freddi coprirebbe parte del picco → l'elettrico qui è
  leggermente **sovrastimato** (prudente).
- **Nessun controllo PV-aware del puffer**: il riscaldamento insegue il fabbisogno, non il sole.
  Caricare il puffer a mezzogiorno (sole + COP alto) aumenterebbe l'autoconsumo termico — possibile
  **scenario futuro**.
- Nessun raffrescamento estivo, nessuna auto elettrica (non presenti).
- Nessun degrado/inflazione (vedi `06-economia.md`).

## Implementazione
Forma canonica e metodi (Fase 2, puri in `src/core/consumption/`):
- `canonical.ts`: `CanonicalConsumption`, `validateCanonical`.
- `monthlyTemplate.ts`: `DAY_SHAPES`, `MonthlyTemplate`, `expandMonthlyTemplate` (metodo B).
- `parseCsv.ts` + `align.ts`: parser CSV generico + allineamento condiviso (metodo A).
- `parseEDistribuzione.ts`: detector + parser curva di carico (metodo A).
- `web/src/lib/parametricConsumption.ts`: adapter del modello fisico (metodo C, disclaimer obbligatorio).
- `web/src/lib/applyConsumption.ts`: applica al dataset + ricalcolo baked.
- UI: `web/src/components/consumption/` (editor a tre tab + anteprime), montato nel wizard (step Consumi,
  dopo lo Scarico) e nella sezione «Consumi» del menu di configurazione.
- Test: `canonical.test.ts`, `monthlyTemplate.test.ts`, `parseConsumptionCsv.test.ts`,
  `parseEDistribuzione.test.ts`, `parametricAdapter.test.ts`, `applyConsumption.test.ts`.

Modello fisico (metodo C):
- `src/core/consumption/houseLoad.ts` (puro): `HouseParams`, `HOUSE_DEFAULTS`, `syntheticHouseLoad`.
- `src/config/schema.ts`: `HouseConfig` + parsing di `consumption.house`.
- `src/app/analyzeSimulation.ts`: se `consumption.house` è presente usa il V2 (mappa config → `HouseParams`).
- Il vecchio `syntheticHeatPumpLoad` (segnaposto 65/35 scalato a un target) resta per retro-compatibilità.
- Test: `test/houseLoad.test.ts`.
