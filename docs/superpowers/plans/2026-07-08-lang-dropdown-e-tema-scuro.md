# Selettore lingua a dropdown + tema scuro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare il selettore lingua in un dropdown con bandiere e aggiungere un tema scuro con toggle a 2 stati (primo avvio = preferenza di sistema), documentando il sistema multi-tema per agenti futuri.

**Architecture:** Il tema vive come attributo `data-theme` su `<html>`, pilotato da un `ThemeProvider`/`useTheme()` che ricalca il pattern di `i18n/useT.tsx`. I colori sono tutti in variabili CSS su `:root`, con un blocco `:root[data-theme="dark"]` che le ridefinisce. I grafici recharts ereditano i neutri (assi/griglia/tick/legenda/tooltip) via override CSS sulle classi `.recharts-*` (il CSS vince sugli attributi di presentazione SVG), quindi nessun colore va passato inline nei componenti chart.

**Tech Stack:** Bun + React 19 + Recharts 3 + TypeScript. Test con `bun:test` (solo logica, nessun DOM). i18n con dizionari `it.ts`/`en.ts` a parità garantita da `test/i18n.test.ts`.

## Global Constraints

- Runtime/toolchain: **Bun** + **TypeScript** + **React 19**, no Python (preferenza utente).
- Ogni chiave i18n nuova va aggiunta a **entrambi** `web/src/i18n/it.ts` e `web/src/i18n/en.ts`, altrimenti `test/i18n.test.ts` fallisce.
- Accessi a `localStorage` / `matchMedia` / `document` sempre in `try/catch` (compatibilità SSR/test), come già fa `detectLang` in `web/src/i18n/useT.tsx`.
- Nessun trailer `Co-Authored-By` / firma AI nei commit di questo repo.
- Tema scuro: **2 stati** (chiaro ↔ scuro); la preferenza di sistema conta **solo** al primo avvio (nessun listener live). Persistenza in `localStorage["theme"]`.
- Grafici: approccio **minimo, solo neutri** — colori delle serie (blu/verde/rosso/viola) invariati.

---

## File Structure

- `web/src/theme/useTheme.tsx` — **nuovo**. `ThemeProvider`, hook `useTheme()`, `detectTheme()`, e la funzione pura `resolveInitialTheme(stored, prefersDark)`.
- `web/src/theme/useTheme.test.ts` — **nuovo**. Unit test della funzione pura. (Nota: i test del repo stanno in `test/` alla root; questo file di logica pura può stare accanto al modulo perché `bun test` scopre `*.test.ts` ovunque. Se si preferisce la convenzione esistente, spostarlo in `test/theme.test.ts` — indifferente.)
- `web/index.html` — **modifica**. Snippet inline anti-FOUC nel `<head>`.
- `web/src/main.tsx` — **modifica**. Montaggio `ThemeProvider`.
- `web/src/App.tsx` — **modifica**. `<select>` lingua + pulsante toggle tema in `.header-top`.
- `web/src/styles.css` — **modifica**. Palette dark, estrazione variabili, override recharts, `.lang-select`, `.theme-toggle`.
- `web/src/i18n/it.ts`, `web/src/i18n/en.ts` — **modifica**. Chiavi aria per il toggle tema.
- `docs/10-tema-e-stili.md` — **nuovo**. Guida al sistema multi-tema per agenti futuri.
- `docs/index.md` — **modifica**. Link alla nuova guida.

**Nota di progettazione (scostamento dallo spec):** lo spec ipotizzava un hook `useChartNeutrals`. Ispezionando gli 8 chart, `CartesianGrid`/`XAxis`/`YAxis` **non** passano colori inline: usano i default recharts (`#666`/`#ccc`), illeggibili su sfondo scuro. L'approccio minimo reale è quindi **override CSS sulle classi `.recharts-*`** (una regola in `styles.css`, zero churn nei componenti, reattivo ai temi via variabili CSS). Il risultato è identico all'intento dello spec ("solo i neutri diventano tema-aware"). L'hook JS viene abbandonato.

---

### Task 1: Selettore lingua a dropdown

**Files:**
- Modify: `web/src/App.tsx:307-321` (blocco `<header>` / `.header-top`)
- Modify: `web/src/styles.css:25-26` (regole `.lang-toggle`) e aggiunta `.lang-select`

