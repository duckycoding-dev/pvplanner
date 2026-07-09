---
title: Spec — landing page PVVerdict (sotto-progetto A)
last_updated: 2026-07-09
summary: >
  Design approvato della landing page di PVVerdict: decisioni di prodotto
  (nome, dominio, routing lingue, one-pager), copy integrale IT ed EN per le
  8 sezioni, requisiti tecnici (Astro 7, Tailwind 4, Starwind UI, SEO,
  privacy del proxy) e nodi aperti. Output del brainstorming del 2026-07-09.
status: approved-pending-review
related:
  - ../handoff-landing-page.md
  - 2026-07-04-webapp-pubblica-design.md
  - ../promozione-piano.md
---

# Spec — landing page PVVerdict

## 1. Contesto e obiettivo

La landing è l'entrypoint SEO/marketing del tool PVVerdict (SPA React in
`web/`, deploy Cloudflare Pages). Obiettivo: intercettare le query italiane
sulla convenienza del fotovoltaico, comunicare il posizionamento
("numeri veri ora per ora, verdetto onesto") e mandare al tool. La SPA resta
magra: tutta la superficie indicizzata è la landing.

## 2. Decisioni chiave

| Tema | Decisione |
|---|---|
| Nome pubblico | **PVVerdict** (rename da PvPlanner completato in `main`, 2026-07-09) |
| Dominio | `pvverdict.com` + `pvverdict.app` (liberi al 2026-07-09; acquisto rimandato a ridosso del lancio, decisione proprietario) |
| Architettura URL | Landing su apex, tool su `app.` → due progetti Cloudflare Pages |
| Routing lingue | `/` = IT (x-default), `/en/` = EN, `/it/` → 301 su `/`. **Nessun redirect automatico** su Accept-Language (SEO). `hreflang` it/en/x-default su tutte. Avviso client-side "View in English →" se browser EN su pagina IT |
| Struttura | **One-pager**: 8 sezioni, nav e footer con anchor-scroll. FAQ con markup `FAQPage` schema.org |
| Stack | **Astro 7** + **Tailwind 4** + **Starwind UI** + **TypeScript 7**. Se Starwind non è ancora compatibile con Astro 7 → fallback Astro 6.x e upgrade dopo |
| Dove vive | In questa repo (repo unica per tool + landing): cartella `landing/` = un singolo progetto Astro con il proprio `package.json` (niente workspace o pacchetti multipli). Secondo progetto Cloudflare Pages con root directory `landing/`. Licenza AGPL-3.0 come il resto |
| Direzione visiva | "Solar editorial / data-confident": light-first, ambra `#f59e0b` + blu `#2563eb`, tipografia grande, layout asimmetrico, eroe = data-viz reale + box-verdetto. Mockup di riferimento: `docs/mockup_landing_page.html` |
| CTA primaria | "Prova il tool ora" → URL nudo dell'app (che apre la demo di Roma). Nessun parametro `?setup=1`: la demo come primo impatto è una scelta deliberata |

### Requisito di privacy vincolante (proxy PVGIS)

Il copy promette: *"il proxy non salva niente: inoltra e dimentica"*. Il
proxy Cloudflare verso PVGIS **non deve loggare né persistere** coordinate,
parametri o qualsiasi dato identificativo. Requisito da verificare in code
review del proxy prima del lancio: la frase deve restare vera per costruzione.

## 3. Copy — versione italiana (integrale, approvata)

### 3.1 Hero

- **H1:** Il fotovoltaico ti conviene davvero? Scoprilo coi numeri veri.
- **Sottotitolo:** PVVerdict simula il tuo impianto ora per ora coi dati
  PVGIS della tua zona — con o senza batteria, con le tue fasce orarie — e
  ti dà il verdetto: anni di rientro, risparmio, autoconsumo. Gratis, nel
  browser, senza account.
- **CTA:** `[ Prova il tool ora ]`
- **Microcopy sotto la CTA:** Si apre con un esempio già pronto (Roma):
  esplora i numeri, poi lancia il setup per la tua località. Due minuti.
