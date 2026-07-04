---
title: Webapp pubblica — setup wizard, consumi, pubblicazione
last_updated: 2026-07-04
summary: >
  Design per trasformare la dashboard locale in un tool pubblico: correzioni al
  motore (fase 0), wizard di setup che sostituisce gli script CLI (fetch PVGIS
  dal browser via proxy), sistema di inserimento consumi (CSV, template mensili,
  modello fisico parametrico), pubblicazione (i18n IT+EN, deploy Cloudflare
  Pages, licenza AGPL, privacy) e piano di promozione.
status: draft
legend:
  - "falda: una orientazione del tetto (= una stringa = un MPPT)"
  - "dataset di base: serie orarie PVGIS + consumi in forma canonica, salvati in IndexedDB"
  - "forma canonica (consumi): array di 8760 kWh/ora + metadati di provenienza"
  - "accoppiamento DC/AC: dove si collega la batteria (bus DC dell'ibrido vs lato AC)"
related:
  - 01-downloader-pvgis.md
  - 03-simulazione-batteria.md
  - 07-consumi.md
---

# Webapp pubblica — design

## Obiettivo

Pubblicare gratuitamente la dashboard come tool online completo: chiunque deve
poter fare quello che oggi fanno gli script CLI (scaricare i dati PVGIS per la
propria località e falde) direttamente dal browser, inserire i propri consumi
reali o stimati, e ottenere l'analisi economica FV + batteria. Il flusso CLI
locale resta per sviluppo e test golden.

**Decisioni di prodotto prese:**

| Decisione | Scelta |
|---|---|
| Pubblico target | Italia-first, UI bilingue IT + EN |
| Setup salvati | Uno attivo (export/import JSON copre backup/condivisione; multi-profilo rimandato) |
| Metodi consumo | CSV (orario/quartorario), template mensili manuali, modello fisico parametrico. NO totale annuo secco |
| Monetizzazione | Gratuito, attribuzione + donazioni (Buy me a coffee / GitHub Sponsors). Niente ads, niente account |
| Licenza | **AGPL-3.0**, repo pubblica (PVGIS non vincola la licenza del codice; richiede solo attribuzione dati) |
| Deploy | **Cloudflare Pages** + Pages Function per il proxy + Cloudflare Web Analytics (senza cookie, senza banner) |
| Hardware DB | Escluso (overkill): campi liberi, l'utente legge il datasheet. Eventuali preset "tipici" solo come valori iniziali, in futuro |

## Fase 0 — correzioni al motore (prima di tutto il resto)

1. **Fix DST nel profilo sintetico**: la sagomatura oraria del carico usa UTC+1
   fisso (`houseLoad.ts:72-73`) mentre le fasce tariffarie usano l'ora locale
   corretta (DST-aware, `writeVizJson.ts:19-30`) → in estate i picchi del carico
   cadono 1 h fuori fascia. Fix: estrarre l'utility ora-locale in `src/core`,
   parametrizzata per timezone IANA (non più hardcoded Europe/Rome), e usarla
   anche nella sagomatura. I golden test si aggiornano una volta, con valori
   verificati a mano.
2. **Accoppiamento batteria DC/AC**: oggi il dispatch vede solo la produzione
   post-clipping (`computeSystem.ts:133-138`) — corretto per batterie
   AC-coupled, sbagliato per inverter ibridi DC-coupled (la Viessmann del caso
   base), dove il surplus sopra il cap AC può caricare la batteria. Fix: campo
   `coupling: "dc" | "ac"` nella config batteria, default `dc`; nel percorso DC
   il dispatch vede la produzione pre-clip e l'uscita AC (carico + export +
   scarica) resta limitata dal cap dell'inverter. Percorso AC = comportamento
   attuale invariato. Test: caso DC con surplus sopra il cap carica la batteria;
   caso AC riproduce i golden attuali. Toggle nell'editor batteria esistente,
   con InfoTip che spiega quale scegliere.
3. **Round-trip da config**: la CLI legge `battery.round_trip` (default 0.9 —
   valore tipico AC-to-AC per sistemi LFP domestici: ≥96% DC × conversioni
   inverter) invece della costante hardcoded. In UI era già editabile.
4. **Rimozione codice/dati morti**: job DRcalc + MRcalc fuori da `download.ts`
   (~26 chiamate PVGIS mai consumate), file dati relativi eliminati,
   `syntheticSource.ts` (V1) eliminato — git è l'archivio. Test riferiti puliti.
