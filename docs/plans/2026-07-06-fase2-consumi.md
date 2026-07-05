# Fase 2 — Sistema consumi: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (esecuzione inline con checkpoint). Esecutore raccomandato: **Opus 4.8**. Branch: `feat/fase2-consumi` da `main` (con Fase 1 già mergiata). A fine fase una sola review whole-branch + **squash merge**.

**Goal:** l'utente inserisce i propri consumi in tre modi (CSV reale, template mensili, stima parametrica fisica) — tutto converge nella forma canonica (array 8760 kWh/ora + metadati) che sblocca economia/batteria/confronto.

**Architecture:** ogni metodo è un produttore puro della forma canonica in `src/core/consumption/`; l'editor UI (step 3 del wizard + sezione autonoma nella sidebar) applica il risultato al dataset salvato (`StoredSetup`) rimpiazzando `viz.hourly.loadKwh` e i blocchi nb/wb baked, poi salva in IndexedDB. Nessun re-fetch PVGIS: i consumi sono ortogonali ai dati solari.

**Tech Stack:** TypeScript + Bun; nessuna dipendenza nuova (CSV parsing a mano — è un formato controllato).

## Global Constraints

- Solo TypeScript + Bun; **nessuna dipendenza nuova**.
- Stringhe UI in italiano; ogni concetto nuovo → glossario (`formaCanonica` non serve — interno; servono: `copertura`, `curvaDiCarico`, `stimaParametrica`, `templateMensili`).
- `bun test` verde a fine di ogni task.
- **Disclaimer obbligatorio** sul metodo parametrico, sempre visibile nel form E nei metadati mostrati in dashboard: "Stima approssimativa calcolata dai parametri inseriti: non sono dati reali, usala come ordine di grandezza." Mai proporre/usare generazione LLM a runtime — solo il modello fisico deterministico esistente (`houseLoad.ts`).
- Stile UI identico all'esistente.

## Nota per l'esecutore

- Dipendenze dalla Fase 1 da verificare a inizio lavoro: `StoredSetup { inputs, viz, hourlyT2m }` in `web/src/lib/setupTypes.ts`; `loadSetup/saveSetup` in `datasetStore.ts`; `buildVizObject(prod, sim | null, meta)` in `src/core/viz/buildViz.ts`; helper `hasConsumption(viz)`; wizard `StepConsumption.tsx` segnaposto; `localHourWeekday` in core.
- I riferimenti a file della Fase 1 sono per nome/contratto, non per riga: **verifica le firme reali** prima di consumarle; se divergono dal piano, adatta questo piano al codice reale (il codice vince) e annotalo nel report.
- Il dataset **demo** (viz.demo.json) ha consumi baked ma non ha `hourlyT2m` → sul demo il metodo parametrico mostra: "Disponibile dopo il setup della tua località (serve la temperatura del sito)". Gli altri due metodi funzionano anche sul demo? NO — il demo è read-only concettualmente: l'editor consumi su demo mostra invito a fare il setup. Solo dataset da wizard sono editabili.

---

### Task 1: Forma canonica + tipi + expander template mensili

**Files:**
- Create: `src/core/consumption/canonical.ts`, `src/core/consumption/monthlyTemplate.ts`
- Modify: `web/src/lib/setupTypes.ts` (campo `consumption` in `StoredSetup`)
- Test: `test/monthlyTemplate.test.ts`, `test/canonical.test.ts`

**Interfaces:**

```ts
// canonical.ts — pure
export interface CanonicalConsumption {
  hourlyKwh: number[];            // stesso asse di viz.hourly.timestampsUtc
  meta: {
    source: "csv" | "monthly" | "parametric";
    label: string;                // es. "CSV casa2024.csv" | "Template mensili" | "Stima parametrica"
    annualKwh: number;
    coveragePct: number;          // 100 per monthly/parametric
    disclaimer?: string;          // presente per parametric
  };
}
export function validateCanonical(c: CanonicalConsumption, expectedLength: number): string | null;

// StoredSetup (setupTypes.ts) gains:
//   consumption?: { spec: ConsumptionSpec; result: CanonicalConsumption }
export type ConsumptionSpec =
  | { method: "csv"; filename: string }                          // il CSV grezzo NON si salva: solo il risultato
  | { method: "monthly"; template: MonthlyTemplate }
  | { method: "parametric"; house: HouseParams };                // HouseParams da src/core/consumption/houseLoad.ts

// monthlyTemplate.ts — pure
export type DayShapeKey = "flat" | "morningEvening" | "daytimeWfh" | "nightHeavy";
export const DAY_SHAPES: Record<DayShapeKey, readonly number[]>; // 24 pesi adimensionali ciascuna
export interface MonthlyTemplate {
  months: { dailyKwh: number; shape: DayShapeKey | number[] }[]; // 12 elementi; number[24] = shape custom (avanzato)
  weekendFactor: number;                                          // default 1
}
/** Espande il template sull'asse orario del dataset: per ogni giorno, dailyKwh del mese
 *  distribuiti secondo la shape (normalizzata), × weekendFactor nei giorni weekend LOCALI
 *  poi rinormalizzato perché il totale mensile resti = dailyKwh × giorni del mese. */
export function expandMonthlyTemplate(t: MonthlyTemplate, timestampsUtc: readonly number[], months: readonly number[], timeZone: string): CanonicalConsumption;
```

