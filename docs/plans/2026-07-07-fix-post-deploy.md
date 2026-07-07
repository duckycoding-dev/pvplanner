# Fix post-deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sei correzioni post-deploy: quick-pick max-clipping nella vista confronto, digitazione nomi lenta, wizard consumi «Salta/Fine», reset incentivi al cambio tab, tetto AC seed 6 kW, wizard senza campi potenza.

**Architecture:** Solo webapp (`web/src/`), nessuna modifica al motore (`src/core/`). Spec: `docs/specs/2026-07-07-fix-post-deploy-design.md`. Ogni task è indipendente e committa da solo.

**Tech Stack:** TypeScript + Bun, React 19, Recharts. Test: `bun test` (niente DOM: la logica testabile va estratta in funzioni pure in `web/src/lib/`).

## Global Constraints

- Lavorare sul branch `fix/post-deploy` (creato dal task 1); squash a fine lavoro.
- MAI trailer `Co-Authored-By` o firme AI nei commit (regola del repo).
- i18n: ogni chiave aggiunta/rimossa va applicata a ENTRAMBI `web/src/i18n/it.ts` e `web/src/i18n/en.ts` (il test di parità fallisce altrimenti).
- Commenti e copy in italiano come il codice circostante; placeholder i18n in formato `{nome}`.
- Nessun LLM a runtime; solo modelli deterministici (regola del repo, qui non toccata ma vincolante).

---

### Task 1: Incentivi — reset ai default al cambio tab

**Files:**
- Modify: `web/src/lib/economics.ts` (dopo `defaultIncentive`, ~riga 10)
- Modify: `web/src/components/IncentiveEditor.tsx:11-16`
- Test: `test/economics.test.ts` (append)

**Interfaces:**
- Produces: `incentiveForMode(cur: Incentive, mode: "percent" | "fixed"): Incentive` esportata da `web/src/lib/economics.ts`.

- [ ] **Step 1: Crea il branch**

```bash
git checkout -b fix/post-deploy
```

- [ ] **Step 2: Scrivi il test che fallisce**

