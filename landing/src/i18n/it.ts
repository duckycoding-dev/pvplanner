import type { LandingCopy } from "./types";

// Copy verbatim dalla spec docs/superpowers/specs/2026-07-09-landing-page-design.md §3.
// Non modificare i testi senza aggiornare la spec.
export const it: LandingCopy = {
  meta: {
    title: "PVVerdict — Il fotovoltaico ti conviene? Verdetto coi numeri veri",
    description:
      "PVVerdict simula il tuo impianto ora per ora coi dati PVGIS della tua zona — con o senza batteria, con le tue fasce orarie — e ti dà il verdetto: anni di rientro, risparmio, autoconsumo.",
  },
  nav: { how: "Come funziona", features: "Cosa vedi", faq: "FAQ", cta: "Prova il tool" },
  hero: {
    h1: "Il fotovoltaico ti conviene davvero? Scoprilo coi numeri veri.",
    sub: "PVVerdict simula il tuo impianto ora per ora coi dati PVGIS della tua zona — con o senza batteria, con le tue fasce orarie — e ti dà il verdetto: anni di rientro, risparmio, autoconsumo. Gratis, nel browser, senza account.",
    cta: "Prova il tool ora",
    micro:
      "Si apre con un esempio già pronto (Roma): esplora i numeri, poi lancia il setup per la tua località. Due minuti.",
    trust: ["Gratis", "Open source", "Senza account", "I tuoi dati non lasciano il browser"],
    verdictBox: { payback: "Rientro", battery: "Batteria conviene", selfConsumption: "Autoconsumo" },
  },
  problem: {
    h2: "Perché un calcolatore fotovoltaico a medie mensili non può risponderti",
    intro:
      "Quasi tutti i calcolatori online funzionano così: producibilità media annua, un coefficiente di autoconsumo a spanne, risparmio stimato. Tre numeri, tre problemi:",
    points: [
      {
        title: "Il sole e i tuoi consumi non vanno d'accordo per media.",
        body: "L'impianto produce a mezzogiorno; la lavastoviglie parte alle 21. Quanto ti conviene dipende da quanto quelle due curve si sovrappongono, ora per ora — una media mensile non può saperlo.",
      },
      {
        title: "La batteria è la decisione più costosa, ed è quella che nessuno modella.",
        body: "Migliaia di euro sì o no, decisi da quanta energia serale puoi davvero spostare. Senza simulare carica e scarica ogni ora dell'anno, qualsiasi risposta è un'opinione.",
      },
      {
        title: "Se paghi la luce a fasce, la media sbaglia proprio dove servono i soldi.",
        body: "F1, F2, F3: lo stesso kWh autoconsumato vale diverso a seconda di quando lo consumi. Un coefficiente unico non lo vede.",
      },
    ],
    closing:
      "PVVerdict simula le 8.760 ore del tuo anno — produzione PVGIS della tua zona, i tuoi consumi, la tua tariffa, con e senza batteria — e solo dopo emette il verdetto.",
  },
  how: {
    h2: "Tre passi dal tetto al verdetto",
    steps: [
      {
        title: "La posizione.",
        body: "Località sulla mappa, orientamento e inclinazione delle falde, potenza dei pannelli. PVVerdict scarica da PVGIS gli anni di dati climatici orari della tua zona — irraggiamento e temperatura veri, non tabelle generiche.",
      },
      {
        title: "I tuoi consumi.",
        body: "Il CSV di e-distribuzione per la curva reale, oppure le bollette mensili o una stima guidata. Poi la tariffa: monoraria o a fasce F1/F2/F3.",
        privacyNote:
          "Il file viene letto direttamente nel tuo browser: nessun dato viene inviato o salvato sui nostri server.",
      },
      {
        title: "Il verdetto.",
        body: "Anni di rientro, risparmio annuo, autoconsumo e autosufficienza. E il confronto fianco a fianco: con batteria contro senza, per capire se quei migliaia di euro in più si ripagano.",
      },
    ],
  },
  features: {
    h2: "Cosa vedi davvero, numeri alla mano",
    items: [
      {
        title: "Batteria: sì o no, fianco a fianco.",
        body: "Due sistemi a confronto sulla stessa schermata — stesso tetto, stessi consumi, con e senza accumulo. Cicli anno, energia spostata, differenza di rientro: la decisione più cara diventa un confronto leggibile.",
        shot: "/shots/it/compare.webp",
        alt: "Confronto fianco a fianco di due sistemi fotovoltaici, con e senza batteria",
      },
      {
        title: "Il tuo anno, ora per ora.",
        body: "Produzione, consumi e temperatura sul grafico del giorno: vedi quando produci, quando consumi e quanto si coprono. È qui che una media mensile smette di bastare.",
        shot: "/shots/it/daily.webp",
        alt: "Grafico giornaliero ora per ora con produzione, consumi e temperatura",
      },
      {
        title: "L'andamento economico, anno per anno.",
        body: "La curva del capitale: investimento, incentivi, risparmi cumulati — e l'anno in cui la linea passa lo zero.",
        shot: "/shots/it/cashflow.webp",
        alt: "Grafico dell'andamento economico con cashflow cumulato e punto di rientro",
      },
      {
        title: "Le tue fasce, i tuoi prezzi.",
        body: "F1, F2, F3 o monoraria: ogni kWh è valorizzato al prezzo dell'ora in cui lo consumi o lo immetti.",
        shot: "/shots/it/tariff.webp",
        alt: "Configurazione della tariffa elettrica a fasce F1, F2, F3",
      },
    ],
  },
  notModeled: {
    h2: "Cosa non modelliamo (e perché te lo diciamo)",
    intro: "Ogni stima ha dei confini. Questi sono i nostri:",
    points: [
      {
        title: "Degrado di pannelli e batteria.",
        body: "I moduli perdono qualche frazione di punto all'anno e la batteria capacità a ogni ciclo. Non lo simuliamo: su un rientro di 5-7 anni sposta poco, e preferiamo un modello semplice e verificabile a uno pieno di parametri invisibili.",
      },
      {
        title: "Attualizzazione (NPV).",
        body: "I risparmi futuri valgono meno di quelli di oggi. Il nostro cashflow è nominale: più facile da leggere e da controllare, meno «finanziariamente elegante».",
      },
      {
        title: "Prezzi futuri dell'energia.",
        body: "Nessuno li conosce. Usiamo la tua tariffa di oggi, costante: se l'energia rincara, il rientro sarà più veloce di quello che ti mostriamo.",
      },
      {
        title: "Il tuo caso fiscale specifico.",
        body: "Detrazioni e incentivi cambiano per situazione e per anno: inserisci tu l'importo che ti spetta, il tool non lo indovina.",
      },
    ],
    closing:
      "Sono semplificazioni deliberate, tutte documentate. Preferiamo dirtele qui che fartele scoprire dopo — è anche il motivo per cui il codice è aperto: puoi controllare come calcoliamo, riga per riga.",
  },
  privacy: {
    h2: "I tuoi dati restano tuoi. E il codice lo puoi leggere.",
    points: [
      {
        title: "Tutto nel browser.",
        body: "La simulazione gira sul tuo dispositivo: consumi, bollette e CSV non lasciano mai il browser. L'unica richiesta che esce è quella per i dati climatici: passa da un nostro proxy tecnico (serve per dialogare con PVGIS) e contiene solo le coordinate e i parametri dell'impianto — mai i tuoi consumi, mai nulla che ti identifichi. Il proxy non salva niente: inoltra e dimentica.",
      },
      {
        title: "Nessun account.",
        body: "Niente registrazione, niente email, niente newsletter. Apri e calcoli.",
      },
      {
        title: "Open source (AGPL-3.0).",
        body: "Ogni formula è pubblica e documentata. Se pensi che un calcolo sia sbagliato, puoi verificarlo — e dircelo.",
      },
      {
        title: "Dati pubblici europei.",
        body: "Le stime di produzione vengono da PVGIS, il servizio del Centro Comune di Ricerca della Commissione Europea. Non ci inventiamo i numeri: li prendiamo da chi li misura.",
      },
    ],
  },
  faq: {
    h2: "Domande frequenti",
    items: [
      {
        q: "Conviene installare la batteria col fotovoltaico?",
        a: "Dipende da quanta energia produci quando non ci sei e quanta ne consumi quando l'impianto tace: la batteria si ripaga solo se sposta abbastanza kWh dalla giornata alla sera. Con consumi serali bassi può allungare il rientro invece di accorciarlo. È un calcolo, non un'opinione: PVVerdict confronta lo stesso impianto con e senza accumulo, ora per ora, e ti mostra la differenza in anni ed euro.",
      },
      {
        q: "Quanti anni ci vogliono per rientrare dall'investimento?",
        a: "In Italia, tipicamente tra 4 e 9 anni — ma la forbice è ampia proprio perché dipende da zona, autoconsumo, tariffa e incentivi. Qualunque numero secco letto online vale poco per il tuo tetto. Il tool calcola il tuo cashflow anno per anno, con il tuo costo d'impianto e la tua detrazione.",
      },
      {
        q: "Quanto produce davvero un impianto fotovoltaico nella mia zona?",
        a: "Tra Bolzano e Siracusa la stessa potenza può produrre il 30% in più o in meno, e contano anche orientamento e inclinazione del tetto. PVVerdict usa i dati storici orari di PVGIS (il servizio scientifico della Commissione Europea) per la tua posizione esatta: non una media nazionale, il tuo punto sulla mappa.",
      },
      {
        q: "Come scarico e uso la curva di carico di e-distribuzione?",
        a: "Dal portale e-distribuzione, nell'area riservata, puoi esportare i tuoi consumi quartorari in CSV. Caricalo nel tool così com'è: viene letto direttamente nel browser (non finisce su nessun server) e la simulazione gira sui tuoi consumi reali, non su un profilo tipo.",
      },
      {
        q: "Le stime sono affidabili?",
        a: "Sono stime, e te lo diciamo chiaramente: usiamo anni di dati climatici misurati, i tuoi consumi e la tua tariffa, ma non modelliamo il degrado dei componenti né i prezzi futuri dell'energia. Ogni assunzione è documentata e il codice è open source: puoi controllare come calcoliamo, formula per formula.",
      },
      {
        q: "Il fotovoltaico conviene anche senza batteria?",
        a: "Spesso sì: il solo impianto ha il rientro più rapido, perché costa meno e l'autoconsumo diretto è il risparmio più efficiente. La batteria è un secondo investimento, da valutare a parte — ed è esattamente il confronto che il tool ti mette davanti.",
      },
      {
        q: "I miei dati di consumo dove finiscono?",
        a: "Da nessuna parte: restano nel tuo browser. Niente account, niente upload, niente tracciamento dei consumi. L'unica richiesta che esce è quella per i dati meteo della tua località. Il progetto è open source proprio perché tu non debba fidarti sulla parola.",
      },
    ],
  },
  finalCta: {
    h2: "Pronto per i numeri veri?",
    body: "Due minuti di setup, nessun account. Il verdetto sul tuo tetto — rientro, risparmio, batteria sì o no — calcolato sui tuoi dati, non su una media.",
    cta: "Prova il tool ora",
    micro: "Si apre con l'esempio di Roma: esplora, poi lancia il setup per la tua località.",
  },
  footer: {
    product: {
      label: "Prodotto",
      links: [
        { text: "Apri il tool", href: "__TOOL__" },
        { text: "Come funziona", href: "#how" },
        { text: "FAQ", href: "#faq" },
      ],
    },
    project: {
      label: "Progetto",
      links: [
        { text: "Codice sorgente (GitHub)", href: "__REPO__" },
        { text: "Licenza AGPL-3.0", href: "https://www.gnu.org/licenses/agpl-3.0" },
        { text: "Cosa non modelliamo", href: "#not-modeled" },
      ],
    },
    data: {
      label: "Dati e privacy",
      links: [
        { text: "Privacy — nessun dato raccolto", href: "#privacy" },
        { text: "Dati climatici: PVGIS © Unione Europea", href: "https://re.jrc.ec.europa.eu/pvg_tools/en/" },
        { text: "Blog (presto)", href: "" },
      ],
    },
    bottom: "© 2026 PVVerdict · Fatto in Italia",
  },
  langHint: { text: "This page is also available in English", link: "View in English →" },
};