Shape di riferimento (vincolanti, adimensionali — verranno normalizzate):
- `flat`: 24 × 1.
- `morningEvening`: riusa il profilo `BASE_WEEKDAY` di houseLoad.ts (copiane i valori, non importarlo: moduli indipendenti).
- `daytimeWfh`: `BASE_WEEKDAY` + plateau diurno (somma dei pesi `WFH_DAYTIME`).
- `nightHeavy`: [1.6×8 (0-7), 0.8×10 (8-17), 1.2×6 (18-23)] circa — definisci valori esatti e testali.

- [ ] **Step 1: test che falliscono** — `expandMonthlyTemplate`: (a) totale annuo = Σ (dailyKwh_m × giorni_m) con tolleranza 1e-6; (b) totale di OGNI mese preservato anche con weekendFactor ≠ 1; (c) shape flat → tutte le ore del giorno uguali; (d) weekendFactor 2 → sabato ≈ 2× martedì stesso mese (rapporto esatto dopo rinormalizzazione: verifica il rapporto pesato); (e) weekend calcolato sul giorno LOCALE (`localHourWeekday`), test a cavallo di mezzanotte come in localTime.test; (f) shape custom 24 valori accettata; (g) `validateCanonical`: lunghezza sbagliata/NaN/negativi → messaggio.
- [ ] **Step 2: implementa.** Commit `feat(consumption): forma canonica + template mensili`.

---

### Task 2: Parser CSV generico (orario/quartorario)

**Files:**
- Create: `src/core/consumption/parseCsv.ts`
- Test: `test/parseConsumptionCsv.test.ts`

**Interfaces:**

```ts
export interface CsvParseOptions {
  timeZone: string;                        // interpretazione dei timestamp
  timestampsUtc: readonly number[];        // asse del dataset (per l'allineamento calendario)
  months: readonly number[];
}
export interface CsvParseOutcome {
  result: CanonicalConsumption;            // coveragePct riflette i buchi riempiti
  warnings: string[];                      // es. "riga 1042 scartata: kWh non numerico"
}
export function parseConsumptionCsv(text: string, filename: string, opts: CsvParseOptions): CsvParseOutcome; // throw se copertura < 50% o file illeggibile
```

Regole vincolanti (documentarle in docs/07):
1. **Dialetto**: delimitatore auto tra `,` e `;` (conta le occorrenze sulla prima riga dati); virgola decimale accettata (se delimitatore `;`, `,` nei numeri = decimale; se delimitatore `,`, i numeri devono usare `.`); header opzionale (prima riga senza numero nella colonna valore → header, skippala).
2. **Colonne**: 2 colonne `timestamp, kWh`. Timestamp accettati: ISO `YYYY-MM-DD[T ]HH:mm(:ss)?`, oppure `DD/MM/YYYY HH:mm`. Interpretati nella `timeZone` del setup (conversione: costruisci la mappa localkey→indice sotto).
3. **Risoluzione**: righe a 15 min sommate nell'ora; righe orarie prese così.
4. **Allineamento calendario**: l'anno dei dati può differire dall'anno PVGIS → chiave `MM-DD-HH` locale. Mappa target: per ogni indice dell'asse dataset calcola la chiave locale via `localHourWeekday` + `Date` UTC (mese/giorno da timestamp, ora locale da localHourWeekday) — costruisci `Map<chiave, indici[]>` (l'ora duplicata DST ha 2 indici: il valore va sul primo, il secondo resta buco da riempire). 29 feb nei dati utente → scartato con warning.
5. **DST nei dati utente**: ora locale duplicata (due righe stessa chiave) → somma; ora mancante → resta buco.
6. **Buchi**: riempiti con la media stesso-mese/stesso-tipo-giorno(feriale|weekend)/stessa-ora calcolata sui dati presenti; se una cella non ha nessun campione → media del mese/ora ignorando il tipo giorno; se ancora vuota → 0 con warning. `coveragePct` = ore con dato reale / 8760 × 100, arrotondato a 1 decimale.
7. **Soglia**: copertura < 50% → throw con messaggio che riporta la percentuale.

