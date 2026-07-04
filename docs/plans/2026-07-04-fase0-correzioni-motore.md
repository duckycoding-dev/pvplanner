# Fase 0 — Correzioni motore: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** correggere il motore di simulazione prima del lavoro webapp pubblica: fix DST nel carico sintetico, accoppiamento batteria DC/AC (clipping recuperabile), round-trip da config, rimozione codice/dati morti.

**Architecture:** tutte le modifiche stanno nel core puro (`src/core`) + orchestratori (`src/app`, `src/export`) + plumbing web (`web/src`). Il pattern esistente resta: motore puro condiviso CLI/browser, golden test che bloccano la parità. Spec di riferimento: `docs/specs/2026-07-04-webapp-pubblica-design.md` (sezione "Fase 0").

**Tech Stack:** TypeScript + Bun (runtime, test runner, bundler). React 19 + Recharts nel web. Zero dipendenze nuove.

## Global Constraints

- Solo TypeScript + Bun; nessuna dipendenza nuova.
- Stringhe UI in **italiano** (l'i18n arriva in una fase successiva).
- Ogni concetto nuovo visibile in UI → voce in `web/src/lib/glossary.ts` (regola permanente della spec).
- Test: `bun test` (tutta la suite) deve essere verde alla fine di ogni task.
- I test "golden" confrontano motore browser vs motore CLI e vs `web/viz.json`: quando un task cambia i numeri del motore, lo stesso task rigenera `web/viz.json` con `bun run analysis` prima di dichiararsi finito.
- Commit frequenti, messaggi in stile repo (`feat:`/`fix:`/`test:`/`docs:`/`chore:`), corpo solo se il "perché" non è ovvio.
- `config.json` è il file locale del proprietario: i task lo modificano (aggiunta blocco `simulation`), non lo eliminano.

---

### Task 1: Rimozione download DRcalc/MRcalc (dati mai consumati)

I file `daily_*.json` (DRcalc) e `data/generic/monthly.json` (MRcalc) sono scaricati ma mai letti dall'analisi né dal web (~26 chiamate PVGIS inutili). Via tutto: job, builder, parser inverso, test, file dati.

**Files:**
- Modify: `src/fetch/download.ts` (job daily/monthly + import)
- Modify: `src/fetch/urlBuilder.ts:50-79` (rimuovi `dailyParams`, `monthlyParams`)
- Modify: `src/fetch/paramsFromInputs.ts:77-95` (rimuovi `dailyParamsFromFile`, `monthlyParamsFromFile`)
- Modify: `src/config/pvgisConventions.ts:10-15` (PVGIS_TOOLS solo hourly/power)
- Modify: `src/fetch/validateDownload.ts:78-85` (rami headline daily/monthly)
- Modify: `src/config/schema.ts:20` (commento `single_year`)
- Modify: `src/paths.ts:13` (rimuovi `GENERIC_DIR`)
- Modify: `scripts/download.ts:22` (usage string)
- Modify: `test/urlBuilder.test.ts`
- Delete: `data/generic/` (directory), `data/falde/-45/daily_*.json`, `data/falde/45/daily_*.json`

**Interfaces:**
- Consumes: nulla dai task precedenti.
- Produces: `PVGIS_TOOLS = { hourly: "seriescalc", power: "PVcalc" }`; `buildJobs` genera solo job hourly+power. Nessun altro task dipende dai simboli rimossi.

- [ ] **Step 1: Rimuovi i test dei tool morti**

In `test/urlBuilder.test.ts`:
- elimina i test `"daily params round-trip (12 months × both falde)"` (righe 36-45) e `"monthly generic params round-trip"` (righe 47-51);
- nell'import a riga 5 togli `dailyParams, monthlyParams`; nell'import a righe 6-11 togli `dailyParamsFromFile, monthlyParamsFromFile`; togli l'import di `fromRoot` (riga 3) se resta inutilizzato;
- il test `"daily/power/monthly carry their tool-specific flags"` (righe 69-89) diventa:

```ts
test("power carries its tool-specific flags", async () => {
  const cfg = await loadConfig();
  const est = cfg.resolvedFalde.find((f) => f.id === "est")!;
  const pw = powerParams(cfg, est);
  expect(pw.fixed).toBe("1");
  expect(pw.startyear).toBeUndefined(); // full DB range
  expect(pw.pvcalculation).toBeUndefined();
});
```

- [ ] **Step 2: Rimuovi il codice**

- `src/fetch/urlBuilder.ts`: elimina le funzioni `dailyParams` (righe 50-62) e `monthlyParams` (righe 64-79).
- `src/fetch/paramsFromInputs.ts`: elimina `dailyParamsFromFile` (77-84) e `monthlyParamsFromFile` (86-95).
- `src/config/pvgisConventions.ts`: `PVGIS_TOOLS` diventa

```ts
export const PVGIS_TOOLS = {
  hourly: "seriescalc",
  power: "PVcalc",
} as const;
```

- `src/fetch/download.ts`: elimina il ciclo `for (let month = 1; month <= 12; month++) {...}` (righe 37-47) e il job `generic monthly` (righe 49-55); aggiorna l'import a riga 7 in `import { buildUrl, hourlyParams, powerParams } from "./urlBuilder.ts";` e rimuovi `fromRoot` dall'import a riga 4 se inutilizzato.
- `src/fetch/validateDownload.ts`: elimina i rami `if (job.toolKey === "daily")` (78-81) e `if (job.toolKey === "monthly")` (82-85).
- `src/paths.ts`: elimina la riga 13 (`GENERIC_DIR`).
- `scripts/download.ts` riga 22: usage diventa `[--only=hourly,power]`.
- `src/config/schema.ts` riga 20: commento diventa `single_year: number; // year for seriescalc`.

- [ ] **Step 3: Suite verde**

Run: `bun test`
Expected: PASS, nessun riferimento residuo (un import dimenticato = errore di modulo a runtime test).

- [ ] **Step 4: Elimina i file dati**

```bash
git rm -r data/generic
git rm 'data/falde/-45/daily_*.json' 'data/falde/45/daily_*.json'
```

(Se `git rm` non matcha i glob in zsh, usare `git rm data/falde/-45/daily_01.json ... daily_12.json` esplicitamente per entrambe le falde.)

- [ ] **Step 5: Verifica dry-run del downloader e commit**

Run: `bun scripts/download.ts --dry-run`
Expected: solo 4 job (est/ovest × hourly/power), nessun daily/monthly.

```bash
git add -A
git commit -m "chore(fetch): rimossi DRcalc/MRcalc mai consumati (~26 chiamate PVGIS in meno)"
```

---

### Task 2: Rimozione profilo sintetico V1 (`syntheticSource.ts`)

Superseduto dal V2 (`houseLoad.ts`); raggiungibile solo se `consumption.house` manca. Git è l'archivio.

**Files:**
- Delete: `src/core/consumption/syntheticSource.ts`, `test/synthetic.test.ts`
- Modify: `src/app/analyzeSimulation.ts:1,60-64`

**Interfaces:**
- Consumes: nulla.
- Produces: `analyzeSimulation` con `source="synthetic"` **richiede** `consumption.house` (errore esplicito altrimenti). `ConsumptionContext.annualKwhTarget` resta (lo usa `csvConsumptionSource.ts:64`).

- [ ] **Step 1: Elimina file V1 e il suo test**

```bash
git rm src/core/consumption/syntheticSource.ts test/synthetic.test.ts
```

- [ ] **Step 2: Aggiorna `analyzeSimulation.ts`**

Rimuovi l'import a riga 1. Le righe 60-64 diventano:

```ts
  } else if (cfg.consumption.house !== undefined) {
    consumption = syntheticHouseLoad(ctx, houseParams(cfg.consumption.house));
  } else {
    throw new Error('consumption.source="synthetic" richiede il blocco consumption.house in config.json');
  }
```

(Nessun test nuovo: guardia banale, coperta dal fatto che la pipeline reale usa `house`.)

- [ ] **Step 3: Suite verde + commit**

Run: `bun test`
Expected: PASS.

```bash
git add -A
git commit -m "chore(consumption): rimosso profilo sintetico V1 (superseduto da houseLoad V2)"
```

---

### Task 3: Utility ora locale DST-correct in `src/core`

La logica DST-corretta oggi vive solo in `writeVizJson.ts:19-30`, hardcoded Europe/Rome. Va in core, parametrizzata per timezone IANA, con memoizzazione del formatter (verrà chiamata ~26k volte per run).

**Files:**
- Create: `src/core/time/localTime.ts`
- Create: `test/localTime.test.ts`
- Modify: `src/export/writeVizJson.ts:16-30,137-138`

**Interfaces:**
- Consumes: nulla.
- Produces: `localHourWeekday(tsUtc: number, timeZone: string): { hour: number; weekday: number }` con `hour` 0..23 e `weekday` 0=lunedì..6=domenica. Usata da Task 4 e da `writeVizJson`.

- [ ] **Step 1: Scrivi il test che fallisce**

`test/localTime.test.ts`:

```ts
import { expect, test } from "bun:test";
import { localHourWeekday } from "../src/core/time/localTime.ts";

test("ora legale estiva: Europe/Rome = UTC+2", () => {
  // 2023-07-01 05:00 UTC → 07:00 a Roma (CEST)
  const t = Date.UTC(2023, 6, 1, 5);
  expect(localHourWeekday(t, "Europe/Rome")).toEqual({ hour: 7, weekday: 5 }); // sabato
});

test("ora solare invernale: Europe/Rome = UTC+1", () => {
  // 2023-01-02 05:00 UTC → 06:00 a Roma (CET), lunedì
  const t = Date.UTC(2023, 0, 2, 5);
  expect(localHourWeekday(t, "Europe/Rome")).toEqual({ hour: 6, weekday: 0 });
});

test("il weekday segue il giorno LOCALE a cavallo di mezzanotte", () => {
  // 2023-07-01 22:00 UTC (sabato) → 2023-07-02 00:00 a Roma (domenica)
  const t = Date.UTC(2023, 6, 1, 22);
  expect(localHourWeekday(t, "Europe/Rome")).toEqual({ hour: 0, weekday: 6 });
});

test("timezone diverse danno ore diverse", () => {
  const t = Date.UTC(2023, 6, 1, 5);
  expect(localHourWeekday(t, "UTC").hour).toBe(5);
  expect(localHourWeekday(t, "Europe/Athens").hour).toBe(8);
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `bun test test/localTime.test.ts`
Expected: FAIL (`Cannot find module`).

- [ ] **Step 3: Implementa**

`src/core/time/localTime.ts`:

```ts
/** DST-correct local time from a UTC instant, for any IANA timezone. Pure (Intl only). */

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (f === undefined) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hour12: false, weekday: "short" });
    formatters.set(timeZone, f);
  }
  return f;
}

