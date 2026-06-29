# Config sidebar + prezzi a fasce — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Spostare la configurazione (Sistema B + tariffa) in una sidebar globale collassabile con slider+input, e calcolare/mostrare i costi energia per fasce orarie in tutte le view.

**Architecture:** Motore costi puro in `src/core/economics/` che applica una `Tariff` (bande ora+giorni) ai flussi orari import/export già esistenti. La tariffa è config condivisa nel browser (localStorage), i costi si calcolano **live**. La UI passa da una tab Configurazione a una **sidebar** con editor riusabili.

**Tech Stack:** TypeScript + Bun (`bun test`, `bun build`), React 19 + Recharts 3 (SPA bundlata da Bun).

## Global Constraints
- Core `src/core/**` resta **puro** (no fs/Bun/Date.now). Named export, import con estensione `.ts`.
- `weekday`: **0=Lun .. 6=Dom** (ovunque: viz, tariffa, test).
- `netCost = buyCost − sellRevenue`. La batteria è già dentro import/export: nessun termine separato.
- Tariffa **singola** condivisa; default placeholder (0.25 acquisto / 0.10 vendita €/kWh).
- Gate UI: `bun build ./web/index.html --outdir /tmp/webbuild` deve compilare; `bun test` verde.
- Spec di riferimento: `docs/specs/2026-06-29-config-sidebar-e-prezzi-fasce-design.md`.

---

## Fase A — Motore costi (core puro)

### Task 1: `tariff.ts` — modello + priceForHour + aggregateCost
**Files:** Create `src/core/economics/tariff.ts`; Test `test/tariff.test.ts`.

**Produces:**
```ts
export interface TariffBand { id: string; name: string; color: string; hours: [number, number][]; days: number[]; buyPrice: number }
export interface Tariff { label: string; bands: TariffBand[]; defaultBuyPrice: number; sellPrice: number }
export interface CostBreakdown { buyCost: number; sellRevenue: number; netCost: number }
export interface MonthlyCost extends CostBreakdown { month: number }
export interface CostResult { annual: CostBreakdown; monthly: MonthlyCost[] }
export function hourInBand(localHour: number, hours: [number, number][]): boolean
export function priceForHour(tariff: Tariff, localHour: number, weekday: number): number
export function aggregateCost(importKwh: readonly number[], exportKwh: readonly number[], localHour: readonly number[], weekday: readonly number[], months: readonly number[], tariff: Tariff): CostResult
```

