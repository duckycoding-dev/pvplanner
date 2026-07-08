# Linea temperatura nei grafici — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Propagare la temperatura oraria (T2m) fino al viz e mostrarla come linea arancione su asse Y secondario nei grafici giorno-per-giorno e confronto.

**Architecture:** Un'unica aggiunta in `buildViz.ts` (usato da demo e fetch browser) porta `t2m` in `viz.hourly`; i tipi web e gli slicer lo espongono ai chart come campo opzionale; i due chart aggiungono un asse destro °C e una `<Line>`.

**Tech Stack:** Bun + React 19 + Recharts 3 + TypeScript.

## Global Constraints

- `t2m` **opzionale** ovunque nel layer web (retrocompat viz vecchi in cache).
- Colore linea temperatura: `#f59e0b`. Asse secondario: `yAxisId="temp"`, `orientation="right"`, label `°C`.
- Nuove chiavi i18n in **entrambi** `it.ts` ed `en.ts` (guardia `test/i18n.test.ts`).
- Nessun trailer `Co-Authored-By` nei commit.

---

### Task 1: Propagare T2m nei dati (viz + tipi + slicer + demo)

**Files:**
- Modify: `src/core/viz/buildViz.ts` (tipo output `hourly` ~121-131; oggetto `hourly` ~242-270)
- Modify: `web/src/types.ts` (`Hourly` ~25)
- Modify: `web/src/lib/sliceDay.ts` (`DayPoint` + `sliceDay`)
- Modify: `web/src/lib/sliceCompareDay.ts` (`ComparePoint` + `sliceCompareDay`)
- Regenerate: `web/viz.demo.json`

**Interfaces:**
- Produces: `viz.hourly.t2m?: number[]`; `DayPoint.temp?: number`; `ComparePoint.temp?: number`.

- [ ] **Step 1: buildViz — aggiungere `t2m` al tipo di output**

In `src/core/viz/buildViz.ts`, nel tipo dell'oggetto `hourly` (dopo `loadKwh: number[];`, riga ~130):

```ts
    loadKwh: number[];
    t2m: number[];
```

- [ ] **Step 2: buildViz — emettere `t2m` nell'oggetto hourly**

In `src/core/viz/buildViz.ts`, nell'oggetto `hourly` (dopo `loadKwh: woh ? arr3(woh.loadKwh) : zeros(hours),`, riga ~256):

```ts
      loadKwh: woh ? arr3(woh.loadKwh) : zeros(hours),
      t2m: arr3(base.t2m),
```

- [ ] **Step 3: web Hourly — campo opzionale**

In `web/src/types.ts`, dentro `interface Hourly`, dopo `loadKwh: number[];` (riga ~34):

```ts
  loadKwh: number[];
  t2m?: number[];
```

- [ ] **Step 4: DayPoint + sliceDay**

In `web/src/lib/sliceDay.ts`, aggiungere il campo a `DayPoint` (dopo `soc: number;`):

```ts
  soc: number;
  temp?: number;
```

e popolarlo in `sliceDay` (dentro il `push`, dopo `soc: h.wb.socKwh[j] ?? 0,`):

```ts
      soc: h.wb.socKwh[j] ?? 0,
      temp: h.t2m?.[j],
```

- [ ] **Step 5: ComparePoint + sliceCompareDay**

In `web/src/lib/sliceCompareDay.ts`, aggiungere a `ComparePoint` (dopo `socB: number;`):

```ts
  socB: number;
  temp?: number;
```

e in `sliceCompareDay` (dentro il `push`, dopo `socB: b.hourly.socKwh[j] ?? 0,`):

```ts
      socB: b.hourly.socKwh[j] ?? 0,
      temp: viz.hourly.t2m?.[j],
```

- [ ] **Step 6: Rigenerare la demo e verificare che contenga t2m**

Run: `bun scripts/build-demo.ts && grep -c '"t2m"' web/viz.demo.json`
Expected: comando ok; conteggio ≥ 1 (la chiave `t2m` è presente nel viz demo).

- [ ] **Step 7: Build + test**

Run: `bun run build && bun test`
Expected: build ok; 227+ test verdi.

- [ ] **Step 8: Commit**

```bash
git add src/core/viz/buildViz.ts web/src/types.ts web/src/lib/sliceDay.ts web/src/lib/sliceCompareDay.ts web/viz.demo.json
git commit -m "feat: propaga temperatura oraria (T2m) fino al viz e agli slicer"
```

---

### Task 2: Linea temperatura in PowerChart (giorno-per-giorno)