- [ ] **Step 1: test che falliscono** — costruisci i CSV nei test come stringhe: (a) file orario ISO completo → coverage 100, valori esatti; (b) quartorario → somma per ora; (c) delimitatore `;` + virgola decimale; (d) header presente; (e) anno diverso dall'asse → allineato per MM-DD-HH; (f) buco di un giorno → riempito con media del profilo, coverage < 100 e corretta; (g) copertura 30% → throw; (h) `DD/MM/YYYY`; (i) riga malformata → warning e riga scartata, non throw.
- [ ] **Step 2: implementa.** Commit `feat(consumption): parser CSV generico con allineamento calendario e riempimento buchi`.

---

### Task 3: Parser export e-distribuzione / portale consumi

Il pubblico italiano scarica la "curva di carico" quartoraria dal portale del distributore. Formato osservato negli export e-distribuzione (verificare su un file reale se disponibile, altrimenti implementare secondo queste assunzioni e marcarle in docs):
- CSV `;`-separated, decimale con virgola; header multi-riga con `POD`, intestazioni tipo `Giorno` + 96 colonne quarto-orarie (`00:00-00:15`, …) oppure formato lungo `Data;Ora;Consumo`.

**Files:**
- Create: `src/core/consumption/parseEDistribuzione.ts`
- Test: `test/parseEDistribuzione.test.ts`

**Interfaces:**

```ts
/** Ritorna null se il testo NON sembra un export e-distribuzione (→ si prova il parser generico). */
export function detectEDistribuzione(text: string): boolean;
export function parseEDistribuzione(text: string, filename: string, opts: CsvParseOptions): CsvParseOutcome;
```

Vincolante: `detect` cerca (case-insensitive) `POD` + (`curva` | 96 colonne orarie riconoscibili | intestazione `Giorno`); il parser wide-format somma i 96 quarti in 24 ore e riusa l'infrastruttura di allineamento del Task 2 (estrai dal Task 2 le funzioni condivise `alignToAxis(entries, opts)` se necessario — refactor permesso). Il flusso UI: `detectEDistribuzione ? parseEDistribuzione : parseConsumptionCsv`.

- [ ] **Step 1: test** — fixture sintetiche wide (3 giorni × 96 colonne) e long; detect positivo/negativo (un CSV generico non deve triggerare); somma quarti corretta; virgola decimale.
- [ ] **Step 2: implementa.** Commit `feat(consumption): parser export e-distribuzione (curva di carico)`.

---

### Task 4: Metodo parametrico nel browser

**Files:**
- Create: `web/src/lib/parametricConsumption.ts` (adapter sottile)
- Test: `test/parametricAdapter.test.ts`

**Interfaces:**

```ts
/** Adapter: HouseParams + dataset → CanonicalConsumption via syntheticHouseLoad (fisica deterministica, zero LLM). */
export function parametricConsumption(house: HouseParams, setup: StoredSetup): CanonicalConsumption;
// ctx = { timestampsUtc: viz.hourly.timestampsUtc, months: viz.hourly.months, t2m: setup.hourlyT2m, timeZone: setup.inputs.timeZone }
// meta: source "parametric", coveragePct 100, disclaimer = testo obbligatorio (vedi Global Constraints)
```

- [ ] **Step 1: test** — con un setup sintetico: totale = formula fisica attesa (come houseLoad.test); disclaimer presente nei meta; t2m preso da `hourlyT2m` e NON da viz.
- [ ] **Step 2: implementa.** Commit `feat(web): metodo consumi parametrico (adapter houseLoad)`.

---

### Task 5: Applicazione al dataset + ricalcolo blocchi baked

**Files:**
- Create: `web/src/lib/applyConsumption.ts`
- Test: `test/applyConsumption.test.ts`

**Interfaces:**

```ts
/** Sostituisce i consumi nel dataset: aggiorna viz.hourly.loadKwh, meta.consumption*,
 *  e ricalcola i blocchi baked nb/wb (annual/monthly/hourly) con il motore esistente
 *  (computeSystem sulla baseline del viz, coupling/roundTrip/batteria dal meta),
 *  così i golden derive-vs-baked restano coerenti. Ritorna un NUOVO StoredSetup. */
export function applyConsumption(setup: StoredSetup, spec: ConsumptionSpec, result: CanonicalConsumption): StoredSetup;
```

