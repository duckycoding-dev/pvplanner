---
title: Handoff — landing page PVVerdict + modale di benvenuto (pre-lancio)
last_updated: 2026-07-09
summary: >
  Stato del brainstorming pre-pubblicazione su due sotto-progetti indipendenti:
  (A) una landing page separata come entrypoint SEO verso il tool, (B) una
  modale di benvenuto in-app con CTA share/donazione. Decisioni prese, nodi
  aperti e prossimi passi per riprendere in una chat nuova.
status: draft
related:
  - promozione-piano.md
  - specs/2026-07-04-webapp-pubblica-design.md
---

# Handoff — landing page + modale di benvenuto

> Documento di ripresa. Il brainstorming è stato interrotto per mancanza di
> tempo; **non è stato scritto codice né spec/piano** per questi due
> sotto-progetti. La prossima sessione riparte dal brainstorming.

## Contesto

Prima di pubblicizzare il tool (**PVVerdict**, la SPA React di analisi FV in
questa repo, oggi su Cloudflare Pages) sono emerse due idee, trattate come
**sotto-progetti indipendenti**:

- **(A) Landing page separata** — sito nuovo, ottimizzato SEO/performance, che
  fa da entrypoint e manda al tool. Tiene la SPA React "magra" senza riempirla
  di SEO.
- **(B) Modale di benvenuto in-app** — con CTA per condividere sui social e/o
  donare, con flag "non mostrare più" in localStorage.

Le decisioni di dettaglio già cristallizzate sono nella memoria persistente:
**`memory/webapp-landing-e-dominio.md`** (leggerla per prima). Vedi anche
`docs/promozione-piano.md` (piano canali di lancio) e la spec di pubblicazione.

## Decisioni prese (sotto-progetto A — landing)

- **Nome pubblico: PVVerdict** (deciso 2026-07-09; sostituisce PvPlanner,
  scartato perché lo spazio nomi "PV Planner" è affollato — Solargis pvPlanner,
  ETU PV Planner, ValkPVplannerPro, app iOS omonima — quindi SEO branded
  impossibile). Criterio scelta: "verdetto/decisione + solare"; "verdict" è
  parola-ponte IT/EN ed è coerente col box-verdetto eroe della landing.
  Scartati nella rosa: PVOptimizer (nome-categoria hardware), PVInfo (collide
  con PV InfoLink), PVArchitect (promette design pro).
- **Dominio:** `pvverdict.com` e `pvverdict.app` **entrambi liberi** al
  2026-07-09 (verifica whois/RDAP) — acquisto a carico del proprietario,
  possibile prenderli entrambi con redirect. Il blog personale del proprietario
  è su `duckycoding.dev` (Astro+markdown) e **non** va usato per app/landing.
- **Architettura URL:** landing su apex (es. `pvverdict.com`), tool su
  sottodominio (`app.pvverdict.com`) → due progetti Cloudflare Pages
  indipendenti, deploy separati. Scartato il path `/app` (routing più fragile,
  beneficio SEO nullo perché la SPA non è la superficie indicizzata).
- **Stack:** **Astro + Tailwind v4 + Starwind UI** (componenti shadcn-like per
  Astro, vanilla JS, "own the code", ha anche un MCP server per uso via AI).
  Zero-JS quasi ovunque; design **custom** sopra (niente template, per non
  risultare "banale"). Scartati: HTML puro (troppa config a mano), Next
  (sovradimensionato per landing statica).
- **Direzione visiva:** **"Solar editorial / data-confident"** — light-first,
  accento **ambra `#f59e0b`** + **blu `#2563eb`** secondario, tipografia grande
  e sicura, layout asimmetrico; l'**eroe è la data-viz reale** del tool
  (grafico giorno con produzione/consumi/temperatura) + **box-verdetto**
  (rientro anni, batteria sì/no, autoconsumo %). Scartate le direzioni
  "night-sky dark" (troppo techie per il target) e "warm approachable"
  (rischio generico).
  - Mockup di riferimento (privato, indicativo): artifact
    `https://claude.ai/code/artifact/e806c151-1c9c-4031-bc1b-e6660920e40f`
    (mostra Direzione 1 e Direzione 3 a confronto; scelta = Direzione 1).

### Struttura landing concordata (8 sezioni)

1. **Hero** (tesi): titolo + sottotitolo + CTA + grafico reale + box-verdetto +
   riga-fiducia.
2. **Il problema** — "i calcolatori online sono giocattoli" (medie mensili,
   niente batteria, niente fasce). Posizionamento per contrasto.
3. **Come funziona** — 3 passi: *località → i tuoi consumi → il verdetto*, con
   micro-screenshot del wizard.
4. **Cosa vedi davvero** — 3-4 feature con screenshot reali (PVGIS ora per ora,
   confronto con/senza batteria, fasce F1/F2/F3, curva di rientro).
5. **Cosa NON modelliamo (e perché)** — onestà esplicita (degrado, NPV…):
   costruisce fiducia, coerente con la linea "trasparenza sulle stime".