**Interfaces:**
- Consumes: `useT()` → `{ t, lang, setLang }` (esistente, `web/src/i18n/useT.tsx`); tipo `Lang = "it" | "en"` da `web/src/i18n/types.ts`.
- Produces: markup `.header-top` con `<select class="lang-select">`; nessuna nuova API JS.

- [ ] **Step 1: Importare il tipo `Lang` in App.tsx**

In cima a `web/src/App.tsx`, aggiungere l'import del tipo (accanto agli altri `import type`):

```tsx
import type { Lang } from "./i18n/types.ts";
```

- [ ] **Step 2: Sostituire i due pulsanti lingua con un `<select>`**

In `web/src/App.tsx`, rimpiazzare il blocco (righe ~313-320):

```tsx
            <span className="lang-toggle seg" role="group" aria-label={t("lang.switch")}>
              <button className={lang === "it" ? "active" : ""} aria-pressed={lang === "it"} onClick={() => setLang("it")}>
                {t("lang.it")}
              </button>
              <button className={lang === "en" ? "active" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                {t("lang.en")}
              </button>
            </span>
```

con:

```tsx
            <select
              className="lang-select"
              aria-label={t("lang.switch")}
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="it">🇮🇹 Italiano</option>
              <option value="en">🇬🇧 English</option>
            </select>
```

(I nomi lingua `Italiano`/`English` sono endonimi convenzionali, non tradotti: restano inline, non nel dizionario.)

- [ ] **Step 3: Aggiornare il CSS**

In `web/src/styles.css`, sostituire le due righe:

```css
.lang-toggle { flex: none; }
.lang-toggle button { font-size: 12px; }
```

con:

```css
.lang-select {
  flex: none;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 5px 8px;
  font-size: 13px;
  color: var(--text);
  background: var(--card);
  cursor: pointer;
}
.lang-select:hover { border-color: var(--accent); }
```

- [ ] **Step 4: Verifica di compilazione**

Run: `bun run build`
Expected: build completa senza errori TypeScript.

- [ ] **Step 5: Verifica manuale**

Run: `bun run web` e aprire `http://localhost:2345`.
Expected: nell'header compare un menu a tendina con `🇮🇹 Italiano` / `🇬🇧 English`; cambiando voce l'interfaccia cambia lingua e la scelta persiste dopo un reload (localStorage `lang`).

- [ ] **Step 6: Commit**

```bash
git add web/src/App.tsx web/src/styles.css
git commit -m "feat(web): selettore lingua a dropdown con bandiere"
```

---

### Task 2: Core del tema (logica pura + provider + anti-FOUC)

**Files:**
- Create: `web/src/theme/useTheme.tsx`
- Create: `web/src/theme/useTheme.test.ts`
- Modify: `web/src/main.tsx:1-13`
- Modify: `web/index.html` (dopo `<meta name="theme-color" ... />`)

**Interfaces:**
- Consumes: React (`createContext`, `useState`, `useEffect`, `useCallback`, `useMemo`).
- Produces:
  - `type Theme = "light" | "dark"`
  - `resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme` — funzione pura.
  - `detectTheme(): Theme` — legge `localStorage["theme"]` + `matchMedia`, delega a `resolveInitialTheme`.
  - `ThemeProvider({ children }): JSX.Element`
  - `useTheme(): { theme: Theme; toggleTheme: () => void }`

- [ ] **Step 1: Scrivere il test della logica pura (che fallisce)**

Create `web/src/theme/useTheme.test.ts`:

```ts
import { expect, test } from "bun:test";
import { resolveInitialTheme } from "./useTheme.tsx";

test("localStorage valido ha priorità sulla preferenza di sistema", () => {
  expect(resolveInitialTheme("dark", false)).toBe("dark");
  expect(resolveInitialTheme("light", true)).toBe("light");
});

test("senza scelta salvata segue la preferenza di sistema", () => {
  expect(resolveInitialTheme(null, true)).toBe("dark");
  expect(resolveInitialTheme(null, false)).toBe("light");
});

test("valore salvato non valido viene ignorato, fallback al sistema", () => {
  expect(resolveInitialTheme("banana", true)).toBe("dark");
  expect(resolveInitialTheme("", false)).toBe("light");
});
```