export interface LocalTime {
  hour: number; // 0..23
  weekday: number; // 0=Mon .. 6=Sun (local day)
}

/** Local hour and weekday at a UTC instant, DST-correct for the given IANA zone. */
export function localHourWeekday(tsUtc: number, timeZone: string): LocalTime {
  const parts = formatterFor(timeZone).formatToParts(new Date(tsUtc));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const weekday = WEEKDAY_INDEX[parts.find((p) => p.type === "weekday")?.value ?? "Mon"] ?? 0;
  return { hour, weekday };
}
```

- [ ] **Step 4: Verifica che passi**

Run: `bun test test/localTime.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Refactor `writeVizJson.ts` sull'utility**

- Rimuovi le righe 16-30 (`ROME`, `WEEKDAY_INDEX`, `localHourWeekday` locale).
- Aggiungi `import { localHourWeekday } from "../core/time/localTime.ts";`
- Righe 137-138 diventano:

```ts
      localHour: base.timestampsUtc.map((t) => localHourWeekday(t, cfg.timezone).hour),
      weekday: base.timestampsUtc.map((t) => localHourWeekday(t, cfg.timezone).weekday),
```

- [ ] **Step 6: Suite verde + commit**

Run: `bun test`
Expected: PASS (output identico: `cfg.timezone` = "Europe/Rome").

```bash
git add -A
git commit -m "feat(core): utility ora locale DST-correct parametrizzata per timezone"
```