- [ ] **Step 1: test** (`test/tariff.test.ts`)
```ts
import { expect, test } from "bun:test";
import { aggregateCost, hourInBand, priceForHour, type Tariff } from "../src/core/economics/tariff.ts";

const T: Tariff = {
  label: "test",
  bands: [
    { id: "day", name: "giorno", color: "#f00", hours: [[8, 20]], days: [0, 1, 2, 3, 4], buyPrice: 0.30 },
    { id: "night", name: "notte", color: "#00f", hours: [[20, 8]], days: [0, 1, 2, 3, 4, 5, 6], buyPrice: 0.10 },
  ],
  defaultBuyPrice: 0.20,
  sellPrice: 0.10,
};

test("hourInBand handles normal and wrapping ranges", () => {
  expect(hourInBand(10, [[8, 20]])).toBe(true);
  expect(hourInBand(20, [[8, 20]])).toBe(false); // end exclusive
  expect(hourInBand(2, [[20, 8]])).toBe(true);   // wrap past midnight
  expect(hourInBand(12, [[20, 8]])).toBe(false);
});

test("priceForHour: first matching band wins, else default", () => {
  expect(priceForHour(T, 10, 2)).toBe(0.30);  // weekday daytime
  expect(priceForHour(T, 23, 2)).toBe(0.10);  // weekday night
  expect(priceForHour(T, 10, 6)).toBe(0.20);  // sunday daytime → no band → default
  expect(priceForHour(T, 3, 6)).toBe(0.10);   // sunday night → night band (all days)
});

test("aggregateCost: buy banded, sell flat, net = buy - sell, annual = sum months", () => {
  const imp = [1, 0]; const exp = [0, 2];
  const lh = [10, 11]; const wd = [2, 2]; const mo = [1, 2];
  const r = aggregateCost(imp, exp, lh, wd, mo, T);
  expect(r.annual.buyCost).toBeCloseTo(0.30, 9);      // 1 kWh @ 0.30
  expect(r.annual.sellRevenue).toBeCloseTo(0.20, 9);  // 2 kWh @ 0.10
  expect(r.annual.netCost).toBeCloseTo(0.10, 9);
  const sumMonthNet = r.monthly.reduce((s, m) => s + m.netCost, 0);
  expect(sumMonthNet).toBeCloseTo(r.annual.netCost, 9);
  expect(r.monthly.length).toBe(12);
});
```
- [ ] **Step 2:** run `bun test test/tariff.test.ts` → FAIL (module missing).
- [ ] **Step 3: implement** `src/core/economics/tariff.ts`
```ts
import { MONTHS } from "../units.ts";

export interface TariffBand { id: string; name: string; color: string; hours: [number, number][]; days: number[]; buyPrice: number }
export interface Tariff { label: string; bands: TariffBand[]; defaultBuyPrice: number; sellPrice: number }
export interface CostBreakdown { buyCost: number; sellRevenue: number; netCost: number }
export interface MonthlyCost extends CostBreakdown { month: number }
export interface CostResult { annual: CostBreakdown; monthly: MonthlyCost[] }

export function hourInBand(localHour: number, hours: [number, number][]): boolean {
  for (const [from, to] of hours) {
    if (from < to) {
      if (localHour >= from && localHour < to) return true;
    } else if (localHour >= from || localHour < to) {
      return true; // wraps past midnight
    }
  }
  return false;
}

export function priceForHour(tariff: Tariff, localHour: number, weekday: number): number {
  for (const b of tariff.bands) {
    if (b.days.includes(weekday) && hourInBand(localHour, b.hours)) return b.buyPrice;
  }
  return tariff.defaultBuyPrice;
}

export function aggregateCost(
  importKwh: readonly number[],
  exportKwh: readonly number[],
  localHour: readonly number[],
  weekday: readonly number[],
  months: readonly number[],
  tariff: Tariff,
): CostResult {
  const buy = new Array<number>(MONTHS).fill(0);
  const sell = new Array<number>(MONTHS).fill(0);
  for (let i = 0; i < importKwh.length; i++) {
    const m = months[i];
    if (m === undefined || m < 1 || m > MONTHS) continue;
    const k = m - 1;
    const p = priceForHour(tariff, localHour[i] ?? 0, weekday[i] ?? 0);
    buy[k] = (buy[k] ?? 0) + (importKwh[i] ?? 0) * p;
    sell[k] = (sell[k] ?? 0) + (exportKwh[i] ?? 0) * tariff.sellPrice;
  }
  const monthly: MonthlyCost[] = Array.from({ length: MONTHS }, (_, k) => {
    const b = buy[k] ?? 0;
    const s = sell[k] ?? 0;
    return { month: k + 1, buyCost: b, sellRevenue: s, netCost: b - s };
  });
  const annual = monthly.reduce<CostBreakdown>(
    (acc, m) => ({ buyCost: acc.buyCost + m.buyCost, sellRevenue: acc.sellRevenue + m.sellRevenue, netCost: acc.netCost + m.netCost }),
    { buyCost: 0, sellRevenue: 0, netCost: 0 },
  );
  return { annual, monthly };
}
```
- [ ] **Step 4:** run `bun test test/tariff.test.ts` → PASS.
- [ ] **Step 5: commit** `feat(core): time-of-use tariff cost engine`.

---

## Fase B — Dati

### Task 2: viz.json + `hourly.localHour`/`weekday`
**Files:** Modify `src/export/writeVizJson.ts`, `web/src/types.ts`, `test/vizExport.test.ts`; regen `web/viz.json`.