- **Riga-fiducia:** Gratis · Open source · Senza account · I tuoi dati non
  lasciano il browser
- **Visual:** grafico giorno reale del tool (produzione/consumi/temperatura)
  + box-verdetto (anni di rientro, batteria sì/no, autoconsumo %).

### 3.2 Il problema

**H2: Perché un calcolatore fotovoltaico a medie mensili non può risponderti**

Quasi tutti i calcolatori online funzionano così: producibilità media annua,
un coefficiente di autoconsumo a spanne, risparmio stimato. Tre numeri, tre
problemi:

1. **Il sole e i tuoi consumi non vanno d'accordo per media.** L'impianto
   produce a mezzogiorno; la lavastoviglie parte alle 21. Quanto ti conviene
   dipende da quanto quelle due curve si sovrappongono, ora per ora — una
   media mensile non può saperlo.
2. **La batteria è la decisione più costosa, ed è quella che nessuno
   modella.** Migliaia di euro sì o no, decisi da quanta energia serale puoi
   davvero spostare. Senza simulare carica e scarica ogni ora dell'anno,
   qualsiasi risposta è un'opinione.
3. **Se paghi la luce a fasce, la media sbaglia proprio dove servono i
   soldi.** F1, F2, F3: lo stesso kWh autoconsumato vale diverso a seconda
   di *quando* lo consumi. Un coefficiente unico non lo vede.

PVVerdict simula le **8.760 ore del tuo anno** — produzione PVGIS della tua
zona, i tuoi consumi, la tua tariffa, con e senza batteria — e solo dopo
emette il verdetto.

### 3.3 Come funziona

**H2: Tre passi dal tetto al verdetto**

1. **La posizione.** Località sulla mappa, orientamento e inclinazione delle
   falde, potenza dei pannelli. PVVerdict scarica da PVGIS gli anni di dati
   climatici orari della tua zona — irraggiamento e temperatura veri, non
   tabelle generiche.
2. **I tuoi consumi.** Il CSV di e-distribuzione per la curva reale, oppure
   le bollette mensili o una stima guidata. Poi la tariffa: monoraria o a
   fasce F1/F2/F3. *Il file viene letto direttamente nel tuo browser:
   nessun dato viene inviato o salvato sui nostri server.*
3. **Il verdetto.** Anni di rientro, risparmio annuo, autoconsumo e
   autosufficienza. E il confronto fianco a fianco: con batteria contro
   senza, per capire se quei migliaia di euro in più si ripagano.

Micro-screenshot del wizard accanto a ogni passo.

### 3.4 Cosa vedi davvero

**H2: Cosa vedi davvero, numeri alla mano**

1. **Batteria: sì o no, fianco a fianco.** Due sistemi a confronto sulla
   stessa schermata — stesso tetto, stessi consumi, con e senza accumulo.
   Cicli anno, energia spostata, differenza di rientro: la decisione più
   cara diventa un confronto leggibile. *(screenshot: tab Confronto)*
2. **Il tuo anno, ora per ora.** Produzione, consumi e temperatura sul
   grafico del giorno: vedi quando produci, quando consumi e quanto si
   coprono. È qui che una media mensile smette di bastare.
   *(screenshot: esploratore giornaliero)*
3. **L'andamento economico, anno per anno.** La curva del capitale:
   investimento, incentivi, risparmi cumulati — e l'anno in cui la linea
   passa lo zero. *(screenshot: grafico "Andamento economico (cashflow
   cumulato)")*
4. **Le tue fasce, i tuoi prezzi.** F1, F2, F3 o monoraria: ogni kWh è
   valorizzato al prezzo dell'ora in cui lo consumi o lo immetti.
   *(screenshot: config tariffa / vista mensile per fasce)*

### 3.5 Cosa non modelliamo

**H2: Cosa non modelliamo (e perché te lo diciamo)**

