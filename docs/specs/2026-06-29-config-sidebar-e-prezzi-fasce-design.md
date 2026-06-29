---
title: Configurazione a sidebar + prezzi a fasce orarie — design
last_updated: 2026-06-29
summary: Sposta la configurazione (Sistema B + tariffa elettrica) in una sidebar globale collassabile con slider+input, e aggiunge il calcolo dei costi/ricavi per fasce orarie mostrato in tutte le view (annuale/mensile/giornaliero/confronto). Tariffa singola condivisa.
status: draft
related:
  - 2026-06-26-confronto-sistemi-design.md
  - 04-confronto-sistemi.md
  - 03-simulazione-batteria.md
---

# Configurazione a sidebar + prezzi a fasce orarie — design

## Context
Due richieste dopo il completamento del confronto sistemi:
1. La pagina di Configurazione è l'unica "HTML grezzo" e sta in una tab a sé. Va resa coerente con
   lo stile dell'app e spostata in una **sidebar globale sempre accessibile** (i controlli servono
   mentre si guardano i grafici), con i numerici editabili sia da **input** sia da **slider**.
2. Servono i **costi/ricavi dell'energia per fasce orarie**, mostrati in **tutte le view**, per avere
   un confronto economico immediato fra sistemi e (in futuro) fra offerte del gestore.

La simulazione è già **interamente oraria** (asse UTC 0..8759), con import/export ora-per-ora per
entrambi gli scenari (`viz.hourly.nb/wb.{importKwh,exportKwh}`): i costi a fasce sono quindi calcolabili
senza alcun raggruppamento aggiuntivo.

## Scope
- **Tariffa singola condivisa** (come i consumi), configurabile e persistita in `localStorage`.
- **Motore costi puro** che applica la tariffa ai flussi orari import/export → costo acquisto, ricavo
  vendita, netto (annuale + mensile).
- **Costi in tutte le view**: annuale, mensile, giornaliero (sullo scenario attivo) e Confronto
  (netto €/anno di A e B + Δ). Calcolo **live** nel browser (la tariffa è editabile).
- **Sidebar globale collassabile** (sezioni Tariffa + Sistema B; e collasso laterale dell'intera
  sidebar), con `NumberField` (slider+input). Rimozione della tab "Configurazione".
- Fix grafico Confronto: il "coperto" disegnato come **area riempita** (non linea).

### Non-goal (v1)
Offerte multiple a confronto, scambio sul posto, calendario festivi nazionali completo, quote fisse/
oneri ARERA, costi fissi mensili, prezzo di vendita a fasce.

## Modello tariffario (puro, `src/core/economics/tariff.ts`)
```ts
interface TariffBand {
  id: string;
  name: string;             // es. "F1"
  color: string;            // hex per i grafici
  hours: [number, number][];// intervalli [from,to) in ora locale 0..24; se from>to la fascia avvolge la mezzanotte
  days: number[];           // giorni in cui vale: 0=Lun .. 6=Dom
  buyPrice: number;         // €/kWh acquisto
}
interface Tariff {
  label: string;
  bands: TariffBand[];
  defaultBuyPrice: number;  // €/kWh per ore/giorni non coperti da alcuna banda
  sellPrice: number;        // €/kWh per l'energia esportata (vendita)
}
```
- **Granularità oraria**: i confini sono sull'ora intera (la sim è oraria). Es. "08:00–20:00" = `[8,20)`;
  "20:01–07:59" ≈ `[20,24)` + `[0,8)` (oppure `from=20,to=8` con wrap).
- **Risoluzione del prezzo d'acquisto** per l'ora `t` (ora locale `lh`, giorno `wd`):
  prima banda con `wd ∈ days` e `lh` dentro uno dei suoi intervalli → `buyPrice`; altrimenti
  `defaultBuyPrice`. ("Prima banda che combacia vince".)
- **Preset**: *Monorario* (nessuna banda, solo default), *F1/F2/F3* ARERA — F1 = Lun–Ven 08–19;
  F2 = Lun–Ven 07–08 e 19–23 + Sab 07–23; F3 = tutto il resto (= `defaultBuyPrice`). I festivi
  nazionali sono trattati come domenica/F3 (semplificazione v1). Valori €/kWh dei preset = placeholder
  da sostituire con l'offerta reale.