**Produces:** `viz.hourly.localHour: number[]`, `viz.hourly.weekday: number[]` (0=Lun..6=Dom, DST-corretti).

- [ ] **Step 1:** in `writeVizJson.ts`, add a helper near the top:
```ts
const ROME = "Europe/Rome";
function localHourWeekday(tsUtc: number): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME, hour: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(new Date(tsUtc));
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const wdShort = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return { hour: hh, weekday: map[wdShort] ?? 0 };
}
```
- [ ] **Step 2:** in the `hourly` object of the viz, add (after `months`):
```ts
      localHour: base.timestampsUtc.map((t) => localHourWeekday(t).hour),
      weekday: base.timestampsUtc.map((t) => localHourWeekday(t).weekday),
```
- [ ] **Step 3:** in `web/src/types.ts`, add to `Hourly`:
```ts
  localHour: number[];
  weekday: number[];
```
- [ ] **Step 4:** extend `test/vizExport.test.ts`: assert `v.hourly.localHour.length === 8760`, `v.hourly.weekday` values in `0..6`, and a spot check that `Math.max(...localHour) <= 23`.
- [ ] **Step 5:** add `localHour: [], weekday: []` to the `makeHourly` fixture in `test/webLib.test.ts` (keep types valid).
- [ ] **Step 6:** run `bun test` (green) and `bun run analysis` (regenerate viz.json).
- [ ] **Step 7: commit** `feat(viz): per-hour local hour + weekday for tariff pricing`.

---

## Fase C — Web lib tariffa

### Task 3: `tariffPresets.ts` (default, monorario, F1/F2/F3, serialize/parse/validate)
**Files:** Create `web/src/lib/tariffPresets.ts`; Test `test/tariffPresets.test.ts`.

**Consumes:** `Tariff`, `TariffBand` from `../../../src/core/economics/tariff.ts`.
**Produces:** `defaultTariff()`, `monorarioTariff(buy, sell)`, `f1f2f3Tariff()`, `serializeTariff(t)`, `parseTariff(text)`, `validateTariff(t): string|null`.