5. **Docs**: `03-simulazione-batteria.md` guadagna la sezione accoppiamento;
   `07-consumi.md` annota il fix DST.

**Esclusi consapevolmente** (decisi, non dimenticati): costo sostituzione
batteria, degrado pannelli/batteria, inflazione prezzi, NPV/TIR — rimandati
(troppe assunzioni arbitrarie a 10+ anni; sensibilità futura eventualmente).
L'orizzonte cashflow resta com'è.

## Setup wizard

Sostituisce gli script CLI per l'utente web. Si apre al primo accesso (con
banner "Dati demo — esegui il setup per il tuo caso reale"); rientrabile in
ogni momento dalla sidebar, campi precompilati dal setup salvato.

### Passi

1. **Località** — ricerca testuale (geocoding Nominatim, gratuito, CORS ok,
   attribuzione "© OpenStreetMap contributors") + campi lat/lon editabili
   (incolla da Google Maps). Timezone suggerita dal browser, dropdown IANA
   editabile. Calcolo orizzonte attivo di default (toggle avanzato).
2. **Tetto (falde)** — righe ripetibili: nome, azimuth (convenzione PVGIS,
   hint bussola: 0=S, −90=E, +90=O), inclinazione, n° pannelli, Wp modulo.
   Comuni: posa (integrata/libera), perdite sistema % (default 14), database
   radiazione (SARAH3 default; ERA5 per latitudini fuori copertura), **anni**:
   anno singolo ("com'era esattamente quell'anno") o intervallo da
   `ALLOWED_YEARS` (costante manutenuta a mano, oggi SARAH3 = 2005–2023);
   con intervallo >1 l'etichetta esplicita "media ora-per-ora di N anni".
   Inverter/batteria/tariffa NON stanno qui: restano nell'editor sistemi
   esistente, seedati con default post-setup (cap AC ≈ potenza di picco,
   batteria 0).
3. **Consumi** — saltabile ("aggiungi dopo"); ospita i tre metodi (sezione
   dedicata sotto). Modificabile in ogni momento dopo il setup, non dipende
   mai dai dati PVGIS.
4. **Fetch & build** — una chiamata `seriescalc` per falda via `/api/pvgis`,
   sequenziali, riga di progresso + retry per falda. Multi-anno: singola
   chiamata per falda con `startyear/endyear`, media per ora-dell'anno lato
   client (29 feb scartato). Poi combine + costruzione dataset.
5. **Fine** → dashboard sui dati reali.

### Dati e storage

- Nuovo oggetto `BaselineDataset` sostituisce l'`import viz.json` build-time:
  caricato all'avvio da **IndexedDB** (array orari = qualche MB, oltre i limiti
  di localStorage), fallback sul dataset demo bundlato. Include la serie T2m
  (serve al modello consumi parametrico). Le chiavi localStorage esistenti
  (sistemi/tariffa/incentivi) restano invariate.
- **Regola di invalidazione**: modifica a località/geometria falde/anni →
  stato "re-fetch necessario"; modifiche a consumi/impianto/tariffa mai.
- **Export/import setup** come singolo file JSON (dataset + sistemi + tariffa +
  incentivi): backup, condivisione, cambio macchina.
- **Fallback file-drop**: accetta i JSON `seriescalc` scaricati a mano dal sito
  PVGIS (uno per falda) — via d'uscita se proxy/API rompono; utile anche offline.

### Condivisione via URL

Si condivide la **ricetta, non i dati**: gli input (località, falde, anni,
sistemi A/B, tariffa, incentivi, parametri consumo B/C) — 1-2 KB — compressi
con lz-string nell'**hash fragment** (`#…`, mai query param: il fragment non
raggiunge server/proxy → coordinate fuori da ogni log). Chi apre il link vede
"Configurazione condivisa: scaricare i dati PVGIS per questa località?" → un
click e il wizard replica il setup. Il CSV personale (metodo A) non entra nel
link: segnato "consumi non inclusi". La UI avvisa che il link contiene la
posizione dell'impianto. Stesso oggetto del formato export/import, solo
serializzato diversamente.

### Proxy PVGIS

CORS verificato empiricamente: l'API PVGIS non emette
`Access-Control-Allow-Origin` → il browser non può chiamarla direttamente
(vale anche da localhost). Proxy obbligatorio:

- Handler unico web-standard `proxyPvgis(req: Request): Promise<Response>`,
  passthrough GET ristretto a `re.jrc.ec.europa.eu/api/v5_3/*` con whitelist
  parametri, nessun log delle coordinate.
- Due wrapper da ~3 righe: Cloudflare Pages Function (prod) e route del dev
  server Bun (locale). Il dev script diventa `web/serve.ts` con `Bun.serve`
  (entry HTML + route `/api/pvgis`) — l'app chiama sempre `/api/pvgis`, un
  solo code path ovunque.

### De-hardcoding dei dati personali

- `config.json` → gitignorato (resta il file locale del proprietario per la CLI).
- Committati: `config.example.json` + `config.demo.json` (località generica,
  es. Roma, casa generica 6 kW); `viz.json` demo rigenerato dal config demo.
- `caso_simile_al_nostro_preso_da_heatpumpmonitor_org.csv`: rimosso dalla root
  (o spostato in docs come riferimento, da decidere al momento). I PDF datasheet
  in `system_technical_data/` restano: documenti pubblici, utili come esempio.

### Errori e validazione

Errori PVGIS mostrati testualmente + retry per falda; validazione pre-fetch
(azimuth −180..180, tilt 0..90, pannelli ≥ 1, anni dentro `ALLOWED_YEARS`).

## Sistema consumi

Vive nel passo 3 del wizard E come editor "Consumi" autonomo nella sidebar.

**Forma canonica**: qualunque sia la sorgente, l'output salvato è sempre
`{ hourlyKwh: number[8760], meta: { source, params/filename, coveragePct, annualKwh } }`.
Tutto il downstream (batteria, fasce, economia) legge solo `hourlyKwh`: le
sorgenti sono intercambiabili e un metodo nuovo futuro deve solo produrre
quell'array. `meta` serve alla UI ("Consumi: CSV casa2024.csv, 98% reale").

**Metodo A — upload CSV** (il più esatto):
- Formato generico `timestamp, kWh`, orario o quartorario (sommato a orario).
  Parsing tollerante: delimitatore `,`/`;` auto, virgola decimale ok, header
  opzionale.
- Parser dedicato con auto-detect per l'export quartorario italiano
  **e-distribuzione / portale consumi** (curva di carico): il pubblico italiano
  scarica un file dal portale e lo trascina qui.
- Timestamp interpretati nella timezone del setup; ora duplicata DST sommata,
  ora mancante interpolata (regola documentata).
- Allineamento calendario: l'anno dei dati utente può differire dall'anno
  PVGIS — mappa per mese/giorno/ora. Buchi riempiti con la media
  stesso-mese/stesso-giorno-settimana/stessa-ora, copertura % riportata; sotto
  ~50% rifiutato con messaggio.
- Anteprima prima dell'apply: barre mensili + curva di un giorno campione.

**Metodo B — template mensili** (la modalità "per farsi un'idea"):
- Per mese: kWh giornalieri tipici + sagoma giorno da preset (piatta /
  picchi mattina+sera / diurna-smartworking / notturna), moltiplicatore
  weekend opzionale. Avanzato: sagoma oraria custom a 24 valori.
- Espanso a 8760 h. Niente file, compilabile in 2 minuti.