## Motore costi (puro)
```ts
interface CostBreakdown { buyCost: number; sellRevenue: number; netCost: number } // netCost = buyCost - sellRevenue
interface CostResult { annual: CostBreakdown; monthly: (CostBreakdown & { month: number })[] }

function priceForHour(tariff: Tariff, localHour: number, weekday: number): number;
function aggregateCost(
  importKwh: readonly number[], exportKwh: readonly number[],
  localHour: readonly number[], weekday: readonly number[],
  months: readonly number[], tariff: Tariff,
): CostResult;
```
- **costo acquisto** = `Σ import(t) × priceForHour(tariff, lh(t), wd(t))`
- **ricavo vendita** = `Σ export(t) × tariff.sellPrice`
- **netto** = `costo acquisto − ricavo vendita` (può essere negativo = saldo a credito).
  La batteria è **già dentro** import/export (li abbassa entrambi): nessun termine batteria separato,
  altrimenti si conterebbe due volte.
- **valore/risparmio batteria** = `netto(scenario senza) − netto(scenario con)`. È esatto (cattura
  round-trip e prezzo della fascia in cui la batteria scarica vs in cui ha caricato), a differenza
  dell'approssimazione `Σ scarica × (acquisto − vendita)`. Si ottiene differenziando i due risultati
  (entrambi disponibili). `dischargeKwh` (flusso batteria→casa, ≠ `socKwh`) resta disponibile se servisse
  mostrarlo, ma non entra nel netto.

`aggregateCost` lavora sugli array di **uno scenario**: chi chiama passa nb o wb (o i flussi del
sistema A/B nel confronto). Metric-agnostic: i € si affiancano ai kWh esistenti.

## Dati (`viz.json`)
Aggiunte a `hourly` (calcolate **nello script**, DST-corrette via `Intl` su `Europe/Rome`):
- `hourly.localHour: number[]` — ora locale 0..23 per ciascuna delle 8760 ore.
- `hourly.weekday: number[]` — giorno settimana 0=Lun..6=Dom per ciascuna ora.

I **costi non si precalcolano**: si calcolano live perché la tariffa è editabile. Nessun'altra modifica
ai dati. `writeVizJson` resta invariato per il resto.

## Costi nelle view
Componente riusabile **`CostSummary`** (acquisto · vendita · **netto**):
- **annuale / mensile / giornaliero**: costi dello **scenario attivo** (con/senza, toggle già esistente)
  + riga **"risparmio batteria/anno" = netto(senza) − netto(con)** (nelle view mono-sistema usa i flussi
  baseline nb/wb di `viz.hourly`). Nel mensile, `CostSummary` mostra anche il **netto €/mese** come testo
  (da `CostResult.monthly`), senza introdurre un nuovo grafico.
- **Confronto**: `KpiTable` guadagna le righe **netto €/anno** di A e B (ognuno con il proprio scenario,
  determinato dalla sua batteria) e **Δ = netto(B) − netto(A)**. Qui non c'è la riga senza/con: ogni
  sistema è un singolo scenario, il confronto è A vs B.

Helper web `viewCosts.ts`: estrae gli array import/export per scenario da `viz.hourly` e invoca
`aggregateCost(... , tariff)`; per il confronto usa gli array dei `SystemResult` di A/B.

## Layout / Sidebar
```
┌──────────────┬──────────────────────────────┐   ‹ = collassa l'intera sidebar (rail stretto)
│‹ TARIFFA   ▾ │ [annuale│mensile│giorno│conf] │
│  bande +     │                              │
│  prezzi      │   view corrente + CostSummary │
│ SISTEMA B  ▾ │                              │
│  est ▭▭ ──○  │   (i grafici si allargano    │
│  ovest▭▭──○  │    quando la sidebar è chiusa)│
│  batteria…   │                              │
└──────────────┴──────────────────────────────┘
```
- **Sidebar globale** a sinistra con due **sezioni collassabili**: **Tariffa** (vale in tutte le view)
  e **Sistema B** (rilevante nel Confronto; visibile sempre con nota).
- **Intera sidebar collassabile** lateralmente: toggle ‹/› → rail stretto / nascosta, il main si allarga.
  Stato del collasso persistito in `localStorage`. Su viewport stretta la sidebar va in cima (stack).
- **`NumberField`**: input numerico + slider sincronizzati (stesso valore, min/max/step per campo).
- **Tab "Configurazione" rimossa**. I suoi contenuti diventano `SystemBEditor` (estratto da `ConfigPage`)
  e il nuovo `TariffEditor`, montati nella sidebar. Tab restanti: annuale, mensile, giorno, confronto,
  glossario.