- [ ] **Step 1: test** (`test/tariffPresets.test.ts`)
```ts
import { expect, test } from "bun:test";
import { priceForHour } from "../src/core/economics/tariff.ts";
import { defaultTariff, f1f2f3Tariff, parseTariff, serializeTariff, validateTariff } from "../web/src/lib/tariffPresets.ts";

test("default tariff is monorario (default price everywhere)", () => {
  const t = defaultTariff();
  expect(t.bands.length).toBe(0);
  expect(priceForHour(t, 3, 6)).toBe(t.defaultBuyPrice);
});

test("F1/F2/F3 preset prices the canonical slots", () => {
  const t = f1f2f3Tariff();
  expect(priceForHour(t, 10, 2)).toBe(t.bands.find((b) => b.name === "F1")!.buyPrice); // Wed 10:00 = F1
  expect(priceForHour(t, 20, 0)).toBe(t.bands.find((b) => b.name === "F2")!.buyPrice); // Mon 20:00 = F2
  expect(priceForHour(t, 21, 5)).toBe(t.bands.find((b) => b.name === "F2")!.buyPrice); // Sat 21:00 = F2
  expect(priceForHour(t, 3, 6)).toBe(t.defaultBuyPrice);                               // Sun night = F3
});

test("serialize → parse round-trips and validate passes", () => {
  const t = f1f2f3Tariff();
  const back = parseTariff(serializeTariff(t));
  expect(back.bands.length).toBe(t.bands.length);
  expect(validateTariff(back)).toBeNull();
  expect(validateTariff({ ...t, defaultBuyPrice: -1 })).toContain("default");
});
```
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: implement** `web/src/lib/tariffPresets.ts`
```ts
import type { Tariff, TariffBand } from "../../../src/core/economics/tariff.ts";

const WEEKDAYS = [0, 1, 2, 3, 4];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function defaultTariff(): Tariff {
  return { label: "Monorario", bands: [], defaultBuyPrice: 0.25, sellPrice: 0.10 };
}

export function monorarioTariff(buyPrice: number, sellPrice: number): Tariff {
  return { label: "Monorario", bands: [], defaultBuyPrice: buyPrice, sellPrice };
}

export function f1f2f3Tariff(): Tariff {
  const bands: TariffBand[] = [
    { id: "f1", name: "F1", color: "#dc2626", hours: [[8, 19]], days: WEEKDAYS, buyPrice: 0.28 },
    { id: "f2w", name: "F2", color: "#f59e0b", hours: [[7, 8], [19, 23]], days: WEEKDAYS, buyPrice: 0.26 },
    { id: "f2sat", name: "F2", color: "#f59e0b", hours: [[7, 23]], days: [5], buyPrice: 0.26 },
  ];
  return { label: "F1/F2/F3", bands, defaultBuyPrice: 0.22, sellPrice: 0.10 }; // default = F3
}

export function serializeTariff(t: Tariff): string {
  return JSON.stringify(t, null, 2);
}

function reqNumber(v: unknown, ctx: string): number {
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`Tariffa non valida: ${ctx} deve essere un numero.`);
  return v;
}

export function parseTariff(text: string): Tariff {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("File non valido: JSON non leggibile."); }
  if (typeof raw !== "object" || raw === null) throw new Error("Tariffa non valida: atteso un oggetto.");
  const o = raw as Record<string, unknown>;
  const bandsRaw = Array.isArray(o["bands"]) ? o["bands"] : [];
  const bands: TariffBand[] = bandsRaw.map((b, i) => {
    const bo = (b ?? {}) as Record<string, unknown>;
    const hoursRaw = Array.isArray(bo["hours"]) ? bo["hours"] : [];
    return {
      id: typeof bo["id"] === "string" ? bo["id"] : `band${i}`,
      name: typeof bo["name"] === "string" ? bo["name"] : `Fascia ${i + 1}`,
      color: typeof bo["color"] === "string" ? bo["color"] : "#3b82f6",
      hours: hoursRaw.map((h) => [reqNumber((h as number[])[0], `bands[${i}].hours`), reqNumber((h as number[])[1], `bands[${i}].hours`)] as [number, number]),
      days: Array.isArray(bo["days"]) ? (bo["days"] as number[]).map((d) => reqNumber(d, `bands[${i}].days`)) : [],
      buyPrice: reqNumber(bo["buyPrice"], `bands[${i}].buyPrice`),
    };
  });
  return {
    label: typeof o["label"] === "string" ? o["label"] : "Tariffa",
    bands,
    defaultBuyPrice: reqNumber(o["defaultBuyPrice"], "defaultBuyPrice"),
    sellPrice: reqNumber(o["sellPrice"], "sellPrice"),
  };
}

export function validateTariff(t: Tariff): string | null {
  if (t.defaultBuyPrice < 0) return "Il prezzo default non può essere negativo.";
  if (t.sellPrice < 0) return "Il prezzo di vendita non può essere negativo.";
  for (const b of t.bands) {
    if (b.buyPrice < 0) return `Fascia "${b.name}": prezzo negativo.`;
    for (const [from, to] of b.hours) {
      if (from < 0 || from > 24 || to < 0 || to > 24) return `Fascia "${b.name}": ore fuori 0–24.`;
    }
  }
  return null;
}
```
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: commit** `feat(web): tariff presets (monorario, F1/F2/F3) + serialize/validate`.

### Task 4: `viewCosts.ts` (costi per scenario da viz / SystemResult)
**Files:** Create `web/src/lib/viewCosts.ts`; Test `test/viewCosts.test.ts`.