- [ ] **Step 2: Eseguire il test per verificarne il fallimento**

Run: `bun test web/src/theme/useTheme.test.ts`
Expected: FAIL — modulo `./useTheme.tsx` inesistente / `resolveInitialTheme is not a function`.

- [ ] **Step 3: Creare il modulo del tema**

Create `web/src/theme/useTheme.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "theme";

/** Logica pura: scelta salvata valida → usala; altrimenti preferenza di sistema. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

/** Tema iniziale leggendo localStorage + matchMedia (protetti per SSR/test). */
export function detectTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch {
    /* localStorage non disponibile */
  }
  let prefersDark = false;
  try {
    prefersDark = typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    /* matchMedia non disponibile */
  }
  return resolveInitialTheme(stored, prefersDark);
}

function applyTheme(theme: Theme): void {
  try {
    document.documentElement.setAttribute("data-theme", theme);
  } catch {
    /* ignore (SSR/test) */
  }
}

interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setTheme] = useState<Theme>(detectTheme);

  // Riflette il tema su <html data-theme> anche al primo montaggio.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback((): void => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      applyTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeCtx>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error("useTheme deve essere usato dentro <ThemeProvider>.");
  return ctx;
}
```

- [ ] **Step 4: Eseguire il test per verificarne il successo**

Run: `bun test web/src/theme/useTheme.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Montare il ThemeProvider in main.tsx**

Modify `web/src/main.tsx` — aggiungere l'import e avvolgere l'app (dentro `LangProvider`):

```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { LangProvider } from "./i18n/useT.tsx";
import { ThemeProvider } from "./theme/useTheme.tsx";
import "./styles.css";