- **Export/Import** (Sistema B e Tariffa) restano via modale drag-and-drop (`ImportModal` riusato/esteso;
  per la tariffa la validazione è solo strutturale).
- Restyle con le card e i token del tema esistenti (`styles.css`).

### TariffEditor
Lista di bande (nome, swatch colore, intervalli orari, caselle giorni Lun..Dom, prezzo acquisto) con
aggiungi/rimuovi; campo `defaultBuyPrice`; campo `sellPrice`; bottoni preset **Monorario** / **F1/F2/F3**.
`label` modificabile. Validazione leggera (prezzi ≥ 0, ore 0..24, almeno default presente).

## Fix grafico Confronto
`CompareDayChart`: il "coperto da PV(+batteria)" passa da `Line` ad **`Area`** riempita, come in
`PowerChart`/`DailyExplorer` — A area piena, B area con riempimento più tenue (o tratteggio) per
distinguerli. Produzione e SoC restano linee (A piena / B tratteggiata).

## Componenti
- **Core**: `src/core/economics/tariff.ts` (tipi `Tariff`/`TariffBand`/`CostResult`, `priceForHour`,
  `aggregateCost`).
- **Web lib**: `web/src/lib/tariffPresets.ts` (default + preset Monorario/F1F2F3, `serialize`/`parse`/
  `validateTariff`); `web/src/lib/viewCosts.ts` (costi per scenario da `viz`/`SystemResult`).
- **Web componenti**: `Sidebar.tsx` (shell + collassi), `TariffEditor.tsx`, `SystemBEditor.tsx`
  (estratto da `ConfigPage`), `NumberField.tsx`, `CostSummary.tsx`.
- **Modifiche**: `App.tsx` (layout a sidebar, stato `systemB` + `tariff`, rimozione tab config),
  `AnnualOverview.tsx` / `MonthlyView.tsx` / `DailyExplorer.tsx` (montano `CostSummary`),
  `KpiTable.tsx` (righe netto €/anno + Δ), `CompareDayChart.tsx` (area), `ImportModal.tsx`
  (import tariffa), `web/src/types.ts` (+`hourly.localHour`/`weekday`, Tab senza "config"),
  `src/export/writeVizJson.ts` (+ localHour/weekday), `web/src/styles.css`.
- **Rimozione**: `web/src/components/ConfigPage.tsx` (contenuto migrato nella sidebar).

## Testing
- **Core** `tariff.test.ts`: `priceForHour` (banda semplice, wrap mezzanotte, selezione giorni, fallback
  default); `aggregateCost` (annuale = Σ mensile; monorario = prezzo piatto; ricavo = export×sell;
  netto = acquisto − vendita); preset F1/F2/F3 su ore/giorni noti (es. mercoledì 10:00 = F1, sabato
  21:00 = F2, domenica 03:00 = F3).
- **Web**: `tariffPresets` serialize/parse round-trip + `validateTariff`; `viewCosts` su un mini-`viz`.
- **UI**: build SPA verde (`bun build ./web/index.html`); verifica manuale (modifica tariffa → costi e
  risparmio si aggiornano live in tutte le view; sidebar collassa; slider/input sincronizzati).

## Edge case
- Nessuna banda → tutto a `defaultBuyPrice` (monorario). Bande sovrapposte → vince la prima. Ora/giorno
  non coperti → default. `sellPrice > buyPrice` ammesso (netto può diventare negativo). Sistema senza
  batteria → `netto(con)=netto(senza)` → risparmio 0. DST: le 2 transizioni gestite dal precalcolo
  `localHour`/`weekday` nello script.

## Verifica end-to-end
1. `bun test` verde (incl. nuovi test tariffa).
2. `bun run analysis` → `viz.json` con `hourly.localHour`/`weekday`.
3. `bun run web`: sidebar con Tariffa + Sistema B (slider+input), collasso laterale; costi (acquisto/
   vendita/netto) e risparmio batteria in annuale/mensile/giornaliero; netto A|B|Δ nel Confronto;
   coperto del Confronto come area; aggiornamento **live** a ogni modifica, **zero** chiamate di rete.

## Evoluzioni (non ora)
- **Offerte multiple**: tabella €/anno per offerta (il motore costi è già pronto: basta passargli più
  tariffe). - Scambio sul posto / prezzo vendita a fasce / quote fisse / calendario festivi completo.
- Payback/NPV della batteria e del sistema, costruiti sopra `netto` e `risparmio`.