**Files:**
- Modify: `web/src/components/PowerChart.tsx` (asse + linea)
- Modify: `web/src/i18n/it.ts`, `web/src/i18n/en.ts` (chiave `chart.temperature`)

**Interfaces:**
- Consumes: `DayPoint.temp` (Task 1); `useLegendToggle` (esistente); chiave `chart.temperature`.

- [ ] **Step 1: Chiavi i18n**

In `web/src/i18n/it.ts`, dopo `"theme.toLight": ...`:

```ts
  "chart.temperature": "Temperatura (°C)",
```

In `web/src/i18n/en.ts`, dopo `"theme.toLight": ...`:

```ts
  "chart.temperature": "Temperature (°C)",
```

- [ ] **Step 2: Asse Y secondario a destra**

In `web/src/components/PowerChart.tsx`, subito dopo la riga `<YAxis label={{ value: "kW", angle: -90, position: "insideLeft" }} />`:

```tsx
        <YAxis yAxisId="temp" orientation="right" tickFormatter={(v: number) => String(Math.round(v))} label={{ value: "°C", angle: 90, position: "insideRight" }} />
```

- [ ] **Step 3: Linea temperatura (arancione, asse destro)**

In `web/src/components/PowerChart.tsx`, subito prima della `<ReferenceLine ...>` del tetto AC (la riga `stroke="#6b7280"`), aggiungere:

```tsx
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temp"
          name={t("chart.temperature")}
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
          hide={isHidden("temp")}
        />
```

(`isHidden`/`onClick` sono già ricavati da `useLegendToggle()` nel componente; la linea è visibile di default perché `isHidden` parte `false`.)

- [ ] **Step 4: Build + test**

Run: `bun run build && bun test`
Expected: build ok; test verdi (i18n parità inclusa).

- [ ] **Step 5: Verifica manuale**

Run: `bun run web` → sezione giorno-per-giorno.
Expected: linea arancione «Temperatura (°C)» con asse destro in °C; cliccando la voce in legenda si nasconde/mostra.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/PowerChart.tsx web/src/i18n/it.ts web/src/i18n/en.ts
git commit -m "feat(web): linea temperatura nel grafico giorno-per-giorno"
```

---

### Task 3: Linea temperatura in CompareDayChart (confronto)

**Files:**
- Modify: `web/src/components/CompareDayChart.tsx` (asse + linea nel grafico principale)

**Interfaces:**
- Consumes: `ComparePoint.temp` (Task 1); chiave `chart.temperature` (Task 2); `isHidden`/`onClick` già presenti (`useLegendToggle`).

- [ ] **Step 1: Asse Y secondario a destra (grafico principale)**

In `web/src/components/CompareDayChart.tsx`, nel **primo** `ComposedChart` (quello con `label={{ value: "kWh", ... }}` a riga ~163), subito dopo quella `<YAxis>`:

```tsx
          <YAxis yAxisId="temp" orientation="right" tickFormatter={(v) => String(Math.round(Number(v)))} label={{ value: "°C", angle: 90, position: "insideRight" }} />
```

- [ ] **Step 2: Linea temperatura (arancione, asse destro)**

In `web/src/components/CompareDayChart.tsx`, nel primo `ComposedChart`, subito prima della `<ReferenceLine y={acCapA} ...>` (riga ~174):

```tsx
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temp"
            name={t("chart.temperature")}
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
            hide={isHidden("temp")}
          />
```

- [ ] **Step 3: Build + test**

Run: `bun run build && bun test`
Expected: build ok; test verdi.

- [ ] **Step 4: Verifica manuale**

Run: `bun run web` → sezione Confronto.
Expected: linea arancione «Temperatura (°C)» sul grafico principale (asse destro °C); il sotto-grafico SOC resta invariato.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/CompareDayChart.tsx
git commit -m "feat(web): linea temperatura nel grafico di confronto"
```

---

## Self-Review

**Spec coverage:** dati/propagazione → Task 1; PowerChart → Task 2; CompareDayChart → Task 3; i18n → Task 2; demo rigenerata → Task 1 step 6; visibile di default → `hide={isHidden("temp")}` con toggle inziale false. ✓

**Placeholder scan:** nessun TODO/TBD; ogni step mostra il codice. ✓

**Type consistency:** `t2m?: number[]` (Hourly) → `temp?: number` (DayPoint/ComparePoint) → `dataKey="temp"` nei chart; chiave `chart.temperature` coerente tra it.ts/en.ts e i due chart; `yAxisId="temp"` coerente tra asse e linee. `arr3` accetta `ReadonlyArray<number>`, quindi `arr3(base.t2m)` compila. ✓
