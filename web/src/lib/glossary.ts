export interface GlossaryEntry {
  term: string;
  desc: string;
  formula?: string;
}

/** Definizioni delle voci della dashboard. `desc` è usata anche come tooltip (hover). */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  produzione: {
    term: "Produzione (pratica)",
    desc: "Energia AC realmente prodotta dall'impianto, somma delle due falde limitata dal tetto di potenza dell'inverter (clipping).",
    formula: "G = min(est + ovest, tetto AC)",
  },
  produzioneTeorica: {
    term: "Produzione teorica",
    desc: "Somma della produzione delle due falde SENZA il limite dell'inverter. Il divario con la produzione pratica è il clipping.",
    formula: "G_teo = est + ovest",
  },
  clipping: {
    term: "Clipping",
    desc: "Energia persa perché la produzione istantanea combinata supera il tetto AC dell'inverter (6 kW). Succede solo nelle ore di forte sole (primavera/estate). Con accoppiamento DC, parte di questa energia può invece caricare la batteria (vedi Clipping recuperato).",
    formula: "clipping = produzione teorica − produzione pratica",
  },
  tettoAC: {
    term: "Tetto AC",
    desc: "Potenza massima che l'inverter può immettere in uscita (6 kW). L'energia oltre questo limite viene persa (clipping).",
  },
  picco: {
    term: "Picco combinato",
    desc: "Massima potenza combinata istantanea (est+ovest) raggiunta nell'anno.",
  },
  multiyear: {
    term: "Riferimento multi-anno",
    desc: "Produzione media annua stimata da PVGIS sul periodo 2005–2023 (anno tipico), come confronto rispetto al 2023.",
  },
  autoconsumo: {
    term: "Autoconsumo",
    desc: "Energia prodotta dal FV e usata in casa invece di comprarla dalla rete: direttamente, o (con batteria) dopo essere stata accumulata.",
    formula: "autoconsumo = Σ min(produzione, consumo) + Σ scarica batteria",
  },
  tassoAutoconsumo: {
    term: "Tasso di autoconsumo",
    desc: "Quota della produzione che viene autoconsumata. È basso quando l'impianto produce molto più di quanto la casa consuma (il resto va in rete). Con accoppiamento DC può superare il 100%: la scarica alimentata dal clipping recuperato conta nell'autoconsumo ma il denominatore resta la produzione pratica (post-clipping).",
    formula: "autoconsumo / produzione",
  },
  autosufficienza: {
    term: "Autosufficienza",
    desc: "Quota del consumo della casa coperta dal FV (e batteria) invece che dalla rete.",
    formula: "autoconsumo / consumo",
  },
  import: {
    term: "Import da rete",
    desc: "Energia prelevata (comprata) dalla rete quando produzione + batteria non bastano a coprire il consumo.",
    formula: "import = Σ max(0, consumo − produzione − scarica)",
  },
  export: {
    term: "Export in rete",
    desc: "Energia immessa (venduta) in rete quando la produzione supera il consumo e la ricarica della batteria.",
    formula: "export = Σ max(0, surplus − carica)",
  },
  cicli: {
    term: "Cicli batteria/anno (equivalenti)",
    desc: "Quante 'cariche piene' la batteria eroga in totale in un anno. 191 significa che ha scaricato in tutto ~191 × 10.24 ≈ 1957 kWh nell'anno, non che si carica e scarica 191 volte e basta.",
    formula: "cicli = energia totale scaricata / capacità utile (10.24 kWh)",
  },
  roundTripLoss: {
    term: "Perdita round-trip",
    desc: "Energia persa nel ciclo carica→scarica della batteria (rendimento ~90%): parte dell'energia immagazzinata non torna indietro.",
    formula: "= Σ carica − Σ scarica",
  },
  accoppiamento: {
    term: "Accoppiamento batteria (DC/AC)",
    desc: "Dove è collegata la batteria. DC = sul bus continuo di un inverter ibrido: l'energia sopra il tetto AC può comunque caricarla (clipping recuperato), ma la scarica condivide il tetto AC col FV. AC = batteria con inverter proprio, a valle: vede solo l'energia già limitata dal tetto AC.",
  },
  clippingRecuperato: {
    term: "Clipping recuperato",
    desc: "Energia sopra il tetto AC dell'inverter che con accoppiamento DC finisce in batteria invece di andare persa. Con accoppiamento AC è sempre 0.",
    formula: "recuperato = Σ min(clipping orario, spazio in batteria)",
  },
  coperto: {
    term: "Coperto da PV (+batteria)",
    desc: "Consumo coperto ora per ora dal FV (ed eventualmente dalla batteria). Dove questa curva sta sotto la linea del consumo, la differenza è prelevata dalla rete.",
  },
  soc: {
    term: "SoC (stato di carica)",
    desc: "Energia immagazzinata nella batteria ora per ora. La linea orizzontale è la capacità utile massima (10.24 kWh).",
  },
  consumo: {
    term: "Consumo",
    desc: "Consumo elettrico della casa. Profilo SINTETICO stimato dai dati reali della casa (PDC + puffer, ACS, base) sulle temperature orarie reali del sito — non sono misure. Da sostituire con dati misurati quando disponibili. Dettagli: docs/07-consumi.md.",
  },
  copertura: {
    term: "Copertura (CSV)",
    desc: "Percentuale di ore dell'anno per cui il CSV caricato contiene un dato reale. Le ore mancanti vengono stimate dal profilo medio dei dati presenti (stesso mese, stesso tipo di giorno, stessa ora). Sotto il 50% il file viene rifiutato.",
    formula: "copertura = ore con dato reale / 8760 × 100",
  },
  curvaDiCarico: {
    term: "Curva di carico",
    desc: "Serie oraria (o quartoraria) dei consumi elettrici reali, scaricabile dal portale del distributore (es. e-distribuzione). È il dato più accurato da caricare come CSV.",
  },
  stimaParametrica: {
    term: "Stima parametrica",
    desc: "Consumo orario stimato da un modello fisico deterministico a partire dai parametri della casa (superficie, isolamento, pompa di calore, occupanti) e dalle temperature reali del sito. NON è un dato misurato: usala come ordine di grandezza.",
  },
  templateMensili: {
    term: "Template mensili",
    desc: "Metodo di inserimento consumi in cui, per ogni mese, si indica il consumo medio giornaliero e una sagoma tipica del giorno (mattina/sera, diurno, notturno…); l'app li distribuisce sulle 8760 ore preservando il totale mensile.",
  },
  delta: {
    term: "Δ (differenza B − A)",
    desc: "Variazione dell'indicatore passando dal sistema A (baseline) al sistema B. Per i tassi è espressa in punti percentuali.",
    formula: "Δ = valore(B) − valore(A)",
  },
  costo: {
    term: "Spesa acquisto",
    desc: "Quanto spendi per l'energia prelevata dalla rete, valorizzata ora per ora al prezzo della fascia oraria in cui avviene il prelievo.",
    formula: "Σ import(ora) × prezzo_acquisto(fascia)",
  },
  ricavo: {
    term: "Ricavo vendita",
    desc: "Quanto incassi per l'energia immessa in rete, al prezzo di vendita (RID/ritiro dedicato).",
    formula: "Σ export × prezzo_vendita",
  },
  nettoCosto: {
    term: "Costo netto",
    desc: "Bolletta netta dell'energia: spesa di acquisto meno ricavo di vendita. Può essere negativo (saldo a credito). La batteria è già conteggiata, perché abbassa import ed export.",
    formula: "netto = spesa acquisto − ricavo vendita",
  },
  risparmioBatteria: {
    term: "Risparmio batteria/anno",
    desc: "Quanto fa risparmiare la batteria in un anno: differenza tra il costo netto senza batteria e quello con batteria. È esatto (tiene conto di rendimento e fasce).",
    formula: "netto(senza) − netto(con)",
  },
  payback: {
    term: "Tempo di rientro (payback)",
    desc: "Anni perché il risparmio annuo in bolletta (rispetto al non avere impianto) ripaghi il costo di installazione, tenendo conto degli incentivi. Stima semplice: non considera inflazione dei prezzi né degrado dei pannelli.",
    formula: "−costo + Σ (risparmio annuo + quota incentivo) ≥ 0",
  },
  azimuthFalda: {
    term: "Azimuth (orientamento falda)",
    desc: "Direzione verso cui è rivolta la falda del tetto, in gradi. Convenzione PVGIS: 0 = Sud, −90 = Est, +90 = Ovest, ±180 = Nord. È il verso ottimale della produzione: il Sud (0) massimizza la resa annua alle nostre latitudini.",
  },
  inclinazione: {
    term: "Inclinazione (tilt)",
    desc: "Pendenza della falda rispetto al piano orizzontale, in gradi: 0 = pannelli piatti (orizzontali), 90 = pannelli verticali. Alle nostre latitudini l'ottimo annuo è intorno a 30–35°.",
  },
  posa: {
    term: "Posa (montaggio)",
    desc: "Come sono installati i pannelli. «Su edificio»: aderenti al tetto, meno raffreddati dall'aria (PVGIS usa un modello termico più caldo). «A terra (struttura libera)»: ventilati su entrambi i lati, quindi un filo più efficienti.",
  },
  perditeSistema: {
    term: "Perdite di sistema",
    desc: "Perdite complessive tra il modulo e il contatore, in percentuale: cavi, inverter, sporco sui pannelli, disallineamenti. PVGIS usa un valore unico; il default 14% è la stima tipica per un impianto residenziale.",
  },
  dbRadiazione: {
    term: "Database di radiazione",
    desc: "Fonte dei dati di irraggiamento solare usati da PVGIS. SARAH3: da satellite, più accurato in Europa. ERA5: rianalisi meteo globale, copre anche zone senza vista satellitare. A parità di anni danno stime vicine ma non identiche.",
  },
  mediaMultiAnno: {
    term: "Media multi-anno (anno tipico)",
    desc: "Quando si scelgono più anni, PVGIS fornisce una serie per ciascuno e l'app le fonde in un unico «anno tipico»: per ogni ora dell'anno si fa la media dei valori sui vari anni (il 29 febbraio viene scartato). Attenua le annate anomale.",
  },
  orizzonte: {
    term: "Orizzonte",
    desc: "Ombreggiamento dovuto al profilo del terreno intorno al sito (colline, montagne). Se attivo, PVGIS abbassa la produzione nelle ore in cui il sole è dietro un rilievo. Consigliato attivo per località non pianeggianti.",
  },
};