**Metodo C — modello fisico parametrico** (l'attuale V2 esposto in UI):
- Form sui parametri `house` esistenti: m², kWh/m²·anno, temperatura base,
  occupanti, smartworking, SCOP, punto COP di targa, temperatura mandata,
  COP ACS + kWh/persona, carico base, smoothing puffer. Hint di valori tipici
  per campo ("90 kWh/m²·anno ≈ casa ristrutturata; 40 ≈ nuova costruzione").
- Fisica deterministica sul T2m reale del sito (già nel dataset): stessa
  matematica di `houseLoad.ts`, documentata in `07-consumi.md`. Nessun LLM,
  mai, in nessun punto del runtime.
- **Avviso obbligatorio e sempre visibile**: "Stima approssimativa calcolata
  dai parametri inseriti: non sono dati reali, usala come ordine di
  grandezza" — nel form e nei metadati in dashboard (`source: stima
  parametrica`).
- Anteprima live: kWh annui, barre mensili, giorno campione invernale/estivo.

**Comune**: cambiando metodo si conservano gli ultimi input di ciascuno; senza
consumi l'app gira in **modalità solo-produzione** (viste produzione complete;
viste economia/batteria/confronto mostrano "aggiungi i consumi per sbloccare" —
assenza esplicita, niente default finti).

## Pubblicazione

**i18n (IT + EN)**: niente librerie — dizionari TS piatti
`web/src/i18n/{it,en}.ts`, hook `useT()` + context, toggle in header, scelta in
localStorage, primo accesso = lingua browser. Estrazione una tantum delle ~200
stringhe attuali. Glossario bilingue. Numeri/valuta via `Intl.NumberFormat`.
**Regola permanente: ogni concetto nuovo (di questa spec e futuri) nasce con
voce di glossario + InfoTip, in entrambe le lingue** (azimuth, tilt, posa,
perdite sistema, database radiazione, media multi-anno, accoppiamento DC/AC,
timezone, forma canonica consumi, …).

**Deploy**: Cloudflare Pages collegato alla repo GitHub, build
`bun build web/index.html --outdir dist`, Pages Function per `/api/pvgis`
(runtime Workers, handler web-standard — free tier 100k richieste/giorno).
Dominio `*.pages.dev` o sottodominio del blog via CNAME.

**Attribuzioni / legale / privacy**:
- Footer: "Dati solari: PVGIS © Unione Europea" + "Geocoding © OpenStreetMap
  contributors" + disclaimer "Stime a scopo informativo, non consulenza
  tecnica o finanziaria" + link blog/LinkedIn + donazioni.
- Pagina Privacy di tre righe, veritiera by design: tutto resta nel browser
  (IndexedDB/localStorage), nessun account, nessun cookie di tracciamento, il
  proxy non logga coordinate. Punto di forza comunicativo, non solo adempimento.
- Analytics: Cloudflare Web Analytics (senza cookie → niente banner consenso).
- `LICENSE` AGPL-3.0 + README inglese con GIF, badge, attribuzioni.

## Promozione (dopo il deploy)

Prerequisiti (parte del lavoro): demo mode istantanea (valore visibile in 10
secondi senza setup), meta tag OpenGraph + screenshot curati, README EN con GIF.

Canali in ordine di lancio:
1. **Soft launch** su forum di nicchia italiani (forum-fotovoltaico.it, gruppi
   Facebook Fotovoltaico Italia) — pubblico esatto, feedback e bug prima del
   pubblico grande. Tono genuino: "l'ho costruito per decidere il mio impianto,
   è gratuito, feedback?".
2. **Reddit**: r/fotovoltaico, r/ItaliaPersonalFinance; poi r/solar,
   r/eupersonalfinance in EN.
3. **Hacker News — Show HN** (fit perfetto: open source, client-side, dati
   pubblici EU, niente account). Martedì/mercoledì mattina ora USA.
4. **LinkedIn + blog**: post-racconto IT+EN; serie tecnica sul blog (modello
   batteria, clipping, PVGIS) — ogni articolo linka il tool.
5. **SEO lungo periodo**: query italiane ("conviene batteria fotovoltaico",
   "calcolo rientro fotovoltaico") con volume reale e concorrenza scadente.
6. Contorno: topics GitHub, liste awesome-solar, Product Hunt (bassa priorità).

Misura via referrer in analytics → raddoppiare sui canali che rendono.

## Ordine di implementazione

1. **Fase 0** — correzioni motore (piccola, indipendente, tutto il resto
   computa su motore corretto)
2. **Wizard + storage + proxy + de-hardcoding** (sblocca tutto)
3. **Consumi** (A, B, C + modalità solo-produzione)
4. **Pubblicazione** (i18n, deploy, legale, condivisione URL)
5. **Promozione** (non-codice, checklist)

Ogni fase = piano di implementazione separato (writing-plans), con test e
docs aggiornati contestualmente (regola repo: un passo alla volta, tutto
documentato in `docs/`).

## Fuori scope (deciso)

- Database hardware selezionabile (campi liberi bastano)
- Multi-profilo (l'export/import JSON è la base futura)
- Totale annuo secco come metodo consumi (troppo distorto per case con PdC)
- Costo sostituzione batteria, degrado, inflazione, NPV/TIR, sensibilità
  (rimandati; candidati naturali post-lancio)
- Import Home Assistant / EV come modulo consumi (futuri metodi sulla forma
  canonica)

## Questioni aperte (non bloccanti per l'implementazione)

- Nome pubblico dell'app + dominio definitivo (decidere prima del deploy)
- Destino del CSV heatpumpmonitor in root (rimuovere vs spostare in docs)
- Preset tariffari per altri paesi EU (post-lancio, su richiesta utenti)
