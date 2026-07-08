---
title: Selettore lingua a dropdown + tema scuro
date: 2026-07-08
status: approved
autore: davide.milan
---

# Selettore lingua a dropdown + tema scuro

Due miglioramenti UI indipendenti per la web app di analisi fotovoltaico:

1. Trasformare il selettore lingua (attuali due pulsanti) in un `<select>` con
   emoji bandiera.
2. Aggiungere un tema scuro con toggle a 2 stati, che al primo caricamento
   segue la preferenza del sistema.

Le due feature condividono lo stesso pattern architetturale (provider + hook,
come `useT`) e lo stesso punto di montaggio UI (`.header-top`), ma sono
indipendenti e possono essere implementate/testate separatamente.

---

## Feature 1 — Selettore lingua a dropdown

### Obiettivo
Sostituire i due pulsanti IT/EN con un menu a tendina nativo che mostri la
bandiera della lingua accanto al nome.

### Modifiche
- **`web/src/App.tsx`** (righe ~313-320): rimpiazzare lo `<span class="lang-toggle seg">`
  con due `<button>` con un unico `<select class="lang-select">`.
  - Opzioni: `🇮🇹 Italiano` (value `it`), `🇬🇧 English` (value `en`).
  - `value={lang}`, `onChange={(e) => setLang(e.target.value as Lang)}`.
  - `aria-label={t("lang.switch")}`.
- **`web/src/styles.css`**: nuova regola `.lang-select` allineata allo stile di
  `.text-field select` (border `--border`, radius 7px, padding, font 12-13px,
  background `--input-bg` — vedi Feature 2). Rimuovere/sostituire le regole
  `.lang-toggle` non più usate.
- **i18n**: le chiavi `lang.it` / `lang.en` esistono già; l'emoji bandiera è
  inline nel JSX dell'opzione, non nel dizionario (è un simbolo, non testo
  traducibile).

### Vincoli / decisioni
- `<select>` **nativo** (non custom): a11y e comportamento mobile gratis.
- Nessuna modifica a `detectLang` / `setLang` / `LangProvider`: l'infrastruttura
  esistente resta invariata.

### Fuori scope
- Nessuna terza lingua.
- Nessun rilevamento regione oltre l'attuale `navigator.language`.

---

## Feature 2 — Tema scuro

### Obiettivo
Toggle a 2 stati (chiaro ↔ scuro). Al primo avvio segue
`prefers-color-scheme` del dispositivo; dopo la prima scelta manuale il tema
resta fisso e persiste in `localStorage`.

### Architettura — stato/logica
Nuovo modulo `web/src/theme/useTheme.tsx`, che ricalca il pattern di
`i18n/useT.tsx`:

- `ThemeProvider` + hook `useTheme()` → `{ theme, toggleTheme }` con
  `theme: "light" | "dark"`.
- **`detectTheme()`**: risoluzione iniziale
  1. `localStorage["theme"]` se vale `"light"` o `"dark"` → usalo;
  2. altrimenti `matchMedia("(prefers-color-scheme: dark)").matches` → `"dark"` / `"light"`;
  3. fallback `"light"`.
  Ogni accesso a `localStorage` / `matchMedia` in `try/catch` (SSR/test).
- Effetto: riflette `theme` su `document.documentElement` via
  `setAttribute("data-theme", theme)` (al mount e a ogni cambio).
- `toggleTheme()`: inverte il tema, aggiorna stato, scrive `localStorage["theme"]`,
  aggiorna `data-theme`.
- **Nessun listener** su `matchMedia` change: la preferenza di sistema conta solo
  al primo caricamento (scelta esplicita in fase di brainstorming, mantiene il
  modulo semplice).
- Montaggio: `ThemeProvider` avvolge l'app in `main.tsx` (accanto/dentro
  `LangProvider`).

#### Anti-flash (FOUC)
Per evitare un lampo di tema chiaro prima dell'idratazione React, uno snippet
inline nell'`index.html` (nel `<head>`, prima del bundle) legge
`localStorage["theme"]` / `matchMedia` e imposta subito
`document.documentElement.setAttribute("data-theme", …)`. `detectTheme()` userà
la stessa logica così che React resti coerente con l'attributo già impostato.

### Architettura — CSS
In `web/src/styles.css`:

- `:root` mantiene le variabili chiare attuali (`--bg --card --border --text
  --muted --accent`).
- Nuovo blocco `:root[data-theme="dark"]` che ridefinisce quelle stesse variabili
  con valori scuri (bg scuro, card leggermente più chiara, border tenue, text
  chiaro, muted grigio medio, accent invariato o leggermente schiarito per
  contrasto).
- **Completare l'estrazione in variabili** dei colori hardcoded che oggi
  romperebbero il tema scuro:
  - background input/select/share `#fff` → nuova var `--input-bg`
    (`.text-field input/select`, `.share-url`, `.lang-select`).
  - box tinti chiari → coppie di var tema-aware:
    `.demo-banner` (`#fff7ed`/`#fed7aa`/`#7c2d12`),
    `.crossover-note` (`#f5f3ff`/`#ddd6fe`/`#5b21b6`),
    `.consumption-disclaimer` (`#f59e0b`/tint).
  - `.glossary code` testo `#334155` → var.
- **Restano invariati** (leggibili su entrambi i temi): semantici
  `.pos`/`.metrics-table td.pos` (verde), `.neg`/`.err` (rosso), il tooltip
  `.info-bubble` (già bg scuro `#1f2933` + testo bianco).

### Architettura — grafici (approccio minimo)
Recharts riceve i colori come stringhe inline; assi/griglia/tick di default sono
grigio scuro → illeggibili su sfondo scuro. Approccio **minimo, solo neutri**:

- Nuovo hook leggero `web/src/theme/useChartNeutrals.ts` → `{ axis, grid, text }`
  in base al `theme` corrente (due palette costanti, nessun `getComputedStyle`).
- Negli **8 file chart** (`PowerChart`, `BatteryChart`, `AnnualOverview`,
  `MonthlyView`, `CashflowSection`, `CompareBars`, `CompareDayChart`,
  `consumption/ConsumptionPreview`): sostituire **solo** gli hex neutri
  (`#6b7280`, `#94a3b8`, `#9ca3af`, stroke griglia, `fill` dei tick/label assi)
  con i valori dell'hook.
- **Colori serie invariati** (blu `#3b82f6`/`#93c5fd`, verde `#16a34a`, rosso
  `#dc2626`, viola, ecc.): restano leggibili su scuro.
- Nota accettata: qualche fill chiaro (es. `#93c5fd` a bassa opacità) può stonare
  leggermente su scuro — accettabile in questa fase, non lo tocchiamo.

### UI — toggle
- Pulsante icona (`☀️` in tema scuro per "passa a chiaro" / `🌙` in tema chiaro
  per "passa a scuro") in `.header-top`, accanto al `.lang-select`.
- `aria-label` localizzato (nuove chiavi i18n `theme.toDark` / `theme.toLight`
  o simili) + `aria-pressed`.
- Classe `.theme-toggle` per lo stile (bottone icona, hover accent).

### Fuori scope (YAGNI)
- Nessun terzo stato "auto" esplicito.
- Nessun listener live sui cambi di tema di sistema dopo il primo avvio.
- Nessuna ricolorazione delle serie dei grafici.

---

## Testing
- **i18n/lingua**: verifica manuale che il `<select>` cambi lingua e persista in
  `localStorage` (comportamento invariato rispetto ai pulsanti).
- **tema**: test unitario su `detectTheme()` (priorità localStorage → matchMedia →
  fallback) con `localStorage`/`matchMedia` mockati; verifica che `toggleTheme`
  scriva `data-theme` e `localStorage`.
- **visivo**: giro manuale delle pagine principali (dashboard, confronto, wizard,
  grafici) in entrambi i temi per contrasto/leggibilità.

## File toccati (riepilogo)
- `web/index.html` — snippet anti-FOUC.
- `web/src/main.tsx` — montaggio `ThemeProvider`.
- `web/src/theme/useTheme.tsx` — nuovo (provider + hook + `detectTheme`).
- `web/src/theme/useChartNeutrals.ts` — nuovo (palette neutri per tema).
- `web/src/App.tsx` — `<select>` lingua + pulsante toggle tema.
- `web/src/styles.css` — palette dark, estrazione var, `.lang-select`, `.theme-toggle`.
- 8 componenti chart — swap dei soli colori neutri.
- dizionari i18n `it.ts` / `en.ts` — chiavi aria per il toggle tema.