Ogni stima ha dei confini. Questi sono i nostri:

- **Degrado di pannelli e batteria.** I moduli perdono qualche frazione di
  punto all'anno e la batteria capacità a ogni ciclo. Non lo simuliamo: su
  un rientro di 5-7 anni sposta poco, e preferiamo un modello semplice e
  verificabile a uno pieno di parametri invisibili.
- **Attualizzazione (NPV).** I risparmi futuri valgono meno di quelli di
  oggi. Il nostro cashflow è nominale: più facile da leggere e da
  controllare, meno "finanziariamente elegante".
- **Prezzi futuri dell'energia.** Nessuno li conosce. Usiamo la tua tariffa
  di oggi, costante: se l'energia rincara, il rientro sarà più veloce di
  quello che ti mostriamo.
- **Il tuo caso fiscale specifico.** Detrazioni e incentivi cambiano per
  situazione e per anno: inserisci tu l'importo che ti spetta, il tool non
  lo indovina.

Sono semplificazioni deliberate, tutte documentate. Preferiamo dirtele qui
che fartele scoprire dopo — è anche il motivo per cui il codice è aperto:
puoi controllare come calcoliamo, riga per riga.

### 3.6 Privacy / open source

**H2: I tuoi dati restano tuoi. E il codice lo puoi leggere.**

- **Tutto nel browser.** La simulazione gira sul tuo dispositivo: consumi,
  bollette e CSV non lasciano mai il browser. L'unica richiesta che esce è
  quella per i dati climatici: passa da un nostro proxy tecnico (serve per
  dialogare con PVGIS) e contiene solo le coordinate e i parametri
  dell'impianto — mai i tuoi consumi, mai nulla che ti identifichi. Il
  proxy non salva niente: inoltra e dimentica.
- **Nessun account.** Niente registrazione, niente email, niente
  newsletter. Apri e calcoli.
- **Open source (AGPL-3.0).** Ogni formula è pubblica e documentata. Se
  pensi che un calcolo sia sbagliato, puoi verificarlo — e dircelo.
- **Dati pubblici europei.** Le stime di produzione vengono da PVGIS, il
  servizio del Centro Comune di Ricerca della Commissione Europea. Non ci
  inventiamo i numeri: li prendiamo da chi li misura.

### 3.7 FAQ

**1. Conviene installare la batteria col fotovoltaico?**
Dipende da quanta energia produci quando non ci sei e quanta ne consumi
quando l'impianto tace: la batteria si ripaga solo se sposta abbastanza kWh
dalla giornata alla sera. Con consumi serali bassi può allungare il rientro
invece di accorciarlo. È un calcolo, non un'opinione: PVVerdict confronta lo
stesso impianto con e senza accumulo, ora per ora, e ti mostra la differenza
in anni ed euro.

**2. Quanti anni ci vogliono per rientrare dall'investimento?**
In Italia, tipicamente tra 4 e 9 anni — ma la forbice è ampia proprio perché
dipende da zona, autoconsumo, tariffa e incentivi. Qualunque numero secco
letto online vale poco per il tuo tetto. Il tool calcola il tuo cashflow
anno per anno, con il tuo costo d'impianto e la tua detrazione.

**3. Quanto produce davvero un impianto fotovoltaico nella mia zona?**
Tra Bolzano e Siracusa la stessa potenza può produrre il 30% in più o in
meno, e contano anche orientamento e inclinazione del tetto. PVVerdict usa i
dati storici orari di PVGIS (il servizio scientifico della Commissione
Europea) per la tua posizione esatta: non una media nazionale, il tuo punto
sulla mappa.

**4. Come scarico e uso la curva di carico di e-distribuzione?**
Dal portale e-distribuzione, nell'area riservata, puoi esportare i tuoi
consumi quartorari in CSV. Caricalo nel tool così com'è: viene letto
direttamente nel browser (non finisce su nessun server) e la simulazione
gira sui tuoi consumi reali, non su un profilo tipo.