**Consumes:** `Viz` (`web/src/types.ts`), `SystemResult` (core), `aggregateCost`/`Tariff`/`CostResult` (core).
**Produces:**
```ts
export function scenarioCost(viz: Viz, scenario: "con" | "senza", tariff: Tariff): CostResult
export function systemCost(viz: Viz, r: SystemResult, tariff: Tariff): CostResult
export function batterySavingEur(viz: Viz, tariff: Tariff): number // netto(senza) - netto(con)
```

- [ ] **Step 1: test** (`test/viewCosts.test.ts`) — build a tiny `Viz` (2 hours) with `hourly.{loadKwh,localHour,weekday,months,nb,wb,...}`, a monorario tariff, assert `scenarioCost(...).annual.buyCost === Σ import × price` and `batterySavingEur = net(senza)-net(con)`.
```ts
import { expect, test } from "bun:test";
import type { Viz } from "../web/src/types.ts";
import { monorarioTariff } from "../web/src/lib/tariffPresets.ts";
import { batterySavingEur, scenarioCost } from "../web/src/lib/viewCosts.ts";

function vizFixture(): Viz {
  return {
    hourly: {
      months: [1, 1], localHour: [3, 14], weekday: [2, 2],
      nb: { importKwh: [2, 0], exportKwh: [0, 4], selfConsumedKwh: [0, 0] },
      wb: { importKwh: [1, 0], exportKwh: [0, 3], selfConsumedKwh: [0, 0] },
    },
  } as unknown as Viz;
}

test("scenarioCost prices the chosen scenario's flows", () => {
  const t = monorarioTariff(0.30, 0.10);
  const c = scenarioCost(vizFixture(), "senza", t);
  expect(c.annual.buyCost).toBeCloseTo(0.60, 9);     // 2 kWh × 0.30
  expect(c.annual.sellRevenue).toBeCloseTo(0.40, 9); // 4 kWh × 0.10
  expect(c.annual.netCost).toBeCloseTo(0.20, 9);
});

test("batterySavingEur = net(senza) - net(con)", () => {
  const t = monorarioTariff(0.30, 0.10);
  const v = vizFixture();
  const senza = scenarioCost(v, "senza", t).annual.netCost; // 0.20
  const con = scenarioCost(v, "con", t).annual.netCost;     // 1×0.30 - 3×0.10 = 0.0
  expect(batterySavingEur(v, t)).toBeCloseTo(senza - con, 9);
});
```
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: implement** `web/src/lib/viewCosts.ts`
```ts
import type { Viz } from "../types.ts";
import type { SystemResult } from "../../../src/core/comparison/computeSystem.ts";
import { aggregateCost, type CostResult, type Tariff } from "../../../src/core/economics/tariff.ts";

export function scenarioCost(viz: Viz, scenario: "con" | "senza", tariff: Tariff): CostResult {
  const s = scenario === "con" ? viz.hourly.wb : viz.hourly.nb;
  return aggregateCost(s.importKwh, s.exportKwh, viz.hourly.localHour, viz.hourly.weekday, viz.hourly.months, tariff);
}

export function systemCost(viz: Viz, r: SystemResult, tariff: Tariff): CostResult {
  return aggregateCost(r.hourly.importKwh, r.hourly.exportKwh, viz.hourly.localHour, viz.hourly.weekday, viz.hourly.months, tariff);
}

export function batterySavingEur(viz: Viz, tariff: Tariff): number {
  return scenarioCost(viz, "senza", tariff).annual.netCost - scenarioCost(viz, "con", tariff).annual.netCost;
}
```
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: commit** `feat(web): per-scenario cost helpers from viz/SystemResult`.

---

## Fase D — Primitive UI

### Task 5: `NumberField.tsx` (slider + input sincronizzati)
**Files:** Create `web/src/components/NumberField.tsx`.
**Produces:** `NumberField({ label, value, onChange, min, max, step, unit? })`.
- [ ] **Step 1:** implement controlled component: a `<label>` + `<input type="range">` + `<input type="number">` bound to the same `value`, both calling `onChange(Number(e.target.value))`; show `{value}{unit}`.
- [ ] **Step 2:** verify `bun build ./web/index.html --outdir /tmp/webbuild` compiles.
- [ ] **Step 3: commit** `feat(web): NumberField slider+input control`.