6. **Privacy / open source** — nessun dato lascia il browser, no account, AGPL.
7. **FAQ** — miniera SEO: 6-8 domande sulle query target ("Conviene la
   batteria?", "Quanti anni per rientrare?", "Come leggo il CSV di
   e-distribuzione?", "I dati sono affidabili?").
8. **CTA finale + Footer** (link al tool, repo, privacy, futuro blog).

Trasversali: **i18n IT/EN** (routing Astro `/` e `/en`, copy scritto per lingua,
non tradotto meccanicamente); SEO (una sola `<h1>`, keyword negli `<h2>`/FAQ,
meta/OG, `@astrojs/sitemap`).

## Decisioni/orientamenti (sotto-progetto B — modale di benvenuto)

- **Non** mostrarla al primo caricamento (chiedere share/donazione prima di aver
  dato valore converte male e infastidisce). Mostrarla **dopo che l'utente ha
  visto i suoi numeri** (es. dopo il completamento del wizard / prima
  interazione significativa).
- Flag "non mostrare più" in **localStorage**. Da definire il trigger esatto
  (timestamp, N interazioni, evento "analisi completata").
- Priorità più bassa della landing. Ancora tutto da brainstormare nel dettaglio
  (contenuti, trigger, design coerente col tema chiaro/scuro dell'app).

## Prossimi passi (per la chat nuova)

1. Rileggere `memory/webapp-landing-e-dominio.md` e questo handoff.
2. Completare il **rename PvPlanner → PVVerdict**: comprare dominio/i
   (`pvverdict.com`/`.app`), rinominare repo GitHub e progetto Cloudflare
   Pages, rigenerare il logo con testo (a carico del proprietario); le
   occorrenze nel codice sono già aggiornate (branch/commit di rename).
3. ~~Brainstorming landing → spec → piano → implementazione~~ **FATTO
   (2026-07-10)**: copy IT+EN approvato, spec
   (`docs/superpowers/specs/2026-07-09-landing-page-design.md`), piano
   (`docs/superpowers/plans/2026-07-09-landing-page.md`), sito Astro
   implementato in `landing/`. **Deploy fatto (2026-07-10):**
   `https://pvverdict-landing.pages.dev/` (progetto `pvverdict-landing`, root
   `landing/`, tool su `pvverdict.pages.dev`). Lighthouse su CDN:
   **97/100/100/100** (SEO 100 dopo fix robots.txt). Resta: acquisto domini
   (all'acquisto aggiornare `landing/src/config.ts`, `astro.config.mjs` e
   l'URL Sitemap in `landing/public/robots.txt`), verifica no-log del proxy
   PVGIS prima del lancio pubblico.
4. Solo dopo, brainstormare il **sotto-progetto B** (modale di benvenuto).

## Migliorie note della landing (non bloccanti)

Rilevate durante l'implementazione (2026-07-10), da riprendere con calma:

- **`shots/*/wizard-2.webp` fuorviante:** è il pannello Consumi del menu in
  stato demo ("Esegui prima il setup della tua località"), non la vera UI di
  caricamento consumi. Rifarlo a mano dopo un setup completo, o adattare
  `landing/scripts/screenshots.ts` per attraversare il wizard fino allo step
  Consumi.
- **OG image unica in italiano:** `landing/public/og.png` ha il claim IT anche
  per la pagina `/en/`. Generare una `og-en.png` e differenziare il meta
  `og:image` per lingua in `Base.astro`.
- **Performance 94 (target 95):** il residuo è il peso dell'immagine hero su
  4G simulato; eventuale `srcset` responsive (versione ~700px per mobile) la
  porta sopra soglia. Su CDN reale probabilmente già ok: rimisurare dopo il
  deploy.
- **Logo con tagline legacy:** il logo attuale porta ancora "PLAN · ANALYZE ·
  OPTIMIZE" (era di PvPlanner); valutare una tagline coerente col verdetto
  (es. "ANALYZE · COMPARE · DECIDE") quando si rimette mano alla grafica.

## Stato repo

- Branch `main`, working tree pulito. L'ultima feature (selettore lingua a
  dropdown + tema scuro + linea temperatura nei grafici) è stata **merge-squash
  in main** (commit `feat(web): selettore lingua a dropdown, tema scuro e linea
  temperatura nei grafici`); **non** ancora pushata su origin.
- Nessun file relativo a landing/modale creato: sono progetti nuovi da avviare.

## Suggested skills

- **superpowers:brainstorming** — per riprendere e chiudere il design della
  landing (copy sezione per sezione, poi EN), una domanda/tema alla volta in
  **forma discorsiva** (vedi `memory/prefers-conversational-brainstorming.md`:
  l'utente preferisce Q&A in prosa, non i prompt a scelta multipla).
- **superpowers:writing-plans** — dopo l'approvazione della spec landing.
- **frontend-design** — in fase di implementazione della landing (direzione
  "solar editorial / data-confident").
