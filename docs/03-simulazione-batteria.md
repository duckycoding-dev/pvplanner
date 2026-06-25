---
title: Simulazione batteria (bilancio orario + dispatch autoconsumo)
last_updated: 2026-06-25
summary: Bilancio energetico orario con e senza batteria (dispatch greedy di autoconsumo), metriche di confronto e profilo consumi pluggable. Niente € — solo energia.
status: draft
legend:
  - "G(t): produzione PRATICA oraria (dopo clipping) [kWh]"
  - "L(t): consumo orario [kWh]"
  - "A_d(t): autoconsumo diretto = min(G,L) [kWh]"
  - "S/D: surplus / deficit [kWh]"
  - "SoC: stato di carica batteria [kWh]"
  - "η_c, η_d: rendimento carica/scarica = √(round-trip)"
related:
  - index.md
  - 02-modello-produzione.md
---

# Simulazione batteria

Confronta due scenari — **senza** e **con** batteria — sul bilancio energetico orario, per capire
quanto la batteria aumenta l'autoconsumo. Codice: `src/core/simulation/` (puro) + consumo
`src/core/consumption/` (sintetico) / `src/io/csvConsumptionSource.ts` (CSV) + orchestratore
`src/app/analyzeSimulation.ts`.

## Input
- **Produzione**: `G(t)` = produzione **pratica** (dopo clipping) dal modello di produzione.
- **Consumo**: `L(t)` pluggable. Senza dati reali si usa un **profilo sintetico** (pompa di calore):
  `riscaldamento ∝ gradi-ora di riscaldamento / COP` (su `T2m` del sito) + carico base con picchi
  mattina/sera, scalato a un target annuo. Da sostituire con un dataset reale (CSV).
- **Batteria**: capacità utile dalla scheda (10.24 kWh), potenza dalla porta inverter (6 kW),
  round-trip **0.90** (default, configurabile) spezzato in `η_c = η_d = √0.90`.

## Formule (per ora, Δt = 1h)

```
A_d = min(G, L)      S = max(0, G − L)      D = max(0, L − G)
```

**Senza batteria:** `export = S`, `import = D`, autoconsumo = `A_d`.

**Con batteria (greedy autoconsumo):**
```
se S>0:  c = min(S, P_max, (C − SoC)/η_c);   SoC += c·η_c;   export = S − c
se D>0:  d = min(D, P_max, SoC·η_d);          SoC −= d/η_d;   import = D − d;  batt→load = d
autoconsumo = A_d + d
```
Carica e scarica sono esclusive nell'ora. **SoC** parte da `initialSoCFraction` e viene **iterato a
convergenza** (l'anno è un anello: SoC fine → SoC inizio, finché |Δ| < 1e-3, max 6 passate) per
togliere l'artefatto dell'inizializzazione.

## Metriche (`metrics.ts`)
- autoconsumo `Σ(A_d + d)`; **tasso autoconsumo** = autoconsumo/`ΣG`; **autosufficienza** = autoconsumo/`ΣL`
- import `ΣD'`; export `ΣS'`; throughput batteria `Σd`; cicli equiv. = `Σd/C`
- perdita round-trip = `Σc − Σd` (= `Σc·(1−RT)` a SoC chiuso)
- **delta** = con − senza (punti % di autosufficienza, kWh di import evitato, ecc.)

## Output (`output/`)
`comparison.json` (metriche + mensile + delta) · `comparison_summary.csv` (metric, no_battery,
with_battery) · `comparison_monthly.csv` · `simulation_hourly.csv` (8760 righe: produzione, carico,
flussi e SoC con/senza).

## Invarianti verificati (test)
- PV split: `G = A_d_diretto + carica + export`; load split: `L = A_d_diretto + scarica + import`.
- Con batteria: autoconsumo ≥ senza; import ≤ senza; `0 ≤ SoC ≤ C`; tassi ∈ [0,1].
- Chiusura round-trip: `Σscarica ≈ Σcarica × RT`.

## Risultati con profilo SINTETICO (carico 7000 kWh, segnaposto)
| Metrica | senza batt | con batt |
|---|---|---|
| Tasso autoconsumo | 16.1% | 31.9% |
| **Autosufficienza** | **28.6%** | **56.6%** |
| Import da rete | 4996 kWh | 3039 kWh |
| Export in rete | 10429 kWh | 8255 kWh |
| Cicli batteria/anno | — | 191 |

> **Letture chiave (da confermare con dati reali):**
> - Il **tasso di autoconsumo è basso** perché il FV (~12.4 MWh) è molto più grande del consumo
>   (7 MWh): gran parte va comunque in rete. La metrica rilevante qui è l'**autosufficienza**.
> - La batteria **raddoppia l'autosufficienza** (28.6% → 56.6%) ma resta sotto il "70%" generico:
>   è il **mismatch stagionale** (riscaldamento invernale vs FV estivo) che la batteria non colma.
> - Import evitato ~1957 kWh/anno, export perso ~2174 kWh/anno (differenza = perdita round-trip
>   ~217 kWh). Il **verdetto economico** (vale la spesa?) arriva nello Step 4, quando applicheremo
>   prezzi acquisto/vendita reali: l'energia spostata vale lo *spread* `p_buy − p_sell`.