### Task 6: `CostSummary.tsx` (+ glossario costi)
**Files:** Create `web/src/components/CostSummary.tsx`; Modify `web/src/lib/glossary.ts`.
**Consumes:** `CostResult` (core), `fmt` (format).
**Produces:** `CostSummary({ cost: CostResult, savingEur? : number })` rendering acquisto · vendita · netto (+ risparmio batteria se passato), euro formattati `fmt(v,2)` + " €".
- [ ] **Step 1:** add glossary entries `costo`, `ricavo`, `nettoCosto`, `risparmioBatteria` (term/desc/formula) to `glossary.ts`.
- [ ] **Step 2:** implement `CostSummary` reusing `.day-summary`/`.kpi` styling with `InfoTip` keys.
- [ ] **Step 3:** verify build compiles.
- [ ] **Step 4: commit** `feat(web): CostSummary block + cost glossary`.

---

## Fase E — Sidebar + editor (refactor layout)

### Task 7: `SystemBEditor.tsx` (estratto da ConfigPage, con NumberField)
**Files:** Create `web/src/components/SystemBEditor.tsx`.
**Consumes:** `systemConfig.ts` helpers, `NumberField`, `ImportModal`.
**Produces:** `SystemBEditor({ viz, systemB, setSystemB })` — stessa logica di `ConfigPage` (Sistema A read-only sintetico + B editabile: falde pannelli/Wp, acCap, batteria totale + % utile, round-trip, Copia/Esporta/Importa), ma compatta per sidebar e con `NumberField`.
- [ ] **Step 1:** implement (port `ConfigPage` body; numerics via `NumberField`).
- [ ] **Step 2:** build compiles.
- [ ] **Step 3: commit** `feat(web): SystemBEditor for the sidebar`.

### Task 8: `TariffEditor.tsx`
**Files:** Create `web/src/components/TariffEditor.tsx`.
**Consumes:** `Tariff`/`TariffBand` (core), `tariffPresets.ts`, `NumberField`, `ImportModal`.
**Produces:** `TariffEditor({ tariff, setTariff })` — preset buttons (Monorario / F1·F2·F3), `defaultBuyPrice` + `sellPrice` via NumberField, lista bande editabili (nome, colore, intervallo orario from/to, caselle giorni Lun..Dom, buyPrice), aggiungi/rimuovi banda, Esporta/Importa tariffa.
- [ ] **Step 1:** implement; day checkboxes map `["L","M","M","G","V","S","D"]` → indices 0..6.
- [ ] **Step 2:** build compiles.
- [ ] **Step 3: commit** `feat(web): TariffEditor (bands, presets, import/export)`.

### Task 9: `Sidebar.tsx` + import tariffa nel modale
**Files:** Create `web/src/components/Sidebar.tsx`; Modify `web/src/components/ImportModal.tsx`.
**Produces:** `Sidebar({ viz, systemB, setSystemB, tariff, setTariff, collapsed, onToggle })` — shell con toggle ‹/› (collasso intero), due sezioni collassabili (Tariffa→`TariffEditor`, Sistema B→`SystemBEditor`).
- [ ] **Step 1:** generalize `ImportModal` to accept a `parse`/`validate`/`title` (so it serves both Sistema B and Tariffa), keeping the System-B call site working.
- [ ] **Step 2:** implement `Sidebar` with section collapse state + whole-sidebar collapse (driven by props).
- [ ] **Step 3:** build compiles.
- [ ] **Step 4: commit** `feat(web): collapsible global Sidebar + generic ImportModal`.

