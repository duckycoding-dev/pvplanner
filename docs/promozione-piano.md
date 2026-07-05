---
title: Piano di promozione
last_updated: 2026-07-06
summary: >
  Piano operativo per il lancio pubblico del tool: prerequisiti, sequenza
  canali (soft launch → Reddit → Show HN → LinkedIn/blog → SEO), bozze dei
  post, misurazione. Eseguibile da Davide, non richiede codice.
status: draft
related:
  - specs/2026-07-04-webapp-pubblica-design.md
  - plans/2026-07-06-fase3-pubblicazione.md
---

# Piano di promozione

## Prerequisiti (bloccanti — dalla Fase 3)

- [ ] App deployata e stabile su dominio definitivo; smoke test wizard su 2-3 località
- [ ] Demo mode istantanea: chi apre il link vede grafici veri in <10 s senza setup
- [ ] Meta OG + screenshot 1200×630 curato (l'anteprima nel feed decide il click)
- [ ] README EN con GIF del flusso wizard→dashboard (~20 s, registrala con l'app demo)
- [ ] Nome pubblico deciso (questione aperta della spec) — criteri: pronunciabile in EN, dominio libero, cerca collisioni. Idee da vagliare: "SolarVerdict", "PVWorth", "Vale il fotovoltaico?"/"IsPVWorthIt"
- [ ] Pagina Info/Privacy online (è un punto di forza da linkare, non solo compliance)

## Sequenza canali

### Settimana 1 — Soft launch (pubblico esatto, feedback prima del pubblico grande)

**forum-fotovoltaico.it** (sezione presentazione progetti/software) e 1-2 gruppi Facebook "Fotovoltaico Italia". Obiettivo: bug reali, richieste vere, prime testimonianze. Tono genuino, zero marketing:

> Ciao a tutti, dovevo decidere impianto e batteria per casa mia e non trovavo
> un tool che rispondesse davvero a "conviene? e la batteria?" coi numeri della
> MIA casa. Così me lo sono costruito e l'ho messo online gratis: dati solari
> PVGIS ora per ora per la tua località, consumi tuoi (anche il CSV del portale
> e-distribuzione), confronto con/senza batteria, fasce F1/F2/F3, anni di
> rientro. Tutto nel browser, niente registrazione, open source.
> [link] — feedback molto graditi, soprattutto se i numeri vi tornano/non vi tornano.

Rispondere a TUTTO nei primi giorni. Fixare i bug segnalati prima dello step 2.

### Settimana 2-3 — Reddit

Ordine: r/fotovoltaico (IT) → r/ItaliaPersonalFinance (angolo economico: "ho costruito un tool gratuito per calcolare il rientro del FV") → r/solar e r/eupersonalfinance (EN). Leggere le regole di ogni sub prima (alcuni richiedono flair/thread dedicati per self-promo). Post EN:

> I built a free, open-source PV + battery ROI calculator using EU PVGIS
> hourly data (no account, everything runs in your browser)
>
> I was quoting solar for my house and every "calculator" online was a toy —
> flat monthly averages, no battery modeling, no time-of-use tariffs. So I
> built what I wanted: hourly PVGIS data for your exact roof (azimuth/tilt per
> section), your real consumption (CSV upload or parametric heat-pump model),
> DC-coupled battery simulation, time-of-use pricing, payback curves, A/B
> system comparison. AGPL, no backend, your data never leaves the browser.
> Feedback welcome — especially from people who can sanity-check the numbers.

### Settimana 3-4 — Show HN

Fit forte: open source, client-side, dati pubblici EU, niente account, privacy by design. Titolo: `Show HN: Free PV + battery ROI simulator on EU PVGIS hourly data (browser-only)`. Primo commento tuo: architettura (Bun, motore puro condiviso CLI/browser, proxy 30 righe), le scelte di modellazione oneste (cosa NON modelli: degrado, NPV — e perché), invito a bucare i numeri. Martedì/mercoledì, 14:00-16:00 CEST (mattina USA East). Se flop: riprovare una volta dopo settimane con titolo diverso è accettato.

### Settimana 4+ — LinkedIn + blog (continuativo)

- LinkedIn: post-racconto IT e EN separati (non bilingue nello stesso post): problema personale → costruzione → cosa ho imparato sui numeri del FV → link. Il taglio "ecco cosa ho scoperto sui numeri" (es. "la batteria si ripaga solo se…") rende più del taglio "ho fatto un tool".
- Blog: serie tecnica, 1 articolo ogni 1-2 settimane, ognuno linka il tool:
  1. "Conviene la batteria? Cosa dicono i numeri ora per ora" (il verdetto batteria — il tuo contenuto più forte)
  2. "Il clipping dell'inverter: quanta energia perdi davvero (e quando la recupera la batteria)"
  3. "PVGIS spiegato: come leggere i dati solari della tua zona"
  4. "Quanto costa il fotovoltaico nel 2026: capex, detrazione, rientro"
- Ogni articolo = potenziale post LinkedIn/Reddit derivato.

### Lungo periodo — SEO

Query target IT (volume reale, concorrenza scadente): "conviene batteria fotovoltaico", "calcolo rientro fotovoltaico", "simulatore fotovoltaico gratuito", "autoconsumo fotovoltaico calcolo". La tool-page + gli articoli blog coprono queste query; interlink blog↔tool. EN (più competitiva): "PVGIS calculator with battery", "solar battery payback calculator Europe".

### Contorno (quando capita)

- GitHub: topics (`solar`, `photovoltaic`, `pvgis`, `energy`, `typescript`, `bun`), PR alle liste awesome (awesome-solar, awesome-sustainability-jobs? verificare fit)
- Product Hunt: bassa priorità, eventualmente dopo che HN/Reddit hanno validato il messaggio
- Rispondere a thread esistenti ("che ne pensate di questo preventivo?") nei forum/subreddit linkando il tool SOLO quando davvero pertinente — è il canale a conversione più alta e a rischio spam più alto: sempre con analisi nel merito, mai link secco

## Misurazione

- Cloudflare Web Analytics: referrer per canale → raddoppiare su ciò che porta traffico, mollare il resto
- Proxy `/api/pvgis` count (dashboard CF) ≈ setup completati = metrica di attivazione vera (visite ≠ uso)
- GitHub stars/issues = proxy dell'interesse tecnico
- Rivedere dopo 30 giorni: se un canale ha portato >50% delle attivazioni, investirci il mese successivo

## Regole d'ingaggio (tutti i canali)

1. Sempre dichiarare "l'ho costruito io" — la trasparenza è il pitch
2. Mai promettere accuratezza assoluta: "stime, ecco le assunzioni" (linka la pagina Info)
3. Rispondere alle critiche tecniche nel merito coi numeri; le richieste di feature → GitHub issues
4. Niente cross-post simultaneo: un canale alla volta, imparando dal precedente