**5. Le stime sono affidabili?**
Sono stime, e te lo diciamo chiaramente: usiamo anni di dati climatici
misurati, i tuoi consumi e la tua tariffa, ma non modelliamo il degrado dei
componenti né i prezzi futuri dell'energia. Ogni assunzione è documentata e
il codice è open source: puoi controllare come calcoliamo, formula per
formula.

**6. Il fotovoltaico conviene anche senza batteria?**
Spesso sì: il solo impianto ha il rientro più rapido, perché costa meno e
l'autoconsumo diretto è il risparmio più efficiente. La batteria è un
secondo investimento, da valutare a parte — ed è esattamente il confronto
che il tool ti mette davanti.

**7. I miei dati di consumo dove finiscono?**
Da nessuna parte: restano nel tuo browser. Niente account, niente upload,
niente tracciamento dei consumi. L'unica richiesta che esce è quella per i
dati meteo della tua località. Il progetto è open source proprio perché tu
non debba fidarti sulla parola.

### 3.8 CTA finale + footer

**H2: Pronto per i numeri veri?**

Due minuti di setup, nessun account. Il verdetto sul tuo tetto — rientro,
risparmio, batteria sì o no — calcolato sui tuoi dati, non su una media.

`[ Prova il tool ora ]`
*Si apre con l'esempio di Roma: esplora, poi lancia il setup per la tua
località.*

**Footer:**

- Prodotto: Apri il tool · Come funziona (anchor) · FAQ (anchor)
- Progetto: Codice sorgente (GitHub) · Licenza AGPL-3.0 · Cosa non
  modelliamo (anchor)
- Dati e privacy: Privacy — nessun dato raccolto (anchor) · Dati climatici:
  PVGIS © Unione Europea · Blog *(placeholder, quando esisterà)*
- Riga finale: © 2026 PVVerdict · Fatto in Italia · IT / EN

## 4. Copy — versione inglese (riscritta per lingua, da revisionare)

Principio: non traduzione meccanica. Differenze deliberate: e-distribuzione
presentata come esempio di export smart-meter (il pubblico EN non lo
conosce); "fasce F1/F2/F3" resa come *time-of-use rates* con F1/F2/F3 citate
come istanza italiana; toni e idiomi nativi EN.

### 4.1 Hero

- **H1:** Is rooftop solar actually worth it? Find out with real numbers.
- **Sub:** PVVerdict simulates your system hour by hour on PVGIS climate
  data for your location — with or without a battery, with your
  time-of-use rates — and gives you the verdict: payback years, savings,
  self-consumption. Free, in your browser, no account.
- **CTA:** `[ Try the tool now ]`
- **Microcopy:** Opens with a ready-made example (Rome): explore the
  numbers, then run the setup for your own location. Two minutes.
- **Trust row:** Free · Open source · No account · Your data never leaves
  your browser

### 4.2 The problem

**H2: Why monthly-average solar calculators can't answer you**

Most online calculators work the same way: average annual yield, a
rule-of-thumb self-consumption factor, an estimated saving. Three numbers,
three problems:

1. **The sun and your consumption don't overlap on average.** Your panels
   peak at noon; your dishwasher runs at 9 pm. What you actually save
   depends on how those two curves overlap, hour by hour — a monthly
   average can't know that.
2. **The battery is the most expensive decision, and the one nobody
   models.** Thousands of euros, yes or no, decided by how much evening
   consumption you can really shift. Without simulating charge and
   discharge for every hour of the year, any answer is an opinion.
3. **If you're on time-of-use rates, averages fail exactly where the money
   is.** The same self-consumed kWh is worth a different amount depending
   on *when* you use it. A single factor can't see that.

PVVerdict simulates **all 8,760 hours of your year** — PVGIS production for
your location, your consumption, your tariff, with and without a battery —
and only then delivers the verdict.

### 4.3 How it works

**H2: Three steps from your roof to the verdict**