### Task 10: `App.tsx` layout + stato tariffa; rimuovi ConfigPage; CSS
**Files:** Modify `web/src/App.tsx`, `web/src/styles.css`, `web/src/types.ts` (Tab); Delete `web/src/components/ConfigPage.tsx`.
- [ ] **Step 1:** App: add `tariff` state (`loadTariff()` from localStorage `"tariff"`, fallback `defaultTariff()`; persist via effect) + `sidebarCollapsed` state (persist). Render `<div class="layout">` = `<Sidebar/>` + `<div class="main">` (tabs + view).
- [ ] **Step 2:** `Tab` type: drop `"config"`; TABS = annuale, mensile, giorno, confronto, glossario. Remove ConfigPage import/branch; delete the file.
- [ ] **Step 3:** CSS: `.layout` (flex), `.sidebar`/`.sidebar.collapsed`, `.sidebar-toggle`, `.sidebar-section`, `.number-field` (range+input row), `.cost-summary`. Responsive: stack under a max-width.
- [ ] **Step 4:** build compiles; `bun test` green.
- [ ] **Step 5: commit** `feat(web): sidebar layout + shared tariff state; remove config tab`.

---

## Fase F — Costi nelle view + fix

### Task 11: CostSummary in annuale / mensile / giornaliero
**Files:** Modify `AnnualOverview.tsx`, `MonthlyView.tsx`, `DailyExplorer.tsx`, `App.tsx` (pass `tariff`).
- [ ] **Step 1:** thread `tariff` prop into the three views.
- [ ] **Step 2:** AnnualOverview: `scenarioCost(viz,"con",tariff)`/`"senza"` → show net both + `batterySavingEur` highlight via `CostSummary`.
- [ ] **Step 3:** DailyExplorer: cost of the selected day+scenario (sum `priceForHour` over the 24h slice) in the day summary.
- [ ] **Step 4:** MonthlyView: `CostSummary` with annual + net €/mese text from `CostResult.monthly`.
- [ ] **Step 5:** build compiles; commit `feat(web): show energy costs in annual/monthly/daily views`.

### Task 12: costi nel Confronto (KpiTable + ComparePage)
**Files:** Modify `KpiTable.tsx`, `ComparePage.tsx`, `App.tsx` (pass `tariff` to ComparePage).
- [ ] **Step 1:** ComparePage computes `systemCost(viz,a,tariff)` and `systemCost(viz,b,tariff)`, passes to `KpiTable`.
- [ ] **Step 2:** KpiTable: add rows **spesa acquisto**, **ricavo vendita**, **netto €/anno** (A | B | Δ), euro-formatted, `Δ = B − A`.
- [ ] **Step 3:** build compiles; commit `feat(web): cost rows in the comparison KPI table`.

### Task 13: fix area nel CompareDayChart
**Files:** Modify `web/src/components/CompareDayChart.tsx`.
- [ ] **Step 1:** replace the `selfA`/`selfB` `<Line>` with `<Area>` (A filled `fillOpacity≈0.45`; B filled lighter or dashed stroke) like `PowerChart`; keep prod/SoC as lines. Import `Area` from recharts.
- [ ] **Step 2:** build compiles; commit `fix(web): comparison day chart draws coverage as filled area`.

---

## Fase G — Docs

### Task 14: doc calcoli costi + indice
**Files:** Create `docs/05-costi-fasce.md`; Modify `docs/index.md`.
- [ ] **Step 1:** write `docs/05-costi-fasce.md` (frontmatter standard): modello tariffa, priceForHour, netto = acquisto−vendita, risparmio = diff scenari, localHour/weekday, dove sono mostrati i costi.
- [ ] **Step 2:** add it to the docs index; commit `docs: time-of-use cost calculations`.

---

## Self-review (coverage vs spec)
- Tariff model + presets → T1, T3. Cost engine (net, banded buy, flat sell) → T1. Battery saving via diff → T4/T11. viz localHour/weekday (DST) → T2. Costs in all views → T11/T12. Sidebar global + whole-collapse + sliders → T5/T7/T8/T9/T10. Remove config tab → T10. Area fix → T13. Docs → T14. Tests: T1/T3/T4 unit; UI = build + manual. No placeholders; types (`Tariff`, `CostResult`, `weekday 0=Lun`) consistent across tasks.
