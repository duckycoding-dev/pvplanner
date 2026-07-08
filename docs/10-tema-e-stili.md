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
   Se ne aggiungi altri, verificane il contrasto sullo scuro (`--card` è molto
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
- `web/src/components/Sidebar.tsx` — dropdown lingua + pulsante toggle tema
  nella rail laterale (in basso su desktop, a sinistra su mobile).