---

### Task 4: Fix DST nella sagomatura del carico sintetico

`houseLoad.ts:72-78` usa UTC+1 fisso e il weekday UTC: in estate i picchi cadono 1 h fuori rispetto alle fasce tariffarie (DST-corrette). Si passa la timezone nel contesto e si usa l'utility del Task 3.

**Files:**
- Modify: `src/core/consumption/ConsumptionSource.ts:4-9`
- Modify: `src/core/consumption/houseLoad.ts:14-16,72-78,144,149-152`
- Modify: `src/app/analyzeSimulation.ts:45-52`
- Modify: `test/houseLoad.test.ts`

**Interfaces:**
- Consumes: `localHourWeekday(tsUtc, timeZone)` dal Task 3.
- Produces: `ConsumptionContext` gains campo obbligatorio `timeZone: string` (IANA). Chi costruisce un ctx (analyzeSimulation, test) DEVE passarlo.

- [ ] **Step 1: Scrivi il test che fallisce**

Aggiungi in fondo a `test/houseLoad.test.ts`:

```ts
test("DST: la sagoma del carico base segue l'ora locale estiva (UTC+2)", () => {
  // 48 h a partire da lunedì 2023-07-03 00:00 UTC; solo carico base (niente PDC/ACS).
  const n = 48;
  const timestampsUtc = Array.from({ length: n }, (_, i) => Date.UTC(2023, 6, 3, 0) + i * 3_600_000);
  const ctx = {
    timestampsUtc,
    months: new Array<number>(n).fill(7),
    t2m: new Array<number>(n).fill(25), // > heatingBaseTempC → riscaldamento nullo
    timeZone: "Europe/Rome",
  };
  const p = { ...HOUSE_DEFAULTS, specificHeatDemandKwhM2y: 0, dhwKwhPerPersonY: 0, wfhOccupants: 0 };
  const series = syntheticHouseLoad(ctx, p);
  // BASE_WEEKDAY ha il massimo (1.6) alle ore locali 18 e 19 → in CEST (UTC+2)
  // il primo massimo del giorno cade all'indice UTC 16 (col vecchio UTC+1 sarebbe 17).
  const day0 = series.loadKwh.slice(0, 24);
  const argmax = day0.indexOf(Math.max(...day0));
  expect(argmax).toBe(16);
});
```

E aggiorna i due test esistenti: i loro `ctx`/oggetti inline guadagnano `timeZone: "Europe/Rome"` (righe 11 e 33).

- [ ] **Step 2: Verifica che fallisca**