1. **Your location.** Pick your spot on the map, set roof orientation,
   tilt and panel power. PVVerdict downloads years of hourly climate data
   for your area from PVGIS — measured irradiance and temperature, not
   generic tables.
2. **Your consumption.** Upload your smart-meter export for a real load
   curve (Italy's e-distribuzione CSV is supported out of the box), or
   start from monthly bills or a guided estimate. Then your tariff: flat
   or time-of-use. *Files are read directly in your browser: nothing is
   uploaded to or stored on our servers.*
3. **The verdict.** Payback years, annual savings, self-consumption and
   self-sufficiency. Plus the side-by-side comparison: with battery versus
   without, to see whether the extra thousands pay for themselves.

### 4.4 What you actually see

**H2: What you actually see, numbers in hand**

1. **Battery: yes or no, side by side.** Two systems on one screen — same
   roof, same consumption, with and without storage. Cycles per year,
   energy shifted, payback difference: the most expensive decision becomes
   a readable comparison.
2. **Your year, hour by hour.** Production, consumption and temperature on
   the daily chart: see when you produce, when you consume, and how much
   they overlap. This is where monthly averages stop being enough.
3. **The economics, year by year.** The capital curve: investment,
   incentives, cumulative savings — and the year the line crosses zero.
4. **Your rates, your prices.** Time-of-use or flat: every kWh is valued
   at the price of the hour you use or export it.

### 4.5 What we don't model

**H2: What we don't model (and why we tell you)**

Every estimate has boundaries. These are ours:

- **Panel and battery degradation.** Modules lose a fraction of a percent
  per year, batteries lose capacity with every cycle. We don't simulate
  it: over a 5–7 year payback it moves little, and we prefer a simple,
  verifiable model to one full of invisible parameters.
- **Discounting (NPV).** Future savings are worth less than today's. Our
  cashflow is nominal: easier to read and to check, less "financially
  elegant".
- **Future energy prices.** Nobody knows them. We use your current tariff,
  held constant: if prices rise, your payback will be faster than what we
  show.
- **Your specific tax situation.** Deductions and incentives vary by
  country, situation and year: you enter the amount you're entitled to,
  the tool doesn't guess it.

These are deliberate simplifications, all documented. We'd rather tell you
here than have you find out later — it's also why the code is open: you can
check how we calculate, line by line.

### 4.6 Privacy / open source

**H2: Your data stays yours. And you can read the code.**

- **Everything in the browser.** The simulation runs on your device: your
  consumption, bills and CSV files never leave the browser. The only
  request that goes out is for climate data: it passes through our
  technical proxy (needed to talk to PVGIS) and contains only coordinates
  and system parameters — never your consumption, never anything that
  identifies you. The proxy stores nothing: it forwards and forgets.
- **No account.** No sign-up, no email, no newsletter. Open and calculate.
- **Open source (AGPL-3.0).** Every formula is public and documented. If
  you think a calculation is wrong, you can verify it — and tell us.
- **Public European data.** Production estimates come from PVGIS, the
  scientific service of the European Commission's Joint Research Centre.
  We don't invent numbers: we take them from the people who measure them.

### 4.7 FAQ

**1. Is a battery worth adding to solar panels?**
It depends on how much you produce while you're out and how much you
consume after sunset: a battery only pays for itself if it shifts enough
kWh from day to evening. With low evening consumption it can lengthen your
payback instead of shortening it. It's a calculation, not an opinion:
PVVerdict compares the same system with and without storage, hour by hour,
and shows you the difference in years and euros.

**2. How many years does it take for solar to pay for itself?**
In southern Europe, typically 4 to 9 years — a wide range precisely because
it depends on location, self-consumption, tariff and incentives. Any single
number you read online says little about your roof. The tool computes your
cashflow year by year, with your system cost and your incentives.

**3. How much does a solar system actually produce in my area?**
The same installed power can yield 30% more or less across a single
country, and roof orientation and tilt matter too. PVVerdict uses hourly
historical data from PVGIS (the European Commission's scientific service)
for your exact position: not a national average — your point on the map.

**4. Can I use my smart-meter data?**
Yes. Upload your distributor's consumption export (Italy's e-distribuzione
quarter-hourly CSV is supported natively; generic CSV formats work too) and
the simulation runs on your real load curve instead of a standard profile.
The file is read directly in your browser — it never reaches any server.

**5. How reliable are the estimates?**
They're estimates, and we say so plainly: we use years of measured climate
data, your consumption and your tariff, but we don't model component
degradation or future energy prices. Every assumption is documented and the
code is open source: you can check how we calculate, formula by formula.

**6. Is solar worth it even without a battery?**
Often yes: panels alone usually have the fastest payback, because they cost
less and direct self-consumption is the most efficient saving. The battery
is a second investment, to be judged on its own — and that's exactly the
comparison the tool puts in front of you.

**7. Where does my consumption data end up?**
Nowhere: it stays in your browser. No account, no upload, no tracking of
your consumption. The only outgoing request is for the climate data of your
location. The project is open source precisely so you don't have to take
our word for it.

### 4.8 Final CTA + footer

**H2: Ready for the real numbers?**

Two minutes of setup, no account. The verdict on your roof — payback,
savings, battery yes or no — computed on your data, not on an average.

`[ Try the tool now ]`
*Opens with the Rome example: explore, then run the setup for your own
location.*

Footer: same structure as IT ("Made in Italy" nella riga finale).

## 5. Requisiti tecnici

- **SEO on-page:** una sola `<h1>` per lingua; keyword negli `<h2>` e nelle
  FAQ; meta description per lingua; OG tags + immagine OG dedicata;
  `@astrojs/sitemap`; `hreflang` it/en/x-default; markup `FAQPage`
  (JSON-LD) sulle 7 FAQ; canonical per pagina.
- **Performance:** zero-JS di default (Astro islands solo se servono);
  immagini ottimizzate (screenshot in WebP/AVIF con fallback, dimensioni
  esplicite per CLS); font self-hosted; target Lighthouse ≥95 su
  performance/SEO/accessibilità.
- **i18n:** routing Astro `/` (it) e `/en/`; `/it/` → redirect 301 a `/`
  (regola `_redirects` di Cloudflare Pages); copy per lingua da questa
  spec, non tradotto a runtime; avviso "View in English →" client-side
  (unica isola JS ammessa oltre a eventuale nav mobile).
- **Deploy:** progetto Cloudflare Pages dedicato, root `landing/`, build
  Astro statica. Dominio apex quando acquistato; nel frattempo
  `<nome>.pages.dev`.
- **Assets da produrre:** screenshot del tool per sezioni 3/4 (riusare la
  pipeline Playwright della sessione 2026-07-09: `scratchpad/logofix/shots.ts`
  come base — server locale + playwright-core + Chrome di sistema);
  immagine OG; grafico-eroe (statico, derivato dalla demo Roma) +
  box-verdetto.
- **Vincolo proxy no-log:** vedi §2 — requisito bloccante per il lancio.
- **Niente analytics** in v1 (coerente col copy privacy). Se in futuro
  servisse, solo aggregato privacy-preserving e va aggiornata la sezione 6.

## 6. Nodi aperti

1. **Acquisto domini** `pvverdict.com`/`.app` — rimandato a ridosso del
   lancio (decisione proprietario, consapevole del rischio squatting).
2. **Compatibilità Starwind UI con Astro 7** — verificare a inizio
   implementazione; fallback Astro 6.x.
3. **Grafico-eroe:** screenshot reale del tool vs ri-render statico
   (SVG/immagine) più curato — da decidere in fase di design visivo.
4. **Sotto-progetto B (modale di benvenuto in-app):** fuori da questa spec,
   da brainstormare dopo il lancio della landing.

## 7. Prossimo passo

Piano di implementazione con la skill superpowers:writing-plans
(`docs/plans/…-landing-implementazione.md`), poi scaffold `landing/` su
branch dedicato.
