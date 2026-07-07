import type { Lang } from "../i18n/types.ts";

export interface GlossaryEntry {
  term: string;
  desc: string;
  formula?: string;
}

/** Voce bilingue: le formule sono identiche nelle due lingue ma restano per voce per semplicità. */
export interface BilingualEntry {
  it: GlossaryEntry;
  en: GlossaryEntry;
}

/**
 * Definizioni delle voci della dashboard, bilingui. `desc` è usata anche come tooltip (hover).
 * Le formule sono identiche nelle due lingue. Risoluzione della lingua via `glossaryEntry`.
 */
export const GLOSSARY: Record<string, BilingualEntry> = {
  produzione: {
    it: {
      term: "Produzione (pratica)",
      desc: "Energia AC realmente prodotta dall'impianto, somma delle due falde limitata dal tetto di potenza dell'inverter (clipping).",
      formula: "G = min(est + ovest, tetto AC)",
    },
    en: {
      term: "Production (actual)",
      desc: "AC energy actually produced by the system, the sum of the two roof faces capped by the inverter power ceiling (clipping).",
      formula: "G = min(east + west, AC ceiling)",
    },
  },
  produzioneTeorica: {
    it: {
      term: "Produzione teorica",
      desc: "Somma della produzione delle due falde SENZA il limite dell'inverter. Il divario con la produzione pratica è il clipping.",
      formula: "G_teo = est + ovest",
    },
    en: {
      term: "Theoretical production",
      desc: "Sum of the two roof faces WITHOUT the inverter limit. The gap with actual production is clipping.",
      formula: "G_theo = east + west",
    },
  },
  clipping: {
    it: {
      term: "Clipping",
      desc: "Energia persa perché la produzione istantanea combinata supera il tetto AC dell'inverter (6 kW). Succede solo nelle ore di forte sole (primavera/estate). Con accoppiamento DC, parte di questa energia può invece caricare la batteria (vedi Clipping recuperato).",
      formula: "clipping = produzione teorica − produzione pratica",
    },
    en: {
      term: "Clipping",
      desc: "Energy lost because combined instantaneous production exceeds the inverter AC ceiling (6 kW). It only happens during strong-sun hours (spring/summer). With DC coupling, part of this energy can instead charge the battery (see Recovered clipping).",
      formula: "clipping = theoretical production − actual production",
    },
  },
  tettoAC: {
    it: {
      term: "Tetto AC",
      desc: "Potenza massima che l'inverter può immettere in uscita (6 kW). L'energia oltre questo limite viene persa (clipping).",
    },
    en: {
      term: "AC ceiling",
      desc: "Maximum power the inverter can deliver at its output (6 kW). Energy beyond this limit is lost (clipping).",
    },
  },
  picco: {
    it: {
      term: "Picco combinato",
      desc: "Massima potenza combinata istantanea (est+ovest) raggiunta nell'anno.",
    },
    en: {
      term: "Combined peak",
      desc: "Highest combined instantaneous power (east+west) reached during the year.",
    },
  },
  multiyear: {
    it: {
      term: "Riferimento multi-anno",
      desc: "Produzione media annua stimata da PVGIS sul periodo 2005–2023 (anno tipico), come confronto rispetto al 2023.",
    },
    en: {
      term: "Multi-year reference",
      desc: "Average annual production estimated by PVGIS over 2005–2023 (typical year), as a comparison against 2023.",
    },
  },
  autoconsumo: {
    it: {
      term: "Autoconsumo",
      desc: "Energia prodotta dal FV e usata in casa invece di comprarla dalla rete: direttamente, o (con batteria) dopo essere stata accumulata.",
      formula: "autoconsumo = Σ min(produzione, consumo) + Σ scarica batteria",
    },
    en: {
      term: "Self-consumption",
      desc: "PV energy used in the home instead of buying it from the grid: directly, or (with a battery) after being stored.",
      formula: "self-consumption = Σ min(production, load) + Σ battery discharge",
    },
  },
  tassoAutoconsumo: {
    it: {
      term: "Tasso di autoconsumo",
      desc: "Quota della produzione che viene autoconsumata. È basso quando l'impianto produce molto più di quanto la casa consuma (il resto va in rete). Con accoppiamento DC può superare il 100%: la scarica alimentata dal clipping recuperato conta nell'autoconsumo ma il denominatore resta la produzione pratica (post-clipping).",
      formula: "autoconsumo / produzione",
    },
    en: {
      term: "Self-consumption rate",
      desc: "Share of production that is self-consumed. It is low when the system produces far more than the home uses (the rest is exported). With DC coupling it can exceed 100%: discharge fed by recovered clipping counts as self-consumption while the denominator stays the actual (post-clipping) production.",
      formula: "self-consumption / production",
    },
  },
  autosufficienza: {
    it: {
      term: "Autosufficienza",
      desc: "Quota del consumo della casa coperta dal FV (e batteria) invece che dalla rete.",
      formula: "autoconsumo / consumo",
    },
    en: {
      term: "Self-sufficiency",
      desc: "Share of the home's consumption covered by PV (and battery) instead of the grid.",
      formula: "self-consumption / load",
    },
  },
  import: {
    it: {
      term: "Import da rete",
      desc: "Energia prelevata (comprata) dalla rete quando produzione + batteria non bastano a coprire il consumo.",
      formula: "import = Σ max(0, consumo − produzione − scarica)",
    },
    en: {
      term: "Grid import",
      desc: "Energy drawn (bought) from the grid when production + battery are not enough to cover consumption.",
      formula: "import = Σ max(0, load − production − discharge)",
    },
  },
  export: {
    it: {
      term: "Export in rete",
      desc: "Energia immessa (venduta) in rete quando la produzione supera il consumo e la ricarica della batteria.",
      formula: "export = Σ max(0, surplus − carica)",
    },
    en: {
      term: "Grid export",
      desc: "Energy fed (sold) into the grid when production exceeds consumption and battery charging.",
      formula: "export = Σ max(0, surplus − charge)",
    },
  },
  cicli: {
    it: {
      term: "Cicli batteria/anno (equivalenti)",
      desc: "Quante 'cariche piene' la batteria eroga in totale in un anno. 191 significa che ha scaricato in tutto ~191 × 10.24 ≈ 1957 kWh nell'anno, non che si carica e scarica 191 volte e basta.",
      formula: "cicli = energia totale scaricata / capacità utile (10.24 kWh)",
    },
    en: {
      term: "Battery cycles/year (equivalent)",
      desc: "How many 'full charges' the battery delivers in total over a year. 191 means it discharged about 191 × 10.24 ≈ 1957 kWh over the year, not that it charges and discharges exactly 191 times.",
      formula: "cycles = total energy discharged / usable capacity (10.24 kWh)",
    },
  },
  roundTripLoss: {
    it: {
      term: "Perdita round-trip",
      desc: "Energia persa nel ciclo carica→scarica della batteria (rendimento ~90%): parte dell'energia immagazzinata non torna indietro.",
      formula: "= Σ carica − Σ scarica",
    },
    en: {
      term: "Round-trip loss",
      desc: "Energy lost in the battery charge→discharge cycle (~90% efficiency): part of the stored energy does not come back.",
      formula: "= Σ charge − Σ discharge",
    },
  },
  accoppiamento: {
    it: {
      term: "Accoppiamento batteria (DC/AC)",
      desc: "Dove è collegata la batteria. DC = sul bus continuo di un inverter ibrido: l'energia sopra il tetto AC può comunque caricarla (clipping recuperato), ma la scarica condivide il tetto AC col FV. AC = batteria con inverter proprio, a valle: vede solo l'energia già limitata dal tetto AC.",
    },
    en: {
      term: "Battery coupling (DC/AC)",
      desc: "Where the battery is connected. DC = on the DC bus of a hybrid inverter: energy above the AC ceiling can still charge it (recovered clipping), but discharge shares the AC ceiling with the PV. AC = battery with its own inverter, downstream: it only sees energy already limited by the AC ceiling.",
    },
  },
  clippingRecuperato: {
    it: {
      term: "Clipping recuperato",
      desc: "Energia sopra il tetto AC dell'inverter che con accoppiamento DC finisce in batteria invece di andare persa. Con accoppiamento AC è sempre 0.",
      formula: "recuperato = Σ min(clipping orario, spazio in batteria)",
    },
    en: {
      term: "Recovered clipping",
      desc: "Energy above the inverter AC ceiling that, with DC coupling, ends up in the battery instead of being lost. With AC coupling it is always 0.",
      formula: "recovered = Σ min(hourly clipping, room in battery)",
    },
  },
  coperto: {
    it: {
      term: "Coperto da PV (+batteria)",
      desc: "Consumo coperto ora per ora dal FV (ed eventualmente dalla batteria). Dove questa curva sta sotto la linea del consumo, la differenza è prelevata dalla rete.",
    },
    en: {
      term: "Covered by PV (+battery)",
      desc: "Consumption covered hour by hour by the PV (and possibly the battery). Where this curve sits below the load line, the difference is drawn from the grid.",
    },
  },
  soc: {
    it: {
      term: "SoC (stato di carica)",
      desc: "Energia immagazzinata nella batteria ora per ora. La linea orizzontale è la capacità utile massima (10.24 kWh).",
    },
    en: {
      term: "SoC (state of charge)",
      desc: "Energy stored in the battery hour by hour. The horizontal line is the maximum usable capacity (10.24 kWh).",
    },
  },
  consumo: {
    it: {
      term: "Consumo",
      desc: "Consumo elettrico della casa. Profilo SINTETICO stimato dai dati reali della casa (PDC + puffer, ACS, base) sulle temperature orarie reali del sito — non sono misure. Da sostituire con dati misurati quando disponibili. Dettagli: docs/07-consumi.md.",
    },
    en: {
      term: "Consumption",
      desc: "The home's electricity consumption. A SYNTHETIC profile estimated from the home's real data (heat pump + buffer, DHW, base load) over the site's real hourly temperatures — not measurements. Replace with metered data when available. Details: docs/07-consumi.md.",
    },
  },
  copertura: {
    it: {
      term: "Copertura (CSV)",
      desc: "Percentuale di ore dell'anno per cui il CSV caricato contiene un dato reale. Le ore mancanti vengono stimate dal profilo medio dei dati presenti (stesso mese, stesso tipo di giorno, stessa ora). Sotto il 50% il file viene rifiutato.",
      formula: "copertura = ore con dato reale / 8760 × 100",
    },
    en: {
      term: "Coverage (CSV)",
      desc: "Percentage of the year's hours for which the uploaded CSV contains a real value. Missing hours are estimated from the average profile of the present data (same month, same day type, same hour). Below 50% the file is rejected.",
      formula: "coverage = hours with real data / 8760 × 100",
    },
  },
  curvaDiCarico: {
    it: {
      term: "Curva di carico",
      desc: "Serie oraria (o quartoraria) dei consumi elettrici reali, scaricabile dal portale del distributore (es. e-distribuzione). È il dato più accurato da caricare come CSV.",
    },
    en: {
      term: "Load curve",
      desc: "Hourly (or quarter-hourly) series of real electricity consumption, downloadable from your grid operator's portal (e.g. e-distribuzione). It is the most accurate data to upload as a CSV.",
    },
  },
  stimaParametrica: {
    it: {
      term: "Stima parametrica",
      desc: "Consumo orario stimato da un modello fisico deterministico a partire dai parametri della casa (superficie, isolamento, pompa di calore, occupanti) e dalle temperature reali del sito. NON è un dato misurato: usala come ordine di grandezza.",
    },
    en: {
      term: "Parametric estimate",
      desc: "Hourly consumption estimated by a deterministic physical model from the home's parameters (area, insulation, heat pump, occupants) and the site's real temperatures. It is NOT metered data: use it as an order of magnitude.",
    },
  },
  templateMensili: {
    it: {
      term: "Template mensili",
      desc: "Metodo di inserimento consumi in cui, per ogni mese, si indica il consumo medio giornaliero e una sagoma tipica del giorno (mattina/sera, diurno, notturno…); l'app li distribuisce sulle 8760 ore preservando il totale mensile.",
    },
    en: {
      term: "Monthly templates",
      desc: "A consumption-entry method where, for each month, you give the average daily consumption and a typical day shape (morning/evening, daytime, night…); the app spreads them over the 8760 hours while preserving the monthly total.",
    },
  },
  delta: {
    it: {
      term: "Δ (differenza B − A)",
      desc: "Variazione dell'indicatore passando dal sistema A (baseline) al sistema B. Per i tassi è espressa in punti percentuali.",
      formula: "Δ = valore(B) − valore(A)",
    },
    en: {
      term: "Δ (difference B − A)",
      desc: "Change in the metric when moving from system A (baseline) to system B. For rates it is expressed in percentage points.",
      formula: "Δ = value(B) − value(A)",
    },
  },
  costo: {
    it: {
      term: "Spesa acquisto",
      desc: "Quanto spendi per l'energia prelevata dalla rete, valorizzata ora per ora al prezzo della fascia oraria in cui avviene il prelievo.",
      formula: "Σ import(ora) × prezzo_acquisto(fascia)",
    },
    en: {
      term: "Purchase cost",
      desc: "How much you spend on energy drawn from the grid, valued hour by hour at the price of the time band in which the draw occurs.",
      formula: "Σ import(hour) × buy_price(band)",
    },
  },
  ricavo: {
    it: {
      term: "Ricavo vendita",
      desc: "Quanto incassi per l'energia immessa in rete, al prezzo di vendita (RID/ritiro dedicato).",
      formula: "Σ export × prezzo_vendita",
    },
    en: {
      term: "Sale revenue",
      desc: "How much you earn for energy fed into the grid, at the sale price (feed-in / dedicated withdrawal).",
      formula: "Σ export × sell_price",
    },
  },
  nettoCosto: {
    it: {
      term: "Costo netto",
      desc: "Bolletta netta dell'energia: spesa di acquisto meno ricavo di vendita. Può essere negativo (saldo a credito). La batteria è già conteggiata, perché abbassa import ed export.",
      formula: "netto = spesa acquisto − ricavo vendita",
    },
    en: {
      term: "Net cost",
      desc: "Net energy bill: purchase cost minus sale revenue. It can be negative (a credit balance). The battery is already accounted for, since it lowers both import and export.",
      formula: "net = purchase cost − sale revenue",
    },
  },
  risparmioBatteria: {
    it: {
      term: "Risparmio batteria/anno",
      desc: "Quanto fa risparmiare la batteria in un anno: differenza tra il costo netto senza batteria e quello con batteria. È esatto (tiene conto di rendimento e fasce).",
      formula: "netto(senza) − netto(con)",
    },
    en: {
      term: "Battery saving/year",
      desc: "How much the battery saves in a year: the difference between the net cost without the battery and with it. It is exact (it accounts for efficiency and time bands).",
      formula: "net(without) − net(with)",
    },
  },
  payback: {
    it: {
      term: "Tempo di rientro (payback)",
      desc: "Anni perché il risparmio annuo in bolletta (rispetto al non avere impianto) ripaghi il costo di installazione, tenendo conto degli incentivi. Stima semplice: non considera inflazione dei prezzi né degrado dei pannelli.",
      formula: "−costo + Σ (risparmio annuo + quota incentivo) ≥ 0",
    },
    en: {
      term: "Payback time",
      desc: "Years for the annual bill saving (versus having no system) to repay the installation cost, taking incentives into account. A simple estimate: it ignores price inflation and panel degradation.",
      formula: "−cost + Σ (annual saving + incentive share) ≥ 0",
    },
  },
  azimuthFalda: {
    it: {
      term: "Azimuth (orientamento falda)",
      desc: "Direzione verso cui è rivolta la falda del tetto, in gradi. Convenzione PVGIS: 0 = Sud, −90 = Est, +90 = Ovest, ±180 = Nord. È il verso ottimale della produzione: il Sud (0) massimizza la resa annua alle nostre latitudini.",
    },
    en: {
      term: "Azimuth (roof-face orientation)",
      desc: "The direction the roof face points, in degrees. PVGIS convention: 0 = South, −90 = East, +90 = West, ±180 = North. South (0) maximizes annual yield at our latitudes.",
    },
  },
  inclinazione: {
    it: {
      term: "Inclinazione (tilt)",
      desc: "Pendenza della falda rispetto al piano orizzontale, in gradi: 0 = pannelli piatti (orizzontali), 90 = pannelli verticali. Alle nostre latitudini l'ottimo annuo è intorno a 30–35°.",
    },
    en: {
      term: "Tilt",
      desc: "Slope of the roof face relative to the horizontal plane, in degrees: 0 = flat (horizontal) panels, 90 = vertical panels. At our latitudes the annual optimum is around 30–35°.",
    },
  },
  posa: {
    it: {
      term: "Posa (montaggio)",
      desc: "Come sono installati i pannelli. «Su edificio»: aderenti al tetto, meno raffreddati dall'aria (PVGIS usa un modello termico più caldo). «A terra (struttura libera)»: ventilati su entrambi i lati, quindi un filo più efficienti.",
    },
    en: {
      term: "Mounting",
      desc: "How the panels are installed. “Building-integrated”: flush with the roof, less air-cooled (PVGIS uses a hotter thermal model). “Free-standing (ground)”: ventilated on both sides, so slightly more efficient.",
    },
  },
  perditeSistema: {
    it: {
      term: "Perdite di sistema",
      desc: "Perdite complessive tra il modulo e il contatore, in percentuale: cavi, inverter, sporco sui pannelli, disallineamenti. PVGIS usa un valore unico; il default 14% è la stima tipica per un impianto residenziale.",
    },
    en: {
      term: "System losses",
      desc: "Overall losses between the module and the meter, as a percentage: cabling, inverter, panel soiling, mismatch. PVGIS uses a single value; the 14% default is the typical estimate for a residential system.",
    },
  },
  dbRadiazione: {
    it: {
      term: "Database di radiazione",
      desc: "Fonte dei dati di irraggiamento solare usati da PVGIS. SARAH3: da satellite, più accurato in Europa. ERA5: rianalisi meteo globale, copre anche zone senza vista satellitare. A parità di anni danno stime vicine ma non identiche.",
    },
    en: {
      term: "Radiation database",
      desc: "Source of the solar irradiation data used by PVGIS. SARAH3: satellite-based, more accurate in Europe. ERA5: global weather reanalysis, also covering areas without satellite view. For the same years they give close but not identical estimates.",
    },
  },
  mediaMultiAnno: {
    it: {
      term: "Media multi-anno (anno tipico)",
      desc: "Quando si scelgono più anni, PVGIS fornisce una serie per ciascuno e l'app le fonde in un unico «anno tipico»: per ogni ora dell'anno si fa la media dei valori sui vari anni (il 29 febbraio viene scartato). Attenua le annate anomale.",
    },
    en: {
      term: "Multi-year average (typical year)",
      desc: "When several years are chosen, PVGIS returns one series per year and the app merges them into a single “typical year”: for each hour of the year it averages the values across the years (29 February is dropped). This smooths out anomalous years.",
    },
  },
  orizzonte: {
    it: {
      term: "Orizzonte",
      desc: "Ombreggiamento dovuto al profilo del terreno intorno al sito (colline, montagne). Se attivo, PVGIS abbassa la produzione nelle ore in cui il sole è dietro un rilievo. Consigliato attivo per località non pianeggianti.",
    },
    en: {
      term: "Horizon",
      desc: "Shading due to the terrain profile around the site (hills, mountains). When enabled, PVGIS lowers production during the hours when the sun is behind a relief. Recommended for non-flat locations.",
    },
  },
};

/** Voce del glossario nella lingua richiesta (chiave inesistente → undefined). */
export function glossaryEntry(key: string, lang: Lang): GlossaryEntry | undefined {
  return GLOSSARY[key]?.[lang];
}