const el = document.getElementById("root");
if (el !== null) {
  createRoot(el).render(
    <LangProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </LangProvider>,
  );
}
```

- [ ] **Step 6: Aggiungere lo snippet anti-FOUC in index.html**

In `web/index.html`, subito dopo la riga `<meta name="theme-color" content="#0b1f33" />`, inserire:

```html
    <!-- Anti-FOUC: imposta data-theme prima del bundle React, stessa logica di resolveInitialTheme. -->
    <script>
      (function () {
        try {
          var s = localStorage.getItem("theme");
          var t = s === "light" || s === "dark" ? s : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
          document.documentElement.setAttribute("data-theme", t);
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 7: Verifica di compilazione + test completo**

Run: `bun run build && bun test`
Expected: build ok; tutti i test passano (inclusi i 3 nuovi e `test/i18n.test.ts`).

- [ ] **Step 8: Commit**

```bash
git add web/src/theme/useTheme.tsx web/src/theme/useTheme.test.ts web/src/main.tsx web/index.html
git commit -m "feat(web): core del tema (provider, hook, detect, anti-FOUC)"
```

---

### Task 3: Palette scura, estrazione variabili e neutri dei grafici

**Files:**
- Modify: `web/src/styles.css` (blocco `:root` in cima; regole con colori hardcoded; nuove regole in coda)

**Interfaces:**
- Consumes: attributo `data-theme="dark"` impostato su `<html>` (Task 2).
- Produces: variabili CSS `--input-bg`, `--warn-bg/--warn-border/--warn-text`, `--violet-bg/--violet-border/--violet-text`, `--code-text`; override recharts; regola base `.theme-toggle` (usata in Task 4).

- [ ] **Step 1: Estendere `:root` con le nuove variabili (tema chiaro)**

In `web/src/styles.css`, sostituire il blocco `:root` iniziale:

```css
:root {
  --bg: #f6f7f9;
  --card: #ffffff;
  --border: #e3e6ea;
  --text: #1f2933;
  --muted: #6b7280;
  --accent: #3b82f6;
}
```

con:

```css
:root {
  --bg: #f6f7f9;
  --card: #ffffff;
  --border: #e3e6ea;
  --text: #1f2933;
  --muted: #6b7280;
  --accent: #3b82f6;
  --input-bg: #ffffff;
  --code-text: #334155;
  --warn-bg: #fff7ed;
  --warn-border: #fed7aa;
  --warn-text: #7c2d12;
  --violet-bg: #f5f3ff;
  --violet-border: #ddd6fe;
  --violet-text: #5b21b6;
}

:root[data-theme="dark"] {
  --bg: #0f1720;
  --card: #1a2330;
  --border: #2c3644;
  --text: #e6eaf0;
  --muted: #9aa5b4;
  --accent: #5b9bf8;
  --input-bg: #131b26;
  --code-text: #cbd5e1;
  --warn-bg: rgba(245, 158, 11, 0.12);
  --warn-border: #7c5015;
  --warn-text: #fbbf77;
  --violet-bg: rgba(124, 58, 237, 0.16);
  --violet-border: #4c3d80;
  --violet-text: #c4b5fd;
}
```

- [ ] **Step 2: Sostituire i background bianchi hardcoded con `--input-bg`**

In `web/src/styles.css`, cambiare `background: #fff;` → `background: var(--input-bg);` nelle tre regole seguenti:
- `.text-field input, .text-field select { ... background: #fff; }` (riga ~186)
- `.share-url { ... background: #fff; }` (riga ~228)

Nota: `.lang-select` (Task 1) usa `var(--card)` — lasciarlo così; card e input-bg coincidono nel chiaro e restano coerenti nello scuro.

- [ ] **Step 3: Convertire i box tinti in variabili**

In `web/src/styles.css`, `.demo-banner` (riga ~130): sostituire

```css
  background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12;
```

con

```css
  background: var(--warn-bg); border: 1px solid var(--warn-border); color: var(--warn-text);
```

`.crossover-note` (riga ~260): sostituire

```css
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  color: #5b21b6;
```

con

```css
  background: var(--violet-bg);
  border: 1px solid var(--violet-border);
  color: var(--violet-text);
```

`.glossary code` (riga ~119): sostituire `color: #334155;` con `color: var(--code-text);`.

- [ ] **Step 4: Aggiungere override neutri per recharts + base del toggle (in coda al file)**

Appendere in fondo a `web/src/styles.css`:

```css
/* --- neutri grafici recharts (tema-aware via variabili CSS) --- */
/* Il CSS vince sugli attributi di presentazione SVG di default (#666/#ccc). */
.recharts-cartesian-grid line { stroke: var(--border); }
.recharts-cartesian-axis-line,
.recharts-cartesian-axis-tick-line { stroke: var(--border); }
.recharts-cartesian-axis-tick-value { fill: var(--muted); }
.recharts-label { fill: var(--muted); }
.recharts-legend-item-text { color: var(--text) !important; }
.recharts-default-tooltip {
  background: var(--card) !important;
  border-color: var(--border) !important;
  color: var(--text);
}

/* --- toggle tema --- */
.theme-toggle {
  flex: none;
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 7px;
  padding: 5px 9px;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  color: var(--text);
}
.theme-toggle:hover { border-color: var(--accent); }
```

- [ ] **Step 5: Verifica manuale in entrambi i temi**

Run: `bun run web` e aprire `http://localhost:2345`.
Per forzare lo scuro senza toggle (ancora assente): in console del browser eseguire
`localStorage.setItem("theme","dark"); location.reload()`.
Expected: sfondo/card/testi scuri e leggibili; grafici (Panoramica, Mensile, Giorno, Confronto, Cashflow) con assi/griglia/tick/legenda/tooltip leggibili; banner demo e nota crossover leggibili. Ripristinare con `localStorage.setItem("theme","light"); location.reload()`.

- [ ] **Step 6: Verifica di compilazione**

Run: `bun run build`
Expected: build senza errori.

- [ ] **Step 7: Commit**

```bash
git add web/src/styles.css
git commit -m "feat(web): palette tema scuro, variabili colore e neutri grafici"
```

---

### Task 4: Pulsante toggle tema + chiavi i18n

**Files:**
- Modify: `web/src/App.tsx` (import + `.header-top`)
- Modify: `web/src/i18n/it.ts:10-12` (blocco chiavi `lang.*`)
- Modify: `web/src/i18n/en.ts:9-11` (blocco chiavi `lang.*`)

**Interfaces:**
- Consumes: `useTheme()` → `{ theme, toggleTheme }` (Task 2); classe `.theme-toggle` (Task 3); `t()` da `useT()`.
- Produces: pulsante icona nell'header; chiavi i18n `theme.toDark` / `theme.toLight`.

- [ ] **Step 1: Aggiungere le chiavi i18n (italiano)**

In `web/src/i18n/it.ts`, dopo la riga `"lang.switch": "Lingua",` aggiungere:

```ts
  "theme.toDark": "Attiva tema scuro",
  "theme.toLight": "Attiva tema chiaro",
```

- [ ] **Step 2: Aggiungere le chiavi i18n (inglese)**

In `web/src/i18n/en.ts`, dopo la riga `"lang.switch": "Language",` aggiungere:

```ts
  "theme.toDark": "Switch to dark theme",
  "theme.toLight": "Switch to light theme",
```

- [ ] **Step 3: Importare e usare `useTheme` in App.tsx**

In `web/src/App.tsx`, aggiungere l'import:

```tsx
import { useTheme } from "./theme/useTheme.tsx";
```

Dentro il componente `App`, accanto a `const { t, lang, setLang } = useT();` (riga ~88), aggiungere:

```tsx
  const { theme, toggleTheme } = useTheme();
```

- [ ] **Step 4: Aggiungere il pulsante nell'header**

In `web/src/App.tsx`, dentro `.header-top`, subito dopo lo `<select className="lang-select">…</select>` (Task 1), aggiungere:

```tsx
            <button
              type="button"
              className="theme-toggle"
              aria-label={t(theme === "dark" ? "theme.toLight" : "theme.toDark")}
              aria-pressed={theme === "dark"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
```

- [ ] **Step 5: Verifica di compilazione + test (parità chiavi i18n)**

Run: `bun run build && bun test`
Expected: build ok; `test/i18n.test.ts` verde (chiavi `theme.*` presenti in entrambi i dizionari).

- [ ] **Step 6: Verifica manuale**

Run: `bun run web` e aprire `http://localhost:2345`.
Expected: nell'header un pulsante 🌙/☀️; il click alterna chiaro/scuro istantaneamente, l'icona e l'`aria-label` si aggiornano, la scelta persiste dopo reload; ricaricando in una finestra pulita il tema iniziale segue la preferenza di sistema del browser/OS.

- [ ] **Step 7: Commit**

```bash
git add web/src/App.tsx web/src/i18n/it.ts web/src/i18n/en.ts
git commit -m "feat(web): toggle tema chiaro/scuro nell'header"
```

---

### Task 5: Documentazione del sistema multi-tema

**Files:**
- Create: `docs/10-tema-e-stili.md`
- Modify: `docs/index.md` (elenco documenti)

**Interfaces:**
- Consumes: comportamento implementato nei Task 1-4.
- Produces: guida di riferimento per agenti futuri.

- [ ] **Step 1: Creare la guida**

Create `docs/10-tema-e-stili.md`:

````markdown
---
title: Tema e stili — sistema multi-tema (chiaro/scuro) e regole colore
last_updated: 2026-07-08
summary: Come funziona il tema chiaro/scuro della SPA e le regole da seguire quando si creano o modificano componenti, così da non introdurre colori che rompono uno dei due temi. Sorgente di verità dei colori = variabili CSS su :root; il tema si commuta via attributo data-theme su <html>.
status: draft
---

# Tema e stili

## Come funziona

- Il tema attivo è l'attributo `data-theme="light" | "dark"` su `<html>`.
- Al primo avvio uno snippet inline in `web/index.html` lo imposta **prima** del
  bundle React (anti-FOUC), con la stessa logica di `resolveInitialTheme`.
- A runtime lo gestisce `web/src/theme/useTheme.tsx`:
  - `resolveInitialTheme(stored, prefersDark)` — logica pura: scelta salvata
    valida (`localStorage["theme"]`) → altrimenti `prefers-color-scheme`.
  - `useTheme()` → `{ theme, toggleTheme }`. `toggleTheme` è **2 stati**
    (chiaro ↔ scuro) e persiste in `localStorage`.
  - Nessun listener sui cambi di sistema: la preferenza di sistema conta solo
    al primo avvio.
- I colori sono **tutte variabili CSS** su `:root` in `web/src/styles.css`. Il
  blocco `:root[data-theme="dark"]` ridefinisce le stesse variabili.

## Regole per chi crea/modifica componenti

1. **Mai colori hardcoded per superfici e testo.** Usa le variabili:
   `--bg`, `--card`, `--border`, `--text`, `--muted`, `--accent`,
   `--input-bg` (sfondo di input/campi), `--code-text`, e le coppie tinte
   `--warn-*` / `--violet-*`. Se serve un nuovo colore neutro/di superficie,
   **aggiungi una variabile** in entrambi i blocchi `:root` (chiaro e scuro),
   non un hex nel componente.
2. **Colori semantici** — verde successo (`#16a34a`), rosso errore
   (`#dc2626`) — sono leggibili su entrambi i temi e possono restare inline.
   Se ne aggiungi altri, verificane il contrasto sullo scuro (`--card` = molto
   scuro).
3. **Grafici recharts:** NON passare colori neutri inline per assi/griglia/
   tick/legenda/tooltip. Quei neutri sono già gestiti dagli override CSS
   `.recharts-*` in `styles.css`, che leggono `--border`/`--muted`/`--text` e
   quindi seguono il tema. Passa inline **solo** i colori delle serie dati
   (barre/linee), scegliendoli leggibili su entrambi i temi.
4. **Verifica sempre in entrambi i temi.** Per forzare lo scuro in dev:
   in console `localStorage.setItem("theme","dark"); location.reload()`
   (ripristina con `"light"`).

## File chiave

- `web/src/theme/useTheme.tsx` — provider, hook, detect, logica pura.
- `web/src/styles.css` — variabili `:root` + `:root[data-theme="dark"]`,
  override recharts, `.theme-toggle`, `.lang-select`.
- `web/index.html` — snippet anti-FOUC.
- `web/src/App.tsx` — pulsante toggle nell'header.
````

- [ ] **Step 2: Collegare la guida dall'indice**

In `docs/index.md`, aggiungere una riga all'elenco dei documenti (accanto agli altri `NN-*.md`, ad es. dopo il riferimento a `09-deploy.md`):

```markdown
- `10-tema-e-stili.md` — sistema multi-tema (chiaro/scuro) e regole colore per i componenti.
```

(Se l'elenco in `index.md` ha un formato diverso, adeguare la riga al formato esistente mantenendo path e descrizione.)

- [ ] **Step 3: Commit**

```bash
git add docs/10-tema-e-stili.md docs/index.md
git commit -m "docs: guida al sistema multi-tema e regole colore"
```

---

## Self-Review

**Spec coverage:**
- Feature 1 (dropdown lingua + bandiere) → Task 1. ✓
- Feature 2 tema: modello 2 stati + primo avvio da sistema → Task 2 (`resolveInitialTheme`/`toggleTheme`). ✓
- Anti-FOUC → Task 2 step 6. ✓
- Palette dark + estrazione variabili (input-bg, box tinti, glossary code) → Task 3. ✓
- Grafici solo-neutri → Task 3 step 4 (override CSS `.recharts-*`; deviazione documentata sopra, esito equivalente allo spec). ✓
- UI toggle in `.header-top` + aria → Task 4. ✓
- Semantici `.pos`/`.neg`/`.err`/tooltip lasciati leggibili → rispettato (non toccati salvo tooltip reso tema-aware come extra a costo nullo). ✓
- Fuori scope (3° stato auto, listener live, ricolore serie) → rispettato. ✓
- Requisito aggiuntivo utente (documentare il multi-tema) → Task 5. ✓

**Placeholder scan:** nessun TBD/TODO; ogni step di codice mostra il codice completo. ✓

**Type consistency:** `Theme`, `resolveInitialTheme(stored, prefersDark)`, `detectTheme()`, `useTheme()→{theme,toggleTheme}`, `ThemeProvider` usati in modo coerente tra Task 2 e Task 4. Chiavi i18n `theme.toDark`/`theme.toLight` coerenti tra it.ts, en.ts e App.tsx. Classe `.theme-toggle` definita in Task 3 e usata in Task 4. ✓
