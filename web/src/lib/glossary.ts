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
    desc: "Energia persa perché la produzione istantanea combinata supera il tetto AC dell'inverter (6 kW). Succede solo nelle ore di forte sole (primavera/estate).",
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
    desc: "Quota della produzione che viene autoconsumata. È basso quando l'impianto produce molto più di quanto la casa consuma (il resto va in rete).",
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
    desc: "Consumo elettrico della casa. Per ora è un profilo SINTETICO segnaposto (pompa di calore, invernale): va sostituito con dati reali.",
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
};
