---
title: Handoff post-Fase 3 — cosa resta da fare
last_updated: 2026-07-07
summary: >
  Stato del progetto dopo il merge della Fase 3 (pubblicazione) e lavoro
  rimanente, diviso tra azioni manuali di Davide (deploy, placeholder,
  promozione) e lavoro generale futuro (NPV/sensitività, verdetto batteria,
  fix post-lancio).
status: draft
related:
  - 09-deploy.md
  - promozione-piano.md
  - plans/2026-07-06-fase3-pubblicazione.md
---

# Handoff — dopo Fase 3 (pubblicazione)

> Per chi riprende il lavoro (umano o agente). Repo: TypeScript + Bun, React via `bun build`, Recharts; niente Python, niente LLM a runtime.

## Stato al 2026-07-07

- **Fase 3 mergiata su main**: commit squash `3b9df8e feat: pubblicazione — i18n IT/EN, condivisione URL, deploy Cloudflare, AGPL (Fase 3)`. Branch di fase cancellato.
- `bun test`: **214 pass / 0 fail** (39 file). Build produzione ok (`bun run build` → `dist/`, `bun run preview` per verifica locale).
- Verificato nel browser da Davide: flusso completo e condivisione URL funzionano.
- Fasi 0-3 tutte chiuse. Piani eseguiti in `plans/` (fase0…fase3). Documentazione calcoli in `01…09`.
- Review whole-branch fatta: un fix applicato (unhandled rejection in `web/src/lib/shareSetup.ts`), testi legali verbatim verificati, hash CSP verificato contro il build.

## Cosa resta — AZIONI DI DAVIDE (manuali, no codice)

Checklist operativa completa e numerata: **[`09-deploy.md`](09-deploy.md)** (7 punti). In sintesi:

1. **Decidere nome pubblico + dominio** — questione aperta della spec, blocca il punto dominio del deploy e tutta la promozione. Criteri e idee in [`promozione-piano.md`](promozione-piano.md) § Prerequisiti.
2. Repo su GitHub, visibilità pubblica (licenza AGPL già nel repo).
3. Cloudflare Pages: connect repo, build `bun run build`, output `dist/`, functions dir `functions/`.
4. Attivare Cloudflare Web Analytics e incollare il token in `web/index.html` (meta `cf-analytics-token`, ora `TODO-DAVIDE`).
5. Riempire i placeholder `TODO-DAVIDE` nel codice (cerca con `grep -r TODO-DAVIDE`):
   - `web/src/components/Footer.tsx` — URL blog, LinkedIn, "Offrimi un caffè"
   - `web/src/components/AboutPrivacy.tsx` — URL repo GitHub
   - `web/public/og.png` — screenshot 1200×630 della dashboard demo (tag OG già pronto)
   - `README.md` — link demo live
6. Smoke test post-deploy: wizard con località reale → fetch via `/api/pvgis` in prod.
7. Tag release `v1.0.0`.

Poi, dal piano promozione: GIF ~20 s wizard→dashboard per il README, ed esecuzione del piano canali ([`promozione-piano.md`](promozione-piano.md): soft launch forum/Facebook → Reddit → Show HN → LinkedIn/blog → SEO — non richiede codice).

## Cosa resta — LAVORO GENERALE (implementazione / planning)

Nessuna fase pianificata è aperta. Backlog noto, in ordine di valore stimato:

1. **Feature deferite dalla roadmap**: **NPV/VAN** e **analisi di sensitività** (prezzo energia, degrado, costo batteria). Non pianificate: servono brainstorming + piano scritto (pattern collaudato: piano in `plans/`, branch di fase, squash merge).
2. **"Verdetto batteria"** — discussione aperta: dare una raccomandazione sintetica sì/no batteria sopra il confronto A/B. Decidere prima il modello (deterministico, trasparente, con disclaimer — vincolo: mai LLM a runtime).
3. **Fix post-soft-launch**: il piano promozione prevede di fixare i bug segnalati dal forum prima dello step Reddit — aspettarsi una mini-fase di manutenzione reattiva.
4. Minori, emersi in review Fase 3 (accettati, non bloccanti):
   - `viz.meta.consumptionNote` è baked nella lingua d'inserimento e non cambia col toggle lingua.
   - Warning/errori dei parser core CSV (`src/core/consumption/*`) restano in italiano (eccezione documentata; finiscono anche nei metadati salvati).
   - I messaggi `validate*` hanno perso i dettagli dinamici (es. quale falda) per traducibilità — reintroducibili con `t(key, vars)` se richiesto.
   - Se si modifica lo script inline analytics in `web/index.html`, ricalcolare l'hash sha256 nella CSP (`web/public/_headers`, istruzioni nel file stesso).

## Vincoli permanenti

- Solo modelli deterministici, mai LLM a runtime; disclaimer sulle stime obbligatori.
- TS + Bun, nessuna dipendenza nuova senza motivo forte.
- Lavoro incrementale, un passo alla volta; ogni calcolo documentato in `docs/` con frontmatter standard.
- Workflow: piano scritto → branch per fase → esecuzione → review finale → squash merge.
- Testi legali/attribuzione vincolanti verbatim (PVGIS © Unione Europea / European Union, OSM contributors, disclaimer stime) — non riformularli.

## Suggested skills (per un agente che riprende)

- `superpowers:brainstorming` → `superpowers:writing-plans` — prima di NPV/sensitività o verdetto batteria (feature nuove, serve design).
- `superpowers:executing-plans` — per eseguire il piano risultante (pattern usato per le fasi 0-3).
- `code-review` — review whole-branch prima di ogni squash merge.
- `verify` / `run` — verifica end-to-end nel browser dopo modifiche al flusso wizard/share.
- `deep-research` — eventuale verifica collisioni per il nome pubblico.
