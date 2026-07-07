---
title: Build di produzione e deploy su Cloudflare Pages
last_updated: 2026-07-07
summary: Come si costruisce il bundle di produzione (bun run build → dist/), come verificarlo in locale (bun run preview, senza proxy), gli header di sicurezza (_headers con CSP), l'analytics cookieless e la checklist numerata delle azioni manuali di Davide per pubblicare su Cloudflare Pages.
status: draft
legend:
  - "dist/: output statico del build, servito da Cloudflare Pages"
  - "_headers: file Cloudflare Pages con gli header HTTP (nosniff, Referrer-Policy, CSP)"
  - "Pages Function: functions/api/pvgis.ts, il proxy PVGIS same-origin in produzione"
  - "preview: scripts/preview-dist.ts, server statico locale su dist/ SENZA proxy"
---

# Build di produzione e deploy

## Build

```sh
bun run build      # scripts/build-web.ts → dist/
bun run preview    # scripts/preview-dist.ts → http://localhost:4321
```

`scripts/build-web.ts` fa due cose: `Bun.build` di `web/index.html` (bundle TSX + import
JSON + CSS, minificato) e la copia di `web/public/*` in `dist/` (Bun.build da solo non
copia gli asset statici — `_headers` e `og.png` devono finire nella root di `dist/`).

`dist/` è in `.gitignore`: su Cloudflare Pages il build gira ad ogni push.

## Preview locale (failure mode voluto)

`bun run preview` serve `dist/` staticamente come farebbe Pages, **senza** il proxy
`/api/pvgis` (in produzione è la Pages Function `functions/api/pvgis.ts`). Di
conseguenza, nel preview:

- l'app parte normalmente (demo Roma, dashboard, glossario, toggle lingua);
- il fetch PVGIS dal wizard fallisce con un messaggio pulito (`HTTP 404`) — il
  preview risponde 404 esplicito su `/api/*` invece del fallback SPA, altrimenti il
  wizard riceverebbe 200+HTML e mostrerebbe un errore di parse;
- il file-drop dei JSON `seriescalc` nel wizard resta funzionante.

Questo è il comportamento atteso: verifica proprio questo, non un fetch riuscito.

## Header di sicurezza (`web/public/_headers`)

- `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`.
- CSP: `script-src 'self' https://static.cloudflareinsights.com 'sha256-…'` — l'hash
  copre lo script inline dell'analytics in `index.html`. Il token analytics vive in
  `<meta name="cf-analytics-token">`, quindi cambiarlo **non** cambia l'hash; se invece
  modifichi lo *script*, ricalcola l'hash (comando nel commento in `_headers`).
- `style-src 'unsafe-inline'`: richiesto dagli inline styles di Recharts.
- `connect-src`: `'self'` (proxy PVGIS) + `cloudflareinsights.com` (beacon) +
  `nominatim.openstreetmap.org` (ricerca località del wizard, fetch diretta dal browser).

## Analytics (cookieless, senza banner)

Cloudflare Web Analytics, snippet condizionato in `web/index.html`: si attiva solo se
`location.hostname` non è localhost **e** il token nel `<meta>` non è il segnaposto.
Nessun cookie → nessun banner necessario.

## Checklist deploy — [AZIONE DAVIDE]

1. **[AZIONE DAVIDE]** Pubblicare il repository su GitHub con visibilità **pubblica**
   (licenza AGPL-3.0 già nel file `LICENSE`).
2. **[AZIONE DAVIDE]** Cloudflare dashboard → **Workers & Pages → Pages → Connect to
   Git** → selezionare il repo. Build command: `bun run build`. Output directory:
   `dist`. La directory `functions/` viene rilevata automaticamente (Pages Functions →
   il proxy `/api/pvgis` va online da solo).
3. **[AZIONE DAVIDE]** Attivare **Web Analytics** nel dashboard Cloudflare e incollare
   il token nel `<meta name="cf-analytics-token">` di `web/index.html` (sostituendo
   `TODO-DAVIDE`).
4. **[AZIONE DAVIDE]** Dominio: configurare un dominio custom (CNAME dal dominio del
   blog) oppure tenere `*.pages.dev`. Nota aperta della spec: nome pubblico dell'app +
   dominio da decidere prima di questo punto.
5. **[AZIONE DAVIDE]** Riempire i `TODO-DAVIDE` residui: link blog / LinkedIn /
   donazioni in `web/src/components/Footer.tsx`, URL repo in
   `web/src/components/AboutPrivacy.tsx`, screenshot OG 1200×630 della dashboard demo
   in `web/public/og.png` (il tag `og:image` è già predisposto in `web/index.html`).
6. **[AZIONE DAVIDE]** Smoke test post-deploy: aprire l'app in produzione, eseguire il
   wizard con una località reale → il fetch via `/api/pvgis` deve funzionare (la Pages
   Function inoltra a PVGIS); verificare anche la condivisione via link (`#s=…`) tra
   due browser/profili.
7. **[AZIONE DAVIDE]** Tag release: `git tag v1.0.0 && git push --tags`.