Append a `test/economics.test.ts` (aggiungi l'import in testa al file se `incentiveForMode` non è già importato; il file potrebbe importare da altri moduli — aggiungi una riga import separata):

```ts
import { incentiveForMode } from "../web/src/lib/economics.ts";

test("incentiveForMode: cambio tab → default del modo, niente carry-over", () => {
  const p = incentiveForMode({ mode: "fixed", value: 4500, years: 10 }, "percent");
  expect(p).toEqual({ mode: "percent", value: 50, years: 10 });
  const f = incentiveForMode({ mode: "percent", value: 45, years: 10 }, "fixed");
  expect(f).toEqual({ mode: "fixed", value: 0, years: 10 });
});

test("incentiveForMode: stesso modo → oggetto identico (nessun reset)", () => {
  const cur = { mode: "percent" as const, value: 45, years: 10 };
  expect(incentiveForMode(cur, "percent")).toBe(cur);
});
```

- [ ] **Step 3: Verifica che fallisca**

Run: `bun test test/economics.test.ts`
Expected: FAIL — `incentiveForMode` non esportata.

- [ ] **Step 4: Implementa**

In `web/src/lib/economics.ts`, dopo `defaultIncentive`:

```ts
/** Incentivo dopo il click su una tab modo: se il modo non cambia ritorna l'oggetto
 *  invariato; altrimenti azzera il valore al default del modo (niente carry-over:
 *  45 % non deve diventare 45 €). */
export function incentiveForMode(cur: Incentive, mode: Incentive["mode"]): Incentive {
  if (cur.mode === mode) return cur;
  return { ...cur, mode, value: mode === "percent" ? 50 : 0 };
}
```

- [ ] **Step 5: Verifica che passi**

Run: `bun test test/economics.test.ts`
Expected: PASS

- [ ] **Step 6: Collega l'editor**

In `web/src/components/IncentiveEditor.tsx`: aggiorna l'import (riga 1) e i due onClick (righe 11-16):

```tsx
import { type Incentive, incentiveForMode } from "../lib/economics.ts";
```

```tsx
<button className={incentive.mode === "percent" ? "active" : ""} onClick={() => setIncentive(incentiveForMode(incentive, "percent"))}>
  {t("incentive.percentMode")}
</button>
<button className={incentive.mode === "fixed" ? "active" : ""} onClick={() => setIncentive(incentiveForMode(incentive, "fixed"))}>
  {t("incentive.fixedMode")}
</button>
```

- [ ] **Step 7: Test completo + commit**

Run: `bun test`
Expected: PASS (tutti)

```bash
git add web/src/lib/economics.ts web/src/components/IncentiveEditor.tsx test/economics.test.ts
git commit -m "fix(incentivi): reset al default del modo al cambio tab, niente carry-over"
```

---

### Task 2: Nome sistema — riferimento stabile (niente ricalcolo per keystroke)

**Files:**
- Modify: `web/src/lib/systemConfig.ts` (dopo `equalsSystems`, ~riga 66)
- Create: `web/src/lib/useStableSystem.ts`
- Modify: `web/src/App.tsx:201` (memo `deriveMonoViz`)
- Modify: `web/src/components/ComparePage.tsx:74-85` (memo `caseA`/`caseB`)
- Test: `test/systemConfig.test.ts` (append)

**Interfaces:**
- Consumes: `equalsSystems` (già in `systemConfig.ts`, ignora `label`).
- Produces: `keepIfEquivalent(prev: SystemConfigB, next: SystemConfigB): SystemConfigB` da `systemConfig.ts`; hook `useStableSystem(system: SystemConfigB): SystemConfigB` da `web/src/lib/useStableSystem.ts`.

- [ ] **Step 1: Scrivi il test che fallisce**

Append a `test/systemConfig.test.ts` (aggiungi `keepIfEquivalent` all'import esistente da `../web/src/lib/systemConfig.ts`; se il file non ha già un maker di `SystemConfigB`, usa questo):

```ts
function makeCfg(): SystemConfigB {
  return {
    label: "Sistema A",
    falde: [{ id: "sud", azimuth: 0, panelCount: 10, wp: 450 }],
    acCapKw: 6,
    batteryTotalKwh: 10,
    batteryUsablePct: 90,
    roundTrip: 0.9,
    coupling: "dc",
    installationCostEur: 15000,
  };
}

test("keepIfEquivalent: cambia solo la label → mantiene il riferimento precedente", () => {
  const prev = makeCfg();
  const next = { ...prev, label: "Nuovo nome" };
  expect(keepIfEquivalent(prev, next)).toBe(prev);
});

test("keepIfEquivalent: cambia un campo computazionale → ritorna il nuovo", () => {
  const prev = makeCfg();
  const next = { ...prev, acCapKw: 7 };
  expect(keepIfEquivalent(prev, next)).toBe(next);
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `bun test test/systemConfig.test.ts`
Expected: FAIL — `keepIfEquivalent` non esportata.

- [ ] **Step 3: Implementa la funzione pura**

In `web/src/lib/systemConfig.ts`, dopo `equalsSystems`:

```ts
/** Mantiene `prev` se `next` è computazionalmente equivalente (equalsSystems ignora
 *  la label): usato per non far ripartire i memo costosi digitando il nome. */
export function keepIfEquivalent(prev: SystemConfigB, next: SystemConfigB): SystemConfigB {
  return prev !== next && equalsSystems(prev, next) ? prev : next;
}
```

Run: `bun test test/systemConfig.test.ts` → PASS

- [ ] **Step 4: Crea l'hook**

Create `web/src/lib/useStableSystem.ts`:

```ts
import { useRef } from "react";
import { keepIfEquivalent, type SystemConfigB } from "./systemConfig.ts";

/**
 * Versione a riferimento stabile di un SystemConfigB: il riferimento cambia solo
 * quando cambia un campo computazionale (la label è ignorata). Da usare come
 * dipendenza dei memo costosi (deriveMonoViz, runSystem): digitare il nome non
 * deve rilanciare la simulazione. La label va letta dall'oggetto originale.
 */
export function useStableSystem(system: SystemConfigB): SystemConfigB {
  const ref = useRef(system);
  ref.current = keepIfEquivalent(ref.current, system);
  return ref.current;
}
```

- [ ] **Step 5: Collega App.tsx**

In `web/src/App.tsx`: aggiungi l'import e sostituisci la riga 201.

```ts
import { useStableSystem } from "./lib/useStableSystem.ts";
```

```ts
// Mono views (annual/monthly/daily) follow System A, recomputed live.
// stableSystemA: la label non è computazionale → digitare il nome non ricalcola.
const stableSystemA = useStableSystem(systemA);
const { vizA, hasBattery } = useMemo(() => deriveMonoViz(activeViz, stableSystemA), [activeViz, stableSystemA]);
```

- [ ] **Step 6: Collega ComparePage.tsx**

In `web/src/components/ComparePage.tsx`: aggiungi l'import e sostituisci i memo `caseA`/`caseB` (righe 78-85). `noPv`, `bDiffers`, label e specs restano sull'oggetto originale.

```ts
import { useStableSystem } from "../lib/useStableSystem.ts";
```

```ts
const stableA = useStableSystem(systemA);
const stableB = useStableSystem(systemB);
const caseA = useMemo<Case>(() => {
  const r = runSystem(stableA, viz);
  return { r, c: systemCost(viz, r, tariff) };
}, [stableA, viz, tariff]);
const caseB = useMemo<Case>(() => {
  const r = runSystem(stableB, viz);
  return { r, c: systemCost(viz, r, tariff) };
}, [stableB, viz, tariff]);
```

- [ ] **Step 7: Test completo + verifica manuale + commit**

Run: `bun test` → PASS

Verifica manuale: `bun run web`, apri il menu (tasto «m»), digita velocemente nel campo nome di Sistema A → nessun lag; cambia un campo numerico → i grafici si aggiornano ancora.

```bash
git add web/src/lib/systemConfig.ts web/src/lib/useStableSystem.ts web/src/App.tsx web/src/components/ComparePage.tsx test/systemConfig.test.ts
git commit -m "perf(sistemi): riferimento stabile per i memo, digitare il nome non ricalcola"
```

---

### Task 3: Quick-pick confronto da serie per-sistema + bottone disabilitato + linee tetto AC

**Files:**
- Modify: `web/src/lib/quickPickDays.ts`
- Modify: `web/src/components/CompareDayChart.tsx`
- Modify: `web/src/components/ComparePage.tsx:153-161` (call site)
- Modify: `web/src/components/DailyExplorer.tsx:36-37,122-123`
- Modify: `web/src/i18n/it.ts` + `web/src/i18n/en.ts` (nuova chiave `compare.acCeilingLabel`)
- Modify: `test/webLib.test.ts` (test esistente su `maxClipping`)
- Test: `test/quickPickDays.test.ts` (nuovo)

**Interfaces:**
- Consumes: `SystemResult` (`src/core/comparison/computeSystem.ts`), con `production.hourly.practicalKwh` e `production.hourly.clippingLossKwh` (number[], 8760).
- Produces: `quickPickDays(h: QuickPickSeries): QuickPicks` con `QuickPicks.maxClipping: number | null` (null ⇒ nessun clipping nell'anno); `combineSeries(a: readonly number[], b: readonly number[]): number[]` — entrambe da `web/src/lib/quickPickDays.ts`. `CompareDayChart` acquisisce le prop `acCapA: number` e `acCapB: number`.

- [ ] **Step 1: Scrivi i test che falliscono**

Create `test/quickPickDays.test.ts`:

```ts
import { expect, test } from "bun:test";
import { combineSeries, quickPickDays } from "../web/src/lib/quickPickDays.ts";

/** Serie oraria di `days` giorni con i totali giornalieri dati (tutto nella prima ora). */
function hourlyFromDaily(daily: number[]): number[] {
  const out = new Array<number>(daily.length * 24).fill(0);
  daily.forEach((v, d) => {
    out[d * 24] = v;
  });
  return out;
}

test("maxClipping è null quando il clipping è zero tutto l'anno (bottone da disabilitare)", () => {
  const picks = quickPickDays({
    productionPracticalKwh: hourlyFromDaily([1, 2, 3]),
    clippingKwh: hourlyFromDaily([0, 0, 0]),
  });
  expect(picks.maxClipping).toBeNull();
  expect(picks.maxProduction).toBe(2);
  expect(picks.minProduction).toBe(0);
});

test("maxClipping trova il giorno col clipping massimo", () => {
  const picks = quickPickDays({
    productionPracticalKwh: hourlyFromDaily([1, 1, 1]),
    clippingKwh: hourlyFromDaily([0, 0.5, 0.2]),
  });
  expect(picks.maxClipping).toBe(1);
});

test("combineSeries somma elemento per elemento (lunghezze diverse tollerate)", () => {
  expect(combineSeries([1, 2, 3], [10, 20])).toEqual([11, 22, 3]);
});

test("scenario confronto: baseline senza clipping ma A+B clippano → giorno giusto, non 0", () => {
  // Riproduce il bug: la baseline ha clipping zero (→ prima era sempre giorno 0);
  // le serie per-sistema clippano al giorno 2.
  const clipA = hourlyFromDaily([0, 0, 0.4]);
  const clipB = hourlyFromDaily([0, 0, 0.1]);
  const prod = hourlyFromDaily([1, 1, 1]);
  const picks = quickPickDays({
    productionPracticalKwh: combineSeries(prod, prod),
    clippingKwh: combineSeries(clipA, clipB),
  });
  expect(picks.maxClipping).toBe(2);
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `bun test test/quickPickDays.test.ts`
Expected: FAIL — `combineSeries` non esportata; `maxClipping` è 0 e non null.

- [ ] **Step 3: Implementa quickPickDays**

Sostituisci in `web/src/lib/quickPickDays.ts` l'interfaccia, la firma e aggiungi `combineSeries` (le helper `dailySums`/`argmax`/`argmin` restano invariate; rimuovi l'import di `Hourly` che non serve più):

```ts
/** Le due serie orarie (8760) da cui derivano i quick-pick. `Hourly` le soddisfa
 *  strutturalmente; la vista confronto passa le serie per-sistema combinate. */
export interface QuickPickSeries {
  productionPracticalKwh: number[];
  clippingKwh: number[];
}

export interface QuickPicks {
  /** null ⇒ nessun clipping in tutto l'anno: il bottone va disabilitato
   *  (l'argmax su una serie di zeri punterebbe al 1° gennaio). */
  maxClipping: number | null;
  maxProduction: number;
  minProduction: number;
}

/** Day indices for handy jump-to days. */
export function quickPickDays(h: QuickPickSeries): QuickPicks {
  const days = Math.floor(h.productionPracticalKwh.length / 24);
  const clip = dailySums(h.clippingKwh, days);
  const prod = dailySums(h.productionPracticalKwh, days);
  const hasClip = clip.some((v) => v > 0);
  return {
    maxClipping: hasClip ? argmax(clip) : null,
    maxProduction: argmax(prod),
    minProduction: argmin(prod),
  };
}

/** Somma elemento per elemento (serie A+B della vista confronto). */
export function combineSeries(a: readonly number[], b: readonly number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}
```

Run: `bun test test/quickPickDays.test.ts` → PASS

- [ ] **Step 4: Aggiorna il test esistente in webLib.test.ts**

Il test `quickPickDays finds max-clipping and max-production days` continua a passare (passa un `Hourly`, strutturalmente compatibile). Aggiungici un'asserzione per il caso null se non coperta: nessuna modifica necessaria se `bun test test/webLib.test.ts` passa. Se TypeScript segnala l'assegnazione `picks.maxClipping` → `toBe(2)`, va bene (number | null confronta ok).

Run: `bun test test/webLib.test.ts`
Expected: PASS

- [ ] **Step 5: CompareDayChart — picks per-sistema, bottone disabilitato, linee tetto AC**

In `web/src/components/CompareDayChart.tsx`:

(a) import (riga 17):

```ts
import { combineSeries, quickPickDays } from "../lib/quickPickDays.ts";
```

(b) prop nuove nella firma (dopo `usableB`):

```tsx
export function CompareDayChart({
  a,
  b,
  viz,
  labelA,
  labelB,
  usableA,
  usableB,
  acCapA,
  acCapB,
}: {
  a: SystemResult;
  b: SystemResult;
  viz: Viz;
  labelA: string;
  labelB: string;
  usableA: number;
  usableB: number;
  acCapA: number;
  acCapB: number;
}) {
```

(c) sostituisci il calcolo dei picks (riga 76) — dalla baseline alle serie per-sistema:

```ts
// Picks dalle serie per-sistema (A+B): la baseline può non clippare mai
// mentre i sistemi configurati sì (fix: puntava sempre al 1° gennaio).
const picks = useMemo(
  () =>
    quickPickDays({
      productionPracticalKwh: combineSeries(a.production.hourly.practicalKwh, b.production.hourly.practicalKwh),
      clippingKwh: combineSeries(a.production.hourly.clippingLossKwh, b.production.hourly.clippingLossKwh),
    }),
  [a, b],
);
```

(d) bottone max clipping (riga 128):

```tsx
<button
  disabled={picks.maxClipping === null}
  onClick={() => {
    if (picks.maxClipping !== null) setDayIndex(picks.maxClipping);
  }}
>
  {t("daily.pickMaxClipping")}
</button>
```

(e) etichette tetto AC, vicino a `capMax` (riga 94):

```ts
const sameAcCap = acCapA === acCapB;
const acLabelA = sameAcCap
  ? t("power.acCeiling", { kw: acCapA })
  : t("compare.acCeilingLabel", { label: labelA, kw: acCapA });
```

(f) ReferenceLine nel grafico principale, dopo le `Line` `prodA`/`prodB` (riga 147; `ReferenceLine` è già importato). Su bucket orari kW ≡ kWh, come in `PowerChart.tsx:107-112`:

```tsx
<ReferenceLine
  y={acCapA}
  stroke="#6b7280"
  strokeDasharray="6 3"
  label={{ value: acLabelA, position: "right", fontSize: 11, fill: "#6b7280" }}
/>
{!sameAcCap && (
  <ReferenceLine
    y={acCapB}
    stroke="#9ca3af"
    strokeDasharray="2 2"
    label={{ value: t("compare.acCeilingLabel", { label: labelB, kw: acCapB }), position: "right", fontSize: 11, fill: "#9ca3af" }}
  />
)}
```

- [ ] **Step 6: Call site e i18n**

In `web/src/components/ComparePage.tsx` (righe 153-161), aggiungi le prop:

```tsx
<CompareDayChart
  a={caseA.r}
  b={caseB.r}
  viz={viz}
  labelA={labelA}
  labelB={labelB}
  usableA={batteryUsableKwh(systemA)}
  usableB={batteryUsableKwh(systemB)}
  acCapA={systemA.acCapKw}
  acCapB={systemB.acCapKw}
/>
```

In `web/src/i18n/it.ts`, accanto a `compare.maxLabel` (riga 428):

```ts
"compare.acCeilingLabel": "tetto AC {label} ({kw} kW)",
```

In `web/src/i18n/en.ts`, accanto a `compare.maxLabel` (riga 427):

```ts
"compare.acCeilingLabel": "AC ceiling {label} ({kw} kW)",
```

- [ ] **Step 7: DailyExplorer — maxClipping nullable**

In `web/src/components/DailyExplorer.tsx`:

(a) stato iniziale (riga 37): senza clipping si parte dal giorno di produzione massima:

```ts
const [dayIndex, setDayIndex] = useState<number>(picks.maxClipping ?? picks.maxProduction);
```

(b) bottone (riga 123):

```tsx
<button
  disabled={picks.maxClipping === null}
  onClick={() => {
    if (picks.maxClipping !== null) setDayIndex(picks.maxClipping);
  }}
>
  {t("daily.pickMaxClipping")}
</button>
```

- [ ] **Step 8: Test completo + verifica manuale + commit**

Run: `bun test` → PASS

Verifica manuale (`bun run web`): vista confronto con un sistema che clippa (alza i kWp di A o abbassa il tetto AC) → «max clipping» salta al giorno giusto (stesso della vista giorno) e nel grafico compare la linea del tetto AC; con tetto alto e zero clipping il bottone è disabilitato in entrambe le viste.

```bash
git add web/src/lib/quickPickDays.ts web/src/components/CompareDayChart.tsx web/src/components/ComparePage.tsx web/src/components/DailyExplorer.tsx web/src/i18n/it.ts web/src/i18n/en.ts test/quickPickDays.test.ts
git commit -m "fix(confronto): quick-pick max clipping dalle serie per-sistema + linee tetto AC"
```

---

### Task 4: Wizard consumi — «Salta» e «Fine» che applica

**Files:**
- Create: `web/src/lib/pendingConsumption.ts`
- Modify: `web/src/components/consumption/ConsumptionEditor.tsx`
- Modify: `web/src/components/consumption/ConsumptionMonthly.tsx:166-168`
- Modify: `web/src/components/consumption/ConsumptionParametric.tsx:124-131`
- Modify: `web/src/components/consumption/ConsumptionCsv.tsx:118-121`
- Modify: `web/src/components/wizard/StepConsumption.tsx`
- Modify: `web/src/components/wizard/SetupWizard.tsx`
- Modify: `web/src/i18n/it.ts` + `web/src/i18n/en.ts`
- Test: `test/pendingConsumption.test.ts` (nuovo)

**Interfaces:**
- Consumes: `expandMonthlyTemplate(template, timestampsUtc, months, timeZone)` (`src/core/consumption/monthlyTemplate.ts`); `parametricConsumption(house: HouseParams, setup: StoredSetup)` (`web/src/lib/parametricConsumption.ts`); `validateCanonical(result, n)` (`src/core/consumption/canonical.ts`); `applyConsumption(setup, spec, result)` (`web/src/lib/applyConsumption.ts`).
- Produces: `buildPendingSetup(setup: StoredSetup, s: PendingConsumptionState): StoredSetup | null` con `PendingConsumptionState = { method: "csv" | "monthly" | "parametric"; template: MonthlyTemplate; house: HouseParams; csv: { filename: string; result: CanonicalConsumption } | null }`. `ConsumptionEditor` acquisisce la prop opzionale `wizard?: { registerGetPending: (get: () => StoredSetup | null) => void }` e `onApply` diventa opzionale. I tre componenti metodo acquisiscono `hideApply?: boolean`.

- [ ] **Step 1: Scrivi i test che falliscono**

Create `test/pendingConsumption.test.ts` (fixture sullo stesso pattern di `test/applyConsumption.test.ts`):

```ts
import { expect, test } from "bun:test";
import { buildPendingSetup, type PendingConsumptionState } from "../web/src/lib/pendingConsumption.ts";
import { HOUSE_DEFAULTS } from "../src/core/consumption/houseLoad.ts";
import type { MonthlyTemplate } from "../src/core/consumption/monthlyTemplate.ts";
import type { CanonicalConsumption } from "../src/core/consumption/canonical.ts";
import type { StoredSetup } from "../web/src/lib/setupTypes.ts";
import type { Viz } from "../web/src/types.ts";

// web/viz.json (personale, gitignored) se esiste, altrimenti il demo tracciato.
const vizFile = Bun.file("web/viz.json");
const baseViz = (await ((await vizFile.exists()) ? vizFile : Bun.file("web/viz.demo.json")).json()) as Viz;

function makeSetup(hourlyT2m: number[] = []): StoredSetup {
  const viz = structuredClone(baseViz);
  return {
    version: 1,
    savedAt: 111,
    inputs: { timeZone: viz.meta.timeZone },
    viz,
    hourlyT2m,
  } as unknown as StoredSetup;
}

const template: MonthlyTemplate = {
  months: Array.from({ length: 12 }, () => ({ dailyKwh: 10, shape: "morningEvening" as const })),
  weekendFactor: 1,
};

function state(p: Partial<PendingConsumptionState>): PendingConsumptionState {
  return { method: "monthly", template, house: HOUSE_DEFAULTS, csv: null, ...p };
}

test("monthly valido → StoredSetup con consumi applicati", () => {
  const setup = makeSetup();
  const out = buildPendingSetup(setup, state({ method: "monthly" }));
  expect(out).not.toBeNull();
  expect(out!.consumption?.spec).toEqual({ method: "monthly", template });
  expect(out!.viz.hourly.loadKwh.some((v) => v > 0)).toBe(true);
});

test("parametric senza hourlyT2m → null (equivale a Salta)", () => {
  const setup = makeSetup([]);
  expect(buildPendingSetup(setup, state({ method: "parametric" }))).toBeNull();
});

test("parametric con T2m → StoredSetup applicato", () => {
  const setup = makeSetup(new Array(baseViz.hourly.loadKwh.length).fill(12));
  const out = buildPendingSetup(setup, state({ method: "parametric" }));
  expect(out).not.toBeNull();
  expect(out!.consumption?.spec).toEqual({ method: "parametric", house: HOUSE_DEFAULTS });
});

test("csv senza file caricato → null", () => {
  expect(buildPendingSetup(makeSetup(), state({ method: "csv", csv: null }))).toBeNull();
});

test("csv con risultato valido → StoredSetup applicato", () => {
  const setup = makeSetup();
  const n = setup.viz.hourly.loadKwh.length;
  const result: CanonicalConsumption = {
    hourlyKwh: new Array(n).fill(0.4),
    meta: { source: "csv", label: "CSV c.csv", annualKwh: 0.4 * n, coveragePct: 100 },
  };
  const out = buildPendingSetup(setup, state({ method: "csv", csv: { filename: "c.csv", result } }));
  expect(out).not.toBeNull();
  expect(out!.consumption?.spec).toEqual({ method: "csv", filename: "c.csv" });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `bun test test/pendingConsumption.test.ts`
Expected: FAIL — modulo inesistente.

- [ ] **Step 3: Implementa buildPendingSetup**

Create `web/src/lib/pendingConsumption.ts`:

```ts
import { expandMonthlyTemplate, type MonthlyTemplate } from "../../../src/core/consumption/monthlyTemplate.ts";
import type { HouseParams } from "../../../src/core/consumption/houseLoad.ts";
import { type CanonicalConsumption, validateCanonical } from "../../../src/core/consumption/canonical.ts";
import { parametricConsumption } from "./parametricConsumption.ts";
import { applyConsumption } from "./applyConsumption.ts";
import type { ConsumptionSpec, StoredSetup } from "./setupTypes.ts";

/** Stato corrente dell'editor consumi (metodo attivo + form dei tre metodi). */
export interface PendingConsumptionState {
  method: "csv" | "monthly" | "parametric";
  template: MonthlyTemplate;
  house: HouseParams;
  csv: { filename: string; result: CanonicalConsumption } | null;
}

/**
 * Candidato «consumi correnti» del wizard: ciò che il bottone «Fine» applica.
 * null = niente di valido da applicare (equivale a «Salta»). Non lancia mai:
 * qualunque errore del modello/validazione degrada a null.
 */
export function buildPendingSetup(setup: StoredSetup, s: PendingConsumptionState): StoredSetup | null {
  try {
    let spec: ConsumptionSpec;
    let result: CanonicalConsumption;
    if (s.method === "monthly") {
      spec = { method: "monthly", template: s.template };
      result = expandMonthlyTemplate(s.template, setup.viz.hourly.timestampsUtc, setup.viz.hourly.months, setup.inputs.timeZone);
    } else if (s.method === "parametric") {
      if (setup.hourlyT2m.length === 0) return null;
      spec = { method: "parametric", house: s.house };
      result = parametricConsumption(s.house, setup);
    } else {
      if (s.csv === null) return null;
      spec = { method: "csv", filename: s.csv.filename };
      result = s.csv.result;
    }
    if (validateCanonical(result, setup.viz.hourly.timestampsUtc.length) !== null) return null;
    return applyConsumption(setup, spec, result);
  } catch {
    return null;
  }
}
```

Nota: verifica la firma reale di `expandMonthlyTemplate` in `src/core/consumption/monthlyTemplate.ts` (stessi argomenti usati in `ConsumptionMonthly.tsx:53`) e di `parametricConsumption` (`ConsumptionParametric.tsx:71`); adegua se differiscono.

Run: `bun test test/pendingConsumption.test.ts` → PASS

- [ ] **Step 4: ConsumptionEditor — modalità wizard**

In `web/src/components/consumption/ConsumptionEditor.tsx`:

(a) import: aggiungi `useEffect` a react e il builder:

```ts
import { useEffect, useState } from "react";
import { buildPendingSetup } from "../../lib/pendingConsumption.ts";
```

(b) firma: `onApply` opzionale + prop `wizard`:

```tsx
export function ConsumptionEditor({
  setup,
  onApply,
  wizard,
}: {
  setup: StoredSetup;
  /** Riceve il NUOVO StoredSetup con i consumi applicati; il chiamante lo salva.
   *  Assente in modalità wizard (i bottoni «Applica» sono nascosti). */
  onApply?: (next: StoredSetup) => void;
  /** Modalità wizard: nasconde «Applica» e registra il getter del candidato
   *  corrente, che il bottone «Fine» del wizard applica. */
  wizard?: { registerGetPending: (get: () => StoredSetup | null) => void };
}) {
```

(c) `apply` chiama l'optional: sostituisci `onApply(applyConsumption(setup, spec, result));` con `onApply?.(applyConsumption(setup, spec, result));`

(d) registrazione del getter (dopo la definizione di `apply`); senza array deps: a ogni render registra la closure sullo stato più recente:

```ts
const hideApply = wizard !== undefined;
useEffect(() => {
  wizard?.registerGetPending(() => buildPendingSetup(setup, { method, template, house, csv }));
});
```

(e) passa `hideApply` ai tre metodi:

```tsx
{method === "csv" && <ConsumptionCsv setup={setup} state={csv} setState={setCsv} apply={apply} hideApply={hideApply} />}
{method === "monthly" && (
  <ConsumptionMonthly setup={setup} template={template} setTemplate={setTemplate} apply={apply} hideApply={hideApply} />
)}
{method === "parametric" && (
  <ConsumptionParametric setup={setup} house={house} setHouse={setHouse} apply={apply} hideApply={hideApply} />
)}
```

- [ ] **Step 5: Nascondi «Applica» nei tre metodi**

In ciascuno dei tre componenti aggiungi la prop `hideApply?: boolean` (in firma e nel tipo delle props) e condiziona il bottone:

`ConsumptionMonthly.tsx` (righe 166-168):

```tsx
{hideApply !== true && (
  <button className="wizard-primary" onClick={() => apply({ method: "monthly", template }, result)}>
    {t("common.apply")}
  </button>
)}
```

`ConsumptionParametric.tsx` (righe 124-131):

```tsx
{preview !== null && (
  <>
    <ConsumptionPreview result={preview} viz={setup.viz} />
    {hideApply !== true && (
      <button className="wizard-primary" onClick={() => apply({ method: "parametric", house }, preview)}>
        {t("common.apply")}
      </button>
    )}
  </>
)}
```

`ConsumptionCsv.tsx` (righe 118-121):

```tsx
<ConsumptionPreview result={state.result} viz={setup.viz} />
{hideApply !== true && (
  <button className="wizard-primary" onClick={() => apply({ method: "csv", filename: state.filename }, state.result)}>
    {t("common.apply")}
  </button>
)}
```

- [ ] **Step 6: StepConsumption — via lo stato «applied», dentro la registrazione**

Sostituisci il corpo di `web/src/components/wizard/StepConsumption.tsx`:

```tsx
import type { StoredSetup } from "../../lib/setupTypes.ts";
import { ConsumptionEditor } from "../consumption/ConsumptionEditor.tsx";
import { useT } from "../../i18n/useT.tsx";

/**
 * Step consumi del wizard: ospita l'editor consumi sul dataset appena scaricato.
 * Niente «Applica» qui: «Fine» applica i valori del metodo attivo (se validi),
 * «Salta» conclude senza consumi (aggiungibili poi dalla sezione «Consumi»).
 * Nota: questo step segue lo «Scarico» perché l'editor ha bisogno dell'asse orario e
 * della temperatura reale del sito, disponibili solo dopo il download PVGIS.
 */
export function StepConsumption({
  setup,
  registerGetPending,
}: {
  setup: StoredSetup | null;
  registerGetPending: (get: () => StoredSetup | null) => void;
}) {
  const { t } = useT();

  if (setup === null) {
    return (
      <div className="wizard-body">
        <h4>{t("wizard.consumption.title")}</h4>
        <p className="note">{t("wizard.consumption.needFetch")}</p>
      </div>
    );
  }

  return (
    <div className="wizard-body">
      <h4>{t("wizard.consumption.title")}</h4>
      <p className="note">{t("wizard.consumption.intro")}</p>
      <ConsumptionEditor setup={setup} wizard={{ registerGetPending }} />
    </div>
  );
}
```

- [ ] **Step 7: SetupWizard — «Salta» + «Fine» che applica**

In `web/src/components/wizard/SetupWizard.tsx`:

(a) ref del getter (accanto agli altri useState, ~riga 56):

```ts
// Getter del candidato consumi correnti (registrato dall'editor allo step 4).
const getPendingRef = useRef<(() => StoredSetup | null) | null>(null);
```

(b) nell'useEffect di apertura (riga 62-66), azzera il getter a ogni apertura, dopo `setBuilt(null)`:

```ts
getPendingRef.current = null;
```

(c) dopo `finish` aggiungi (il commento di `finish` resta valido: ✕/Esc/backdrop = «Salta»):

```ts
/** «Fine ✓»: applica i consumi correnti dell'editor (se validi) e conclude.
 *  Candidato nullo (form non valido / CSV mancante) → equivale a «Salta». */
const finishApply = (): void => {
  const pending = getPendingRef.current?.() ?? null;
  if (pending !== null) {
    void saveSetup(pending);
    setBuilt(null);
    onComplete(pending);
    setOpen(false);
    return;
  }
  finish();
};
```

(d) render dello step 4 (righe 130-138):

```tsx
{step === 4 && (
  <StepConsumption
    setup={built}
    registerGetPending={(g) => {
      getPendingRef.current = g;
    }}
  />
)}
```

(e) nav dello step 4 (righe 161-165) — «Salta» + «Fine ✓»:

```tsx
{step === 4 && built !== null && (
  <>
    <button onClick={finish}>{t("wizard.skip")}</button>
    <button className="wizard-next" onClick={finishApply}>
      {t("wizard.finish")}
    </button>
  </>
)}
```

- [ ] **Step 8: i18n**

`web/src/i18n/it.ts`:
- Aggiungi accanto a `wizard.finish` (riga 46): `"wizard.skip": "Salta",`
- Sostituisci `wizard.consumption.intro` (righe 99-100):

```ts
"wizard.consumption.intro":
  "Aggiungi i consumi per sbloccare le analisi economiche e batteria: «Fine ✓» applica i valori del metodo attivo. Con «Salta» concludi senza consumi e li aggiungi dopo dalla sezione «Consumi» del menu di configurazione.",
```

- Rimuovi `wizard.consumption.applied` (riga 101).

`web/src/i18n/en.ts`:
- Aggiungi accanto a `wizard.finish` (riga 45): `"wizard.skip": "Skip",`
- Sostituisci `wizard.consumption.intro` (righe 98-99):

```ts
"wizard.consumption.intro":
  "Add consumption to unlock the economic and battery analyses: “Done ✓” applies the active method's values. “Skip” finishes without consumption; you can add it later from the “Consumption” section of the configuration menu.",
```

- Rimuovi `wizard.consumption.applied` (riga 100).

- [ ] **Step 9: Test completo + verifica manuale + commit**

Run: `bun test` → PASS (include parità i18n)

Verifica manuale (`bun run web`): wizard fino allo step 4 → nessun bottone «Applica» nei tre metodi; «Fine ✓» applica il template mensile di default (grafici con consumi); riapri wizard → step 4 → «Salta» → dataset senza consumi. Sidebar → sezione Consumi: «Applica» c'è ancora e funziona.

```bash
git add web/src/lib/pendingConsumption.ts web/src/components/consumption/ web/src/components/wizard/StepConsumption.tsx web/src/components/wizard/SetupWizard.tsx web/src/i18n/it.ts web/src/i18n/en.ts test/pendingConsumption.test.ts
git commit -m "feat(wizard): consumi con Salta/Fine — Fine applica i valori del metodo attivo"
```

---

### Task 5: Wizard senza potenza + tetto AC seed 6 kW

**Files:**
- Modify: `web/src/lib/setupTypes.ts:16,90-95`
- Modify: `web/src/lib/buildDataset.ts`
- Modify: `web/src/components/wizard/StepRoof.tsx:40-44,97-113`
- Modify: `web/src/components/wizard/SetupWizard.tsx:27` (defaultInputs)
- Modify: `web/src/i18n/it.ts` + `web/src/i18n/en.ts` (rimozione chiavi)
- Test: `test/buildDataset.test.ts`, `test/setupTypes.test.ts`, `test/shareSetup.test.ts`

**Interfaces:**
- Produces: `WizardInputs["falde"]` diventa `{ id: string; azimuth: number; tilt: number }[]` (senza `panelCount`/`wp`). `SystemConfigB`/`FaldaConfigB` NON cambiano (SystemEditor resta pannelli × Wp). I dataset wizard hanno: `hourly.falde[].peakKwp = 1` (scala di fetch), `meta.falde[]` seedate `panelCount: 10, wp: 450, peakKwp: 4.5`, `meta.acCapKw = 6`, `meta.batteryPortKw = 6`.
- Consumes: `runSystem` riscala le serie base per rapporto kWp (già così: `runSystem.ts:12-16`) — il base 1 kWp è corretto per costruzione.

- [ ] **Step 1: Aggiorna i test (falliranno)**

`test/buildDataset.test.ts`:

(a) `BASE_INPUTS.falde` (righe 43-46):

```ts
falde: [
  { id: "sud", azimuth: 0, tilt: 30 },
  { id: "est", azimuth: -90, tilt: 20 },
],
```

(b) test (a) — URL: `peakpower: "1"` per entrambe le falde (riga 81 e nel `toMatchObject` riga 92: `peakpower: "1"`).

(c) test (c) — sostituisci le asserzioni su peakKwp/acCap (righe 127-142):

```ts
const sud = viz.hourly.falde.find((f) => f.id === "sud")!;
const est = viz.hourly.falde.find((f) => f.id === "est")!;
expect(sud.productionKwh[0]).toBe(0.8);
expect(est.productionKwh[0]).toBe(0.5);
// scala di fetch: PVGIS è lineare nel peakpower → si scarica sempre a 1 kWp
expect(sud.peakKwp).toBe(1);
expect(est.peakKwp).toBe(1);

// tetto AC seed fisso: dato dell'inverter, non derivato dalle falde
expect(viz.meta.acCapKw).toBe(6);
expect(viz.meta.batteryPortKw).toBe(6);
expect(viz.hourly.productionPracticalKwh[0]).toBeCloseTo(1.3, 6);

// seed plausibile del sistema iniziale: 10 × 450 Wp = 4.5 kWp per falda
expect(viz.meta.falde.map((f) => f.panelCount)).toEqual([10, 10]);
expect(viz.meta.falde.map((f) => f.wp)).toEqual([450, 450]);
expect(viz.meta.falde.map((f) => f.peakKwp)).toEqual([4.5, 4.5]);
```

`test/setupTypes.test.ts`:
- `makeInputs` riga 19: `falde: [{ id: "sud", azimuth: 0, tilt: 30 }],`
- Rimuovi i tre test `panelCount < 1`, `panelCount non intero`, `wp fuori range` (righe 74-90).
- Test id duplicati (righe 124-127): `{ id: "sud", azimuth: 0, tilt: 30 }, { id: "sud", azimuth: 90, tilt: 30 },`

`test/shareSetup.test.ts`:
- `makeWizard` (righe 16-22): falde senza `panelCount`/`wp`:

```ts
const falde = Array.from({ length: nFalde }, (_, i) => ({
  id: `falda-${i + 1}`,
  azimuth: i * 45 - 45,
  tilt: 30,
}));
```

- `makeSystem` (riga 38) — i sistemi mantengono pannelli × Wp, ora espliciti:

```ts
falde: wizard.falde.map((f, i) => ({ id: f.id, azimuth: f.azimuth, panelCount: 10 + i, wp: 450 })),
```

- [ ] **Step 2: Verifica che fallisca la compilazione/test**

Run: `bun test test/buildDataset.test.ts test/setupTypes.test.ts test/shareSetup.test.ts`
Expected: FAIL — type error su `WizardInputs` (falde richiedono ancora panelCount/wp) e asserzioni.

- [ ] **Step 3: setupTypes — tipo e validazione**

In `web/src/lib/setupTypes.ts`:

(a) riga 16:

```ts
falde: { id: string; azimuth: number; tilt: number }[];
```

(b) in `validateWizardInputs`, rimuovi i due check su `panelCount` e `wp` (righe 90-95):

```ts
    if (f.tilt < 0 || f.tilt > 90) {
      return "validate.wizard.faldaTilt";
    }
  }

  return null;
```

- [ ] **Step 4: buildDataset — fetch a 1 kWp, seed fissi**

In `web/src/lib/buildDataset.ts`:

(a) sostituisci la helper `faldaPeakKwp` (righe 20-23) con le costanti:

```ts
/** Scala di fetch: PVGIS è lineare nella potenza di picco, quindi si scarica sempre
 *  a 1 kWp per falda e i sistemi A/B riscalano le serie (runSystem). */
const FETCH_KWP = 1;

/** Seed plausibile del sistema iniziale per falda (l'utente lo edita in SystemEditor). */
const SEED_PANEL_COUNT = 10;
const SEED_WP = 450; // → 4.5 kWp/falda

/** Tetto AC di default: è un dato dell'inverter (taglia residenziale comune),
 *  non derivabile dalla potenza dei pannelli. L'utente lo corregge poi. */
const DEFAULT_AC_CAP_KW = 6;
```

(b) in `seriescalcUrl` (riga 36): `peakpower: String(FETCH_KWP),` — la firma può perdere il parametro `falda`? NO: servono ancora `angle`/`aspect` (righe 39-40). Resta `(inputs, falda)`.

(c) nel loop (righe 71, 87): rimuovi `const peakKwp = faldaPeakKwp(falda);` e passa la scala di fetch al parser:

```ts
const { series } = parseFaldaHourly(file, { id: falda.id, azimuth: falda.azimuth, peakKwp: FETCH_KWP }, `PVGIS falda "${falda.id}"`);
```

(d) righe 98-101: rimuovi `totalPeakKwp`/`defaultAcCap` e usa la costante:

```ts
const result = buildProductionSeries({ hourly, power: [], acCapKw: DEFAULT_AC_CAP_KW, year: referenceYear });
```

(e) nel `meta` (righe 105-127): `acCapKw: DEFAULT_AC_CAP_KW`, `batteryPortKw: DEFAULT_AC_CAP_KW`, falde seedate:

```ts
falde: inputs.falde.map((f) => ({
  id: f.id,
  azimuth: f.azimuth,
  peakKwp: (SEED_PANEL_COUNT * SEED_WP) / 1000,
  panelCount: SEED_PANEL_COUNT,
  wp: SEED_WP,
})),
```

(f) aggiorna il commento della funzione (riga 57): sostituisci la frase su `acCapKw` con:

```
 * `acCapKw` è un seed fisso (6 kW: dato dell'inverter, non derivabile dalle falde);
 * il fetch è a 1 kWp/falda (PVGIS è lineare) e `meta.falde` seeda 10×450 Wp a falda:
 * l'utente imposta il sistema reale in SystemEditor, che riscala le serie.
```

Nota coerenza (dal design): `hourly.falde[].peakKwp` (= 1, scala di fetch) è la base del rescaling di `runSystem`; `meta.falde[].peakKwp` (= 4.5, coerente con panelCount×wp) è ciò che il clone di sistema eredita e la base dello scaling `multiyearKwh` in `deriveMonoViz:40-42` (0 nei dataset wizard: nessun effetto). Non uniformarli.

- [ ] **Step 5: StepRoof e defaultInputs**

`web/src/components/wizard/StepRoof.tsx`:
- `addFalda` (riga 42): `{ id: nextFaldaId(inputs.falde), azimuth: 0, tilt: 30 }`
- Rimuovi i due `NumberField` «N° pannelli» e «Potenza pannello» (righe 97-113).
- Aggiorna il commento della funzione (righe 18-21): `falde ripetibili (orientamento/inclinazione) più i parametri comuni …`

`web/src/components/wizard/SetupWizard.tsx` riga 27:

```ts
falde: [{ id: "falda-1", azimuth: 0, tilt: 30 }],
```

- [ ] **Step 6: i18n — rimuovi le chiavi orfane**

Da ENTRAMBI `web/src/i18n/it.ts` e `web/src/i18n/en.ts` rimuovi:
- `wizard.roof.panelCount` (it:70, en:69)
- `wizard.roof.panelPower` (it:71, en:70)
- `validate.wizard.faldaPanelCount` (it:116, en:115)
- `validate.wizard.faldaWp` (it:117, en:116)

- [ ] **Step 7: Test completo**

Run: `bun test`
Expected: PASS. Se qualche altro file usa ancora `f.panelCount`/`f.wp` su `WizardInputs` (il compilatore/bundler lo segnala), correggilo nello stesso modo — NON toccare gli usi su `SystemConfigB`/`FaldaConfigB`/`viz.meta.falde`, che restano.

- [ ] **Step 8: Verifica manuale + commit**

Verifica manuale (`bun run web`): wizard → step Tetto senza campi pannelli; scarica (o droppa un JSON seriescalc); a fine wizard SystemEditor mostra 10×450 per falda e tetto AC 6; alza i pannelli → produzione scala. Vecchio link condiviso (se ne hai uno) → ancora accettato.

```bash
git add web/src/lib/setupTypes.ts web/src/lib/buildDataset.ts web/src/components/wizard/StepRoof.tsx web/src/components/wizard/SetupWizard.tsx web/src/i18n/it.ts web/src/i18n/en.ts test/buildDataset.test.ts test/setupTypes.test.ts test/shareSetup.test.ts
git commit -m "feat(wizard): niente potenza nel wizard (fetch a 1 kWp) + tetto AC seed 6 kW"
```

---

### Task 6: Verifica finale

**Files:** nessuna modifica prevista (solo fix emersi dalla verifica).

- [ ] **Step 1: Suite completa + build**

Run: `bun test`
Expected: PASS (0 fail)

Run: `bun run build`
Expected: build senza errori.

- [ ] **Step 2: Smoke test end-to-end**

`bun run web` e verifica in sequenza:
1. Wizard completo da zero (località → tetto senza pannelli → scarico → consumi con «Fine ✓»).
2. Vista confronto: max clipping corretto e linea tetto AC; bottone disabilitato se nessun sistema clippa.
3. Digitazione nome sistema fluida.
4. Tab incentivi: 45 % → «importo fisso» mostra 0 €, ritorno a «% del costo» mostra 50 %.

- [ ] **Step 3: Chiudi il branch**

Usa la skill superpowers:finishing-a-development-branch (squash su main come da convenzione del repo).