Vincolante: pure (il salvataggio IndexedDB lo fa il chiamante); `meta.consumptionSource = result.meta.source`, `meta.consumptionAnnualKwh`, `meta.consumptionNote = label (+ " · copertura X%" se csv) (+ disclaimer se parametric)`. I blocchi nb/wb si ricostruiscono con la stessa via usata da `deriveMonoViz`/`buildVizObject` — scegli la strada più diretta disponibile nel codice reale della Fase 1 e documentala nel report; l'invariante testabile è: dopo `applyConsumption`, `deriveMonoViz(viz, cloneFromBaseline(viz))` riproduce i blocchi baked (stesso golden della Fase 0).

- [ ] **Step 1: test** — invariante golden di cui sopra su un viz sintetico; loadKwh sostituito; meta aggiornati; input non mutato (nuovo oggetto).
- [ ] **Step 2: implementa.** Commit `feat(web): applyConsumption — consumi nel dataset con ricalcolo baked`.

---

### Task 6: UI editor consumi (wizard step 3 + sezione sidebar)

**Files:**
- Create: `web/src/components/consumption/ConsumptionEditor.tsx` (+ sotto-componenti per metodo)
- Modify: `web/src/components/wizard/StepConsumption.tsx` (ospita l'editor, resta saltabile), `web/src/components/Sidebar.tsx` (sezione "Consumi"), glossario
- Test: logica già coperta; componenti senza test (prassi repo)

**Vincolante (markup a discrezione):**
- Tre tab metodo: "CSV" / "Template mensili" / "Stima parametrica". Cambio tab conserva gli input di ciascun metodo (stato locale per metodo).
- **CSV**: input file + drop; al parse mostra warnings (collassabili), copertura %, anteprima: barre mensili + curva di un giorno campione (riusa i pattern grafici Recharts esistenti); bottone "Applica".
- **Template**: griglia 12 righe (mese, kWh/giorno `NumberField`, shape `<select>`, riga custom 24 valori dietro toggle avanzato) + weekendFactor; anteprima come sopra; "Applica".
- **Parametrico**: form sui campi `HouseParams` con hint valori tipici per campo (es. "90 kWh/m²·anno ≈ casa ristrutturata; 40 ≈ nuova costruzione"; SCOP "targa della PdC"; base "elettrodomestici+luci, 2000-3500 kWh tipico"); **disclaimer sempre visibile** (box, non tooltip); anteprima live (ricalcolo on-change con debounce 300 ms); "Applica". Su demo dataset o senza `hourlyT2m`: metodo disabilitato con spiegazione.
- "Applica" → `applyConsumption` → `saveSetup` → aggiorna lo stato App (il gating solo-produzione si sblocca da solo via `hasConsumption`).
- Footer dashboard: mostra `meta.consumptionNote` (già fa — verifica che il nuovo testo con copertura/disclaimer ci passi).
- Glossario: `copertura`, `curvaDiCarico`, `stimaParametrica`, `templateMensili`.

- [ ] **Step 1: implementa.**
- [ ] **Step 2: verifica manuale** — flusso: setup wizard → step 3 → template mensili compilato in 2 minuti → applica → dashboard sbloccata con economia/batteria; poi sostituisci con CSV di prova → copertura mostrata; poi parametrico → disclaimer visibile ovunque previsto.
- [ ] **Step 3:** `bun test` verde. Commit `feat(web): editor consumi (CSV, template, parametrico) in wizard e sidebar`.

---

### Task 7: Docs + verifica finale

- Update `docs/07-consumi.md`: i tre metodi, forma canonica, regole CSV (dialetti, allineamento, buchi, soglia 50%), template, disclaimer parametrico; frontmatter aggiornato. Nuove sezioni brevi in `docs/08-wizard-setup.md` (step 3 non più segnaposto). `docs/index.md` indice.
- Verifica: `bun test`, flusso manuale end-to-end, `bun run analysis` (CLI intatta).
- Commit docs. **Chiusura fase**: review whole-branch → fix → squash merge su main (`feat: sistema consumi — CSV, template mensili, stima parametrica (Fase 2)`).

## Self-review (fatta in scrittura)

- Copertura spec sezione "Sistema consumi": metodo A (generico + e-distribuzione, dialetti, allineamento, DST, buchi, soglia, anteprima) ✓; metodo B (template, shape preset + custom, weekend) ✓; metodo C (fisico, T2m reale via `hourlyT2m`, disclaimer obbligatorio, hint) ✓; forma canonica + intercambiabilità ✓; modalità solo-produzione si sblocca via `hasConsumption` (Fase 1) ✓; "switching methods preserves last inputs" ✓ (stato per metodo).
- Vincolo no-LLM-runtime rispettato e ribadito.
- Rischio principale segnalato all'esecutore: formato reale e-distribuzione — assunzioni marcate, detect conservativo con fallback al parser generico.
