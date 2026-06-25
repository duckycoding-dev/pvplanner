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
};
