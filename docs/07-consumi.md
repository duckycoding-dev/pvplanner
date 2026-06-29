---
title: Consumi — profilo sintetico V2 (casa con pompa di calore + puffer)
last_updated: 2026-06-29
summary: Come si stima il profilo orario di consumo elettrico della casa partendo da pochi dati fisici (superficie, isolamento, occupanti, pompa di calore) e dalle temperature reali del sito. Profilo sintetico, non misurato; sostituibile in futuro con dati reali (CSV).
status: draft
legend:
  - "HDH: gradi-ora di riscaldamento = Σ max(0, T_base − T2m) [K·h]"
  - "T2m: temperatura esterna oraria del sito (PVGIS) [°C]"
  - "COP: resa istantanea della PDC = termico/elettrico"
  - "SCOP: COP stagionale medio (riscaldamento)"
  - "ACS: acqua calda sanitaria"
  - "puffer: accumulo termico inerziale del circuito di riscaldamento"
related:
  - 03-simulazione-batteria.md
  - 05-costi-fasce.md
---

# Consumi — profilo sintetico V2

Il consumo elettrico orario `L(t)` è la base di tutta l'analisi batteria/economia. Non avendo ancora
misure reali, si **stima fisicamente** da pochi parametri della casa + le **temperature reali del sito**.
È un profilo **sintetico** (non misurato), tarabile in `config.json` e sostituibile in futuro con un
CSV reale. Funzione pura: `src/core/consumption/houseLoad.ts` (`syntheticHouseLoad`).

## Tre componenti

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

`L(t) = riscaldamento_smussato(t) + ACS(t) + base(t)`. Asse UTC, ora locale ≈ CET (UTC+1) solo per le
sagome (DST ignorato: pesa solo sui pesi orari).

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
- `src/core/consumption/houseLoad.ts` (puro): `HouseParams`, `HOUSE_DEFAULTS`, `syntheticHouseLoad`.
- `src/config/schema.ts`: `HouseConfig` + parsing di `consumption.house`.
- `src/app/analyzeSimulation.ts`: se `consumption.house` è presente usa il V2 (mappa config → `HouseParams`).
- Il vecchio `syntheticHeatPumpLoad` (segnaposto 65/35 scalato a un target) resta per retro-compatibilità.
- Test: `test/houseLoad.test.ts`.