Run: `bun test test/houseLoad.test.ts`
Expected: FAIL — il nuovo test trova `argmax = 17` (o errore di tipo su `timeZone` prima ancora, finché non si tocca l'interfaccia: procedere comunque).

- [ ] **Step 3: Implementa**

`src/core/consumption/ConsumptionSource.ts` — il contesto diventa:

```ts
export interface ConsumptionContext {
  timestampsUtc: readonly number[];
  months: readonly number[];
  t2m: readonly number[]; // ambient temperature per hour [°C]
  timeZone: string; // IANA zone for local-time shaping (e.g. "Europe/Rome")
  annualKwhTarget?: number;
}
```

`src/core/consumption/houseLoad.ts`:
- aggiungi `import { localHourWeekday } from "../time/localTime.ts";`
- elimina le funzioni `localHour` e `isWeekend` (righe 72-78);
- aggiorna il commento del doc-block (righe 15-16): `Day-of-week and local hour are DST-correct for ctx.timeZone.`
- in `syntheticHouseLoad`, subito dopo `const standby = ...` (riga 111) aggiungi:

```ts
  const local = ctx.timestampsUtc.map((t) => localHourWeekday(t, ctx.timeZone));
```

- riga 144 diventa: `for (let i = 0; i < n; i++) dhw[i] = DHW_DAILY[local[i]!.hour]!;`
- righe 149-152 diventano:

```ts
  for (let i = 0; i < n; i++) {
    const lh = local[i]!.hour;
    const weekend = local[i]!.weekday >= 5;
    base[i] = weekend ? BASE_WEEKEND[lh]! : BASE_WEEKDAY[lh]! + p.wfhOccupants * WFH_DAYTIME[lh]!;
  }
```

`src/app/analyzeSimulation.ts` — il ctx (righe 45-52) guadagna la timezone:

```ts
  const ctx = {
    timestampsUtc: base.timestampsUtc,
    months: base.months,
    t2m: base.t2m,
    timeZone: cfg.consumption.timezone ?? cfg.timezone,
    ...(cfg.consumption.annual_kwh_target === undefined
      ? {}
      : { annualKwhTarget: cfg.consumption.annual_kwh_target }),
  };
```

- [ ] **Step 4: Verifica che passi + suite completa**

Run: `bun test test/houseLoad.test.ts` → PASS.
Run: `bun test` → PASS (i totali annui sono invarianti per costruzione — `scaleToTotal` — quindi i test esistenti non cambiano numeri; cambia solo la collocazione oraria).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(consumption): sagomatura carico su ora locale DST-correct

In estate i picchi del profilo cadevano 1 h fuori rispetto alle fasce
tariffarie (che usano gia' l'ora locale corretta)."
```

---

### Task 5: `dispatchHour` — opzioni DC (clipping recuperabile + headroom AC)

Con inverter ibrido (batteria sul bus DC) l'energia sopra il tetto AC può caricare la batteria invece di andare persa; in compenso la scarica condivide il tetto AC con il FV. Il dispatch resta retro-compatibile: senza opzioni DC il comportamento è identico a oggi.

**Files:**
- Modify: `src/core/simulation/batteryDispatch.ts`
- Modify: `test/battery.test.ts`

**Interfaces:**
- Consumes: nulla di nuovo.
- Produces:

```ts
export interface DispatchHourDcOptions {
  clipAvailKwh: number;       // energia clippata disponibile per carica DC in quest'ora
  dischargeHeadroomKw: number; // margine AC residuo dell'inverter per la scarica
}
export function dispatchHour(surplus: number, deficit: number, soc: number,
  batt: BatteryConfig, dc?: DispatchHourDcOptions): DispatchResult;
// DispatchResult gains: recoveredClipKwh: number (parte di `charge` presa dal clipping)
```

- [ ] **Step 1: Scrivi i test che falliscono**

Aggiungi in fondo a `test/battery.test.ts`:

```ts
test("DC: il clipping carica la batteria (recovered)", () => {
  const d = dispatchHour(0, 0, 0, LOSSLESS, { clipAvailKwh: 4, dischargeHeadroomKw: Infinity });
  expect(d.charge).toBe(4);
  expect(d.recoveredClipKwh).toBe(4);
  expect(d.exportKwh).toBe(0);
  expect(d.newSoc).toBe(4);
});

test("DC: la carica preferisce il clipping, il surplus residuo va in export", () => {
  // surplus 2 + clip 3, pMax 4 → charge 4 (3 dal clip + 1 dal surplus), export 1
  const batt = buildBatteryConfig({ usableKwh: 10, pMaxKw: 4, roundTrip: 1 });
  const d = dispatchHour(2, 0, 0, batt, { clipAvailKwh: 3, dischargeHeadroomKw: Infinity });
  expect(d.charge).toBe(4);
  expect(d.recoveredClipKwh).toBe(3);
  expect(d.exportKwh).toBeCloseTo(1, 9);
});

test("DC: la scarica è limitata dall'headroom AC dell'inverter", () => {
  const d = dispatchHour(0, 5, 10, LOSSLESS, { clipAvailKwh: 0, dischargeHeadroomKw: 2 });
  expect(d.discharge).toBe(2);
  expect(d.importKwh).toBe(3);
});

test("DC: ora rara clip+deficit (carico sopra il tetto AC): carica dal clip, deficit dalla rete", () => {
  const d = dispatchHour(0, 3, 0, LOSSLESS, { clipAvailKwh: 4, dischargeHeadroomKw: 0 });
  expect(d.charge).toBe(4);
  expect(d.recoveredClipKwh).toBe(4);
  expect(d.importKwh).toBe(3);
  expect(d.discharge).toBe(0);
});

test("senza opzioni DC il comportamento è invariato e recovered=0", () => {
  const d = dispatchHour(8, 0, 0, LOSSLESS);
  expect(d.charge).toBe(6);
  expect(d.recoveredClipKwh).toBe(0);
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `bun test test/battery.test.ts`
Expected: FAIL (`recoveredClipKwh` undefined / firma senza 5° parametro).

- [ ] **Step 3: Implementa**

`src/core/simulation/batteryDispatch.ts` diventa:

```ts
import type { BatteryConfig } from "../types.ts";

export interface DispatchHourDcOptions {
  /** Clipped PV energy available for DC-side charging this hour (kWh). */
  clipAvailKwh: number;
  /** Remaining inverter AC output headroom for discharge (kW); Infinity for AC coupling. */
  dischargeHeadroomKw: number;
}

export interface DispatchResult {
  charge: number; // energy taken into the battery (AC surplus + recovered clip)
  discharge: number; // AC energy delivered from the battery to load
  newSoc: number;
  exportKwh: number;
  importKwh: number;
  battToLoad: number; // === discharge
  recoveredClipKwh: number; // part of `charge` drawn from otherwise-clipped energy (DC coupling)
}

/**
 * Greedy self-consumption dispatch for one hour (Δt = 1h).
 * Charge surplus (plus, with DC coupling, clipped energy), discharge to cover
 * deficit; charge & discharge are mutually exclusive within an hour. With DC
 * coupling the discharge shares the inverter's AC cap with PV output, and the
 * rare clip+deficit hour (load above the AC cap) charges from clip while the
 * grid covers the deficit — the saturated inverter forbids discharging anyway.
 */
export function dispatchHour(
  surplus: number,
  deficit: number,
  soc: number,
  batt: BatteryConfig,
  dc?: DispatchHourDcOptions,
): DispatchResult {
  let charge = 0;
  let discharge = 0;
  let exportKwh = 0;
  let importKwh = 0;
  let battToLoad = 0;
  let recoveredClipKwh = 0;
  let newSoc = soc;
  const clipAvail = dc?.clipAvailKwh ?? 0;

  if (surplus > 0 || clipAvail > 0) {
    const roomAc = (batt.usableKwh - soc) / batt.chargeEff; // energy that fits
    charge = Math.min(surplus + clipAvail, batt.pMaxKw, Math.max(0, roomAc));
    recoveredClipKwh = Math.min(charge, clipAvail); // clip first: it is otherwise lost
    newSoc = soc + charge * batt.chargeEff;
    exportKwh = Math.max(0, surplus - (charge - recoveredClipKwh));
    importKwh = deficit; // > 0 only in the rare clip+deficit hour
  } else if (deficit > 0) {
    const headroom = dc?.dischargeHeadroomKw ?? Number.POSITIVE_INFINITY;
    const availAc = soc * batt.dischargeEff; // AC energy the battery can deliver
    discharge = Math.min(deficit, batt.pMaxKw, Math.max(0, availAc), Math.max(0, headroom));
    newSoc = soc - discharge / batt.dischargeEff;
    importKwh = deficit - discharge;
    battToLoad = discharge;
  }

  return { charge, discharge, newSoc, exportKwh, importKwh, battToLoad, recoveredClipKwh };
}
```

- [ ] **Step 4: Verifica che passino + suite completa**

Run: `bun test test/battery.test.ts` → PASS.
Run: `bun test` → PASS (campo aggiunto = additivo).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(simulation): dispatch orario con opzioni DC (recupero clipping, headroom AC)"
```

---

### Task 6: `runWithBattery` — threading DC + `recoveredClipKwh` nelle metriche

**Files:**
- Modify: `src/core/types.ts:90-115` (ScenarioHourly + AnnualMetrics.battery)
- Modify: `src/core/simulation/runSimulation.ts`
- Modify: `src/core/simulation/metrics.ts:32-41`
- Modify: `test/simulation.test.ts`

**Interfaces:**
- Consumes: `dispatchHour(..., dc?)` dal Task 5.
- Produces:

```ts
export interface DcCouplingInput {
  clippingLossKwh: readonly number[]; // per-hour clipped energy (same axis as production)
  acCapKw: number;                    // inverter AC cap shared by PV and discharge
}
export function runWithBattery(production, load, months, batt, dc?: DcCouplingInput): ScenarioResult;
// ScenarioHourly gains: recoveredClipKwh: number[] (zeri senza batteria/DC)
// AnnualMetrics.battery gains: recoveredClipKwh: number
```

- [ ] **Step 1: Scrivi il test che fallisce**

Aggiungi in fondo a `test/simulation.test.ts`:

```ts
test("DC coupling: il clipping recuperato carica la batteria e torna nelle metriche", () => {
  // practical già clippato a 5; nell'ora 1 il clip è 3 (teorica 8, cap 5)
  const prod = [0, 5, 0];
  const clip = [0, 3, 0];
  const load = [2, 0, 2];
  const months = [1, 1, 1];
  const batt = buildBatteryConfig({ usableKwh: 10, pMaxKw: 10, roundTrip: 1, socConvergence: false });
  const r = runWithBattery(prod, load, months, batt, { clippingLossKwh: clip, acCapKw: 5 });

  const h = r.hourly;
  expect(h.chargeKwh[1]).toBeCloseTo(8, 9); // 5 surplus + 3 clip
  expect(h.recoveredClipKwh[1]).toBeCloseTo(3, 9);
  expect(h.exportKwh[1]).toBeCloseTo(0, 9);
  expect(h.dischargeKwh[2]).toBeCloseTo(2, 9);
  expect(r.metrics.battery!.recoveredClipKwh).toBeCloseTo(3, 9);

  // conservazione: g + recuperato = diretto + carica + export
  const g = 5, recovered = 3, direct = 0, chargeTot = 8, exportTot = 0;
  expect(g + recovered).toBeCloseTo(direct + chargeTot + exportTot, 9);
});

test("AC coupling (nessun blocco dc): recoveredClipKwh resta 0", () => {
  const batt = buildBatteryConfig({ usableKwh: 10, pMaxKw: 5, roundTrip: 1, socConvergence: false });
  const r = runWithBattery([0, 5, 0], [2, 0, 2], [1, 1, 1], batt);
  expect(r.metrics.battery!.recoveredClipKwh).toBe(0);
  expect(r.hourly.recoveredClipKwh.every((v) => v === 0)).toBe(true);
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `bun test test/simulation.test.ts`
Expected: FAIL (firma/`recoveredClipKwh` inesistenti).

- [ ] **Step 3: Implementa**

`src/core/types.ts`:
- in `ScenarioHourly` aggiungi dopo `dischargeKwh` (riga 97): `recoveredClipKwh: number[]; // clipped energy charged on the DC bus (0 for AC/no-battery)`
- in `AnnualMetrics.battery` aggiungi dopo `roundTripLossKwh` (riga 112): `recoveredClipKwh: number; // Σ clipped energy recovered into the battery (DC coupling)`

`src/core/simulation/runSimulation.ts`:
- in `emptyHourly` aggiungi `recoveredClipKwh: new Array<number>(n).fill(0),`
- aggiungi l'interfaccia e aggiorna le firme:

```ts
export interface DcCouplingInput {
  /** Hourly clipped energy available to charge on the DC bus (same axis as production). */
  clippingLossKwh: readonly number[];
  /** Inverter AC output cap (kW), shared by PV output and battery discharge. */
  acCapKw: number;
}
```

- `simulatePass(production, load, batt, startSoc, dc?: DcCouplingInput)`: dentro il loop la chiamata a `dispatchHour` (riga 56) diventa

```ts
    const d = dispatchHour(
      bal.surplus,
      bal.deficit,
      soc,
      batt,
      dc === undefined
        ? undefined
        : { clipAvailKwh: dc.clippingLossKwh[i] ?? 0, dischargeHeadroomKw: Math.max(0, dc.acCapKw - g) },
    );
```

  e dopo `h.dischargeKwh[i] = d.discharge;` aggiungi `h.recoveredClipKwh[i] = d.recoveredClipKwh;`
- `runWithBattery(production, load, months, batt, dc?: DcCouplingInput)`: passa `dc` a ogni `simulatePass(production, load, batt, start, dc)` (entrambe le chiamate, righe 78 e 83).

`src/core/simulation/metrics.ts` — il blocco battery (righe 32-41) diventa:

```ts
  if (batt) {
    const throughputKwh = sum(h.dischargeKwh);
    const chargeKwh = sum(h.chargeKwh);
    metrics.battery = {
      throughputKwh,
      equivalentCycles: batt.usableKwh > 0 ? throughputKwh / batt.usableKwh : 0,
      roundTripLossKwh: chargeKwh - throughputKwh,
      recoveredClipKwh: sum(h.recoveredClipKwh),
      usableKwh: batt.usableKwh,
    };
  }
```

- [ ] **Step 4: Verifica che passino + suite completa**

Run: `bun test test/simulation.test.ts` → PASS.
Run: `bun test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(simulation): accoppiamento DC nel run — clipping recuperato in carica e metriche"
```

---

### Task 7: Coupling end-to-end nel motore: config, analisi, computeSystem, viz.json

Task atomico (config + entrambi i motori + rigenerazione viz.json) così i golden test restano verdi nello stesso commit. Default `dc` ovunque: il caso base (Viessmann ibrido) è DC-coupled.

**Files:**
- Modify: `src/config/schema.ts` (blocco `simulation`)
- Modify: `config.json`
- Modify: `src/app/analyzeSimulation.ts:66-75`
- Modify: `src/core/comparison/computeSystem.ts:16-33,122-139`
- Modify: `src/export/writeVizJson.ts:93,118-125`
- Modify: `test/comparison.test.ts`, `test/config.test.ts`
- Regenerate: `web/viz.json`, `output/*`

**Interfaces:**
- Consumes: `runWithBattery(..., dc?)` dal Task 6.
- Produces:
  - `SystemConfig.simulation?: { battery_coupling?: "dc" | "ac"; battery_round_trip?: number }` (default: `"dc"` / `DEFAULT_ROUND_TRIP`);
  - `ComputeSystemInput.coupling?: "dc" | "ac"` (default `"dc"`);
  - `viz.meta.batteryCoupling: "dc" | "ac"`; `viz.meta.batteryRoundTrip` ora letto da config; `viz.annual.withBattery.battery.recoveredClipKwh: number`.

- [ ] **Step 1: Scrivi i test che falliscono**

In `test/config.test.ts` aggiungi:

```ts
test("blocco simulation: coupling e round-trip letti da config", async () => {
  const cfg = await loadConfig();
  expect(cfg.simulation?.battery_coupling).toBe("dc");
  expect(cfg.simulation?.battery_round_trip).toBeCloseTo(0.9, 9);
});
```

In `test/comparison.test.ts` aggiungi:

```ts
test("coupling DC vs AC: il DC recupera clipping in batteria", () => {
  const base: FaldaBaseline[] = [{ peakKwp: 1, productionKwh: [0, 10, 0] }];
  const common = {
    faldeBase: base,
    newPeakKwp: [1],
    acCapKw: 5, // teorica [0,10,0] → practical [0,5,0], clip [0,5,0]
    batteryUsableKwh: 20,
    roundTrip: 1,
    pMaxKw: 20,
    loadKwh: [3, 0, 3],
    months: [1, 1, 1],
  };
  const dc = computeSystem({ ...common, coupling: "dc" });
  const ac = computeSystem({ ...common, coupling: "ac" });
  expect(dc.metrics.battery!.recoveredClipKwh).toBeCloseTo(5, 9); // 5 surplus + 5 clip caricati
  expect(ac.metrics.battery!.recoveredClipKwh).toBe(0);
  expect(dc.metrics.battery!.throughputKwh).toBeGreaterThanOrEqual(ac.metrics.battery!.throughputKwh);
});
```

E aggiorna il golden esistente (righe 98-107): aggiungi al `computeSystem({...})` i campi

```ts
    roundTrip: cfg.simulation?.battery_round_trip ?? DEFAULT_ROUND_TRIP,
    coupling: cfg.simulation?.battery_coupling ?? "dc",
```

(sostituendo la riga `roundTrip: DEFAULT_ROUND_TRIP,`).

- [ ] **Step 2: Verifica che falliscano**

Run: `bun test test/config.test.ts test/comparison.test.ts`
Expected: FAIL (campo `simulation`/`coupling` inesistenti).

- [ ] **Step 3: Implementa lo schema + config.json**

`src/config/schema.ts`:
- dopo `EconomicsConfig` (riga 83) aggiungi:

```ts
/** Simulation-wide knobs not tied to a product datasheet. */
export interface SimulationConfig {
  /** Battery coupling: "dc" = hybrid inverter (clip can charge), "ac" = separate battery inverter. */
  battery_coupling?: "dc" | "ac";
  /** AC-to-AC round-trip efficiency (0..1]. */
  battery_round_trip?: number;
}
```

- in `SystemConfig` (riga 85-93) aggiungi `simulation?: SimulationConfig;` dopo `consumption`;
- in `validateSystemConfig`, prima del blocco `economics` (riga 228), aggiungi:

```ts
  let simulation: SimulationConfig | undefined;
  if (root["simulation"] !== undefined) {
    const s = asObject(root["simulation"], "simulation");
    simulation = {};
    if (s["battery_coupling"] !== undefined) {
      const c = asString(s["battery_coupling"], "simulation.battery_coupling");
      if (c !== "dc" && c !== "ac") throw new Error('config: simulation.battery_coupling must be "dc" or "ac"');
      simulation.battery_coupling = c;
    }
    if (s["battery_round_trip"] !== undefined) {
      const rt = asNumber(s["battery_round_trip"], "simulation.battery_round_trip");
      if (rt <= 0 || rt > 1) throw new Error("config: simulation.battery_round_trip must be in (0, 1]");
      simulation.battery_round_trip = rt;
    }
  }
```

  e nel return finale aggiungi `...(simulation === undefined ? {} : { simulation }),`.

`config.json` — dopo il blocco `"consumption"` aggiungi:

```json
  "simulation": { "battery_coupling": "dc", "battery_round_trip": 0.9 },
```

- [ ] **Step 4: Implementa analyzeSimulation + computeSystem + writeVizJson**

`src/app/analyzeSimulation.ts` (righe 66-75) diventa:

```ts
  const production = prod.result.combined.hourly.practicalKwh;
  const months = base.months;
  const batt = buildBatteryConfig({
    usableKwh: batteryUsableKwh(cfg.battery),
    pMaxKw: inverterBatteryPortKw(cfg.inverter),
    ...(cfg.simulation?.battery_round_trip === undefined
      ? {}
      : { roundTrip: cfg.simulation.battery_round_trip }),
  });
  const coupling = cfg.simulation?.battery_coupling ?? "dc";
  const dc =
    coupling === "dc"
      ? { clippingLossKwh: prod.result.combined.hourly.clippingLossKwh, acCapKw: prod.result.acCapKw }
      : undefined;

  const without = runNoBattery(production, consumption.loadKwh, months);
  const withB = runWithBattery(production, consumption.loadKwh, months, batt, dc);
  return { comparison: compareScenarios(without, withB), consumption };
```

`src/core/comparison/computeSystem.ts`:
- in `ComputeSystemInput` aggiungi dopo `pMaxKw` (riga 28):

```ts
  /** Battery coupling: "dc" (hybrid, clip can charge) or "ac". Default "dc". */
  coupling?: "dc" | "ac";
```

- in `computeSystem` (righe 136-139) il ramo batteria diventa:

```ts
  const dc =
    (input.coupling ?? "dc") === "dc"
      ? { clippingLossKwh: production.hourly.clippingLossKwh, acCapKw }
      : undefined;
  const res =
    batteryUsableKwh > 0
      ? runWithBattery(practical, loadKwh, months, buildBatteryConfig({ usableKwh: batteryUsableKwh, pMaxKw, roundTrip }), dc)
      : runNoBattery(practical, loadKwh, months);
```

`src/export/writeVizJson.ts`:
- riga 93: `batteryRoundTrip: cfg.simulation?.battery_round_trip ?? DEFAULT_ROUND_TRIP,` e subito sotto aggiungi `batteryCoupling: cfg.simulation?.battery_coupling ?? "dc",`
- nel blocco `annual.withBattery.battery` (righe 120-124) aggiungi `recoveredClipKwh: r3(wb.metrics.battery?.recoveredClipKwh ?? 0),`

- [ ] **Step 5: Rigenera viz.json e output**

Run: `bun run analysis`
Expected: exit 0, `web/viz.json` e `output/*` rigenerati (i numeri with-battery cambiano leggermente: il DC recupera il clipping del caso base).

- [ ] **Step 6: Suite completa verde**

Run: `bun test`
Expected: PASS — in particolare i golden `comparison.test.ts` (computeSystem ≡ analyzeSimulation, entrambi dc) e `monoView.test.ts`/`vizExport.test.ts` (derive ≡ viz.json rigenerato). Se `monoView.test.ts` confronta campi battery, il campo nuovo è additivo e non rompe.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(engine): accoppiamento batteria DC/AC end-to-end (default dc) + round-trip da config

DC (inverter ibrido): il surplus sopra il tetto AC carica la batteria
invece di andare perso; la scarica condivide il tetto AC col FV."
```

---

### Task 8: Coupling nel web: SystemConfigB, toggle UI, viste, glossario

**Files:**
- Modify: `web/src/types.ts:55,75`
- Modify: `web/src/lib/systemConfig.ts` (campo + clone + equals + parse)
- Modify: `web/src/lib/runSystem.ts:17-26`
- Modify: `web/src/lib/monoView.ts:38,44-60,72-79`
- Modify: `web/src/components/SystemEditor.tsx:118-125`
- Modify: `web/src/components/ComparePage.tsx:50`
- Modify: `web/src/components/AnnualOverview.tsx:145-152`
- Modify: `web/src/lib/glossary.ts`
- Test: `test/systemConfig.test.ts`, `test/monoView.test.ts` (verifica esistenti)

**Interfaces:**
- Consumes: `viz.meta.batteryCoupling`, `battery.recoveredClipKwh` dal Task 7; `ComputeSystemInput.coupling`.
- Produces: `SystemConfigB.coupling: "dc" | "ac"` (persistito in localStorage/export; file vecchi → default `"dc"`).

- [ ] **Step 1: Scrivi i test che falliscono**

In `test/systemConfig.test.ts` aggiungi:

```ts
test("coupling: default dc per file vecchi, ac se esplicito, incluso in equals", () => {
  const legacy = parseSystemConfigB(
    JSON.stringify({
      falde: [{ id: "est", azimuth: -45, panelCount: 11, wp: 465 }],
      acCapKw: 6, batteryTotalKwh: 10, batteryUsablePct: 100, roundTrip: 0.9,
    }),
  );
  expect(legacy.coupling).toBe("dc");
  const ac = parseSystemConfigB(JSON.stringify({ ...JSON.parse(serialize(legacy)), coupling: "ac" }));
  expect(ac.coupling).toBe("ac");
  expect(equalsSystems(legacy, ac)).toBe(false);
});
```

(Aggiungi `equalsSystems`/`serialize` agli import del file di test se mancanti.)

- [ ] **Step 2: Verifica che fallisca**

Run: `bun test test/systemConfig.test.ts`
Expected: FAIL (`coupling` undefined).

- [ ] **Step 3: Implementa il data model web**

`web/src/types.ts`:
- riga 55, dopo `batteryRoundTrip: number;` aggiungi `batteryCoupling: "dc" | "ac";`
- riga 75: il tipo battery diventa `battery: { throughputKwh: number; equivalentCycles: number; roundTripLossKwh: number; recoveredClipKwh: number };`

`web/src/lib/systemConfig.ts`:
- in `SystemConfigB` aggiungi dopo `roundTrip` (riga 17): `coupling: "dc" | "ac"; // "dc" = inverter ibrido (il clipping può caricare), "ac" = batteria con inverter separato`
- in `cloneFromBaseline` aggiungi `coupling: viz.meta.batteryCoupling,`
- in `equalsSystems` aggiungi `a.coupling !== b.coupling ||` alla catena di confronti (riga 49-54);
- in `parseSystemConfigB`, nel return, aggiungi `coupling: o["coupling"] === "ac" ? "ac" : "dc",`

`web/src/lib/runSystem.ts` — alla chiamata `computeSystem({...})` aggiungi `coupling: cfg.coupling,`.

`web/src/lib/monoView.ts`:
- riga 38: `const bat = wb.battery ?? { throughputKwh: 0, equivalentCycles: 0, roundTripLossKwh: 0, recoveredClipKwh: 0 };`
- nel `meta` di `vizA` aggiungi `batteryCoupling: systemA.coupling,`
- nel blocco battery (righe 74-78) aggiungi `recoveredClipKwh: bat.recoveredClipKwh,`

- [ ] **Step 4: Verifica il data model**

Run: `bun test`
Expected: PASS (incluso il nuovo test systemConfig e i golden monoView, che ora confrontano derive-dc vs viz-dc).

- [ ] **Step 5: UI — toggle, righe metriche, glossario**

`web/src/components/SystemEditor.tsx` — dopo il campo Round-trip (riga 125) aggiungi:

```tsx
      <label className="text-field">
        Accoppiamento batteria
        <select
          value={system.coupling}
          onChange={(e) => setSystem({ ...system, coupling: e.target.value === "ac" ? "ac" : "dc" })}
        >
          <option value="dc">DC (inverter ibrido)</option>
          <option value="ac">AC (inverter batteria separato)</option>
        </select>
      </label>
```

`web/src/components/ComparePage.tsx` — in `DEFS`, dopo la riga `key: "loss"` (riga 50) aggiungi:

```ts
  { key: "recClip", label: "Clipping recuperato", info: "clippingRecuperato", good: "higher", render: kwh, get: (s) => s.r.metrics.battery?.recoveredClipKwh ?? 0 },
```

`web/src/components/AnnualOverview.tsx` — dopo la card "Perdita round-trip" (riga 152) aggiungi:

```tsx
        {hasBattery && wb.battery.recoveredClipKwh > 0 && (
          <KpiCard
            label="Clipping recuperato"
            info="clippingRecuperato"
            senza="—"
            con={`${fmt(wb.battery.recoveredClipKwh)} kWh`}
          />
        )}
```

`web/src/lib/glossary.ts` — aggiungi due voci al `GLOSSARY`:

```ts
  accoppiamento: {
    term: "Accoppiamento batteria (DC/AC)",
    desc: "Dove è collegata la batteria. DC = sul bus continuo di un inverter ibrido: l'energia sopra il tetto AC può comunque caricarla (clipping recuperato), ma la scarica condivide il tetto AC col FV. AC = batteria con inverter proprio, a valle: vede solo l'energia già limitata dal tetto AC.",
  },
  clippingRecuperato: {
    term: "Clipping recuperato",
    desc: "Energia sopra il tetto AC dell'inverter che con accoppiamento DC finisce in batteria invece di andare persa. Con accoppiamento AC è sempre 0.",
    formula: "recuperato = Σ min(clipping orario, spazio in batteria)",
  },
```

- [ ] **Step 6: Verifica manuale UI + suite**

Run: `bun test` → PASS.
Run: `bun run web`, apri `http://localhost:2345`: nel menu config (hotkey `m`) il toggle DC/AC compare per Sistema A e B; su un sistema con molti pannelli (es. 20+20) e batteria, passando da AC a DC il confronto mostra la riga "Clipping recuperato" > 0 e autosufficienza in salita.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(web): toggle accoppiamento DC/AC + clipping recuperato in viste e glossario"
```

---

### Task 9: Documentazione e verifica finale

**Files:**
- Modify: `docs/03-simulazione-batteria.md` (sezione accoppiamento)
- Modify: `docs/07-consumi.md` (nota fix DST)
- Modify: `docs/01-downloader-pvgis.md` (via riferimenti DRcalc/MRcalc)
- Modify: `docs/index.md` (riga esecuzione/note se citano daily/monthly)

**Interfaces:** nessuna (solo docs). Frontmatter: aggiornare `last_updated: 2026-07-04` in ogni file toccato.

- [ ] **Step 1: `docs/03-simulazione-batteria.md`**

Aggiungi una sezione (dopo la descrizione del dispatch):

```markdown
## Accoppiamento DC / AC

La batteria può essere collegata in due punti diversi dell'impianto, e cambia
cosa può caricarla:

- **DC (inverter ibrido, default)** — la batteria sta sul bus continuo,
  PRIMA della conversione AC. L'energia sopra il tetto AC dell'inverter
  (clipping) può quindi caricarla invece di andare persa: nel dispatch la
  carica attinge prima dal clipping dell'ora (`recoveredClipKwh`), poi dal
  surplus esportabile. In compenso la scarica passa dallo stesso inverter del
  FV: `scarica ≤ tetto AC − produzione pratica` in ogni ora. Nell'ora rara
  con clipping e deficit insieme (carico sopra il tetto AC) la batteria
  carica dal clipping e il deficit resta alla rete: l'inverter saturo non
  può comunque scaricare.
- **AC (inverter batteria separato)** — la batteria vede solo l'energia già
  limitata dal tetto AC (comportamento pre-2026-07): niente recupero clipping,
  scarica senza vincolo di headroom.

Configurazione: `simulation.battery_coupling` in `config.json` (CLI) e campo
"Accoppiamento batteria" nell'editor sistemi (web). Anche il round-trip è ora
letto da `simulation.battery_round_trip` (default 0.9 = valore tipico AC-to-AC
per sistemi LFP domestici: ≥96% DC × conversioni inverter).
```

- [ ] **Step 2: `docs/07-consumi.md`**

Aggiungi una nota nella sezione sulla sagomatura oraria:

```markdown
> **Fix DST (2026-07-04):** la sagomatura oraria (picchi base, blocchi ACS,
> plateau smart-working) usa l'ora locale **DST-corretta** della timezone in
> `consumption.timezone` (fallback: `timezone` di root), via
> `src/core/time/localTime.ts` — la stessa usata dalle fasce tariffarie.
> Prima usava UTC+1 fisso: in estate i picchi cadevano 1 h fuori fascia.
> Anche il giorno feriale/weekend segue il giorno locale.
```

- [ ] **Step 3: `docs/01-downloader-pvgis.md` e `docs/index.md`**

In `01-downloader-pvgis.md`: rimuovi (o marca come "rimossi 2026-07-04, mai consumati dall'analisi") i paragrafi/tabelle su DRcalc (`daily_NN.json`) e MRcalc (`data/generic/monthly.json`); la lista tool scaricati diventa seriescalc + PVcalc. In `docs/index.md`: verifica che la sezione Esecuzione non citi i file rimossi (aggiorna se serve).

- [ ] **Step 4: Verifica finale completa**

Run: `bun test && bun run analysis && bun run web` (apri e controlla la dashboard a campione: panoramica, confronto, glossario con le voci nuove).
Expected: suite PASS, analisi rigenera senza errori, dashboard funzionante.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: accoppiamento DC/AC, fix DST consumi, downloader senza DRcalc/MRcalc"
```

---

## Self-review (fatta in scrittura)

- **Copertura spec Fase 0**: fix DST → Task 3+4; coupling DC/AC default dc → Task 5+6+7+8; round-trip da config → Task 7; rimozione DRcalc/MRcalc + dati → Task 1; rimozione V1 → Task 2; docs 03/07 → Task 9. Esclusioni consapevoli (sostituzione batteria, degrado, inflazione, NPV) confermate fuori piano.
- **Tipi coerenti tra task**: `localHourWeekday(tsUtc, timeZone)` (T3→T4); `DispatchHourDcOptions`/`recoveredClipKwh` (T5→T6); `DcCouplingInput` (T6→T7); `coupling?: "dc" | "ac"` su `ComputeSystemInput` e `SystemConfigB.coupling` (T7→T8); `viz.meta.batteryCoupling` e `battery.recoveredClipKwh` (T7→T8).
- **Golden test**: ogni task che cambia i numeri del motore chiude con rigenerazione `viz.json` (T7) prima dei confronti derive-vs-baked; T8 non cambia il formato baked (già scritto in T7).
