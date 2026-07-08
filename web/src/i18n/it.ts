import type { Dict } from "./types.ts";

// Dizionario italiano (lingua sorgente). Chiavi gerarchiche, raggruppate per area.
// Il test `test/i18n.test.ts` garantisce la parità delle chiavi con en.ts.
export const it: Dict = {
  // --- app / comune ---
  "format.months": "Gen,Feb,Mar,Apr,Mag,Giu,Lug,Ago,Set,Ott,Nov,Dic",
  "app.title": "PvPlanner - Analisi Fotovoltaico",
  "app.loading": "Caricamento…",
  "lang.it": "IT",
  "lang.en": "EN",
  "lang.switch": "Lingua",
  "theme.toDark": "Attiva tema scuro",
  "theme.toLight": "Attiva tema chiaro",
  "chart.temperature": "Temperatura (°C)",
  "common.close": "Chiudi",
  "common.cancel": "Annulla",
  "common.chooseFile": "scegli file",
  "common.apply": "Applica",
  "common.export": "Esporta",
  "common.import": "Importa",

  // --- attribuzioni / legale (verbatim) ---
  "attribution.osm": "Geocoding © OpenStreetMap contributors",

  // --- glossario ---
  "glossary.intro": "Cosa indicano le voci della dashboard. Le formule sono riferite alla singola ora (Δt = 1 h, energia in kWh).",

  // --- tab / header / footer ---
  "tabs.annual": "Panoramica annuale",
  "tabs.monthly": "Mensile",
  "tabs.daily": "Giorno per giorno",
  "tabs.compare": "Confronto",
  "tabs.glossary": "Glossario",
  "header.sub": "{system}: {falde} · tetto AC {acCap} kW · {battery}",
  "header.battery": "batteria {kwh} kWh",
  "header.noBattery": "senza batteria",
  "demo.viewing": "Stai guardando dati demo (Roma).",
  "demo.runSetup": "⚙ Esegui il setup per la tua località",

  // --- wizard: struttura ---
  "wizard.title": "Setup dati PVGIS",
  "wizard.step.location": "Località",
  "wizard.step.roof": "Tetto",
  "wizard.step.fetch": "Scarico",
  "wizard.step.consumption": "Consumi",
  "wizard.back": "← Indietro",
  "wizard.next": "Avanti →",
  "wizard.finish": "Fine ✓",
  "wizard.skip": "Salta",

  // --- wizard: località ---
  "wizard.location.title": "Località",
  "wizard.location.searchLabel": "Cerca un luogo",
  "wizard.location.searchPlaceholder": "es. Roma, Via Nazionale 1",
  "wizard.location.search": "Cerca",
  "wizard.location.searching": "Cerco…",
  "wizard.location.noResults": "Nessun risultato.",
  "wizard.location.searchError": "Ricerca non riuscita. Riprova tra qualche secondo.",
  "wizard.location.selected": "Selezionata:",
  "wizard.location.lat": "Latitudine",
  "wizard.location.lon": "Longitudine",
  "wizard.location.timezone": "Fuso orario",
  "wizard.location.horizon": "Considera l'orizzonte (ombreggiamento del terreno)",
  "wizard.location.attribution": "© OpenStreetMap contributors",

  // --- wizard: tetto ---
  "wizard.roof.title": "Tetto e falde",
  "wizard.roof.azimuthHint": "0 = Sud · −90 = Est · +90 = Ovest, convenzione PVGIS",
  "wizard.roof.faldaIdAria": "ID falda",
  "wizard.roof.removeFalda": "Rimuovi falda",
  "wizard.roof.azimuth": "Azimuth (°)",
  "wizard.roof.tilt": "Inclinazione (°)",
  "wizard.roof.addFalda": "+ Aggiungi falda",
  "wizard.roof.mounting": "Posa",
  "wizard.roof.mountingBuilding": "Su edificio",
  "wizard.roof.mountingFree": "A terra (struttura libera)",
  "wizard.roof.systemLoss": "Perdite di sistema",
  "wizard.roof.radiationDb": "Database di radiazione",
  "wizard.roof.yearFrom": "Anno da",
  "wizard.roof.yearTo": "Anno a",
  "wizard.roof.multiYearNote": "media ora-per-ora di {n} anni ({from}–{to})",

  // --- wizard: scarico ---
  "wizard.fetch.title": "Scarico dati PVGIS",
  "wizard.fetch.state.idle": "in attesa",
  "wizard.fetch.state.running": "in corso…",
  "wizard.fetch.state.ok": "ok",
  "wizard.fetch.state.error": "errore",
  "wizard.fetch.retry": "Riprova",
  "wizard.fetch.download": "Scarica dati PVGIS",
  "wizard.fetch.downloading": "Scarico…",
  "wizard.fetch.fileReadError": "Impossibile leggere uno dei file (JSON non valido).",
  "wizard.fetch.dropBefore": "oppure trascina qui i JSON",
  "wizard.fetch.dropAfter": "scaricati a mano dal sito PVGIS (uno per falda), oppure",
  "wizard.fetch.removeFile": "Rimuovi file",

  // --- wizard: consumi ---
  "wizard.consumption.title": "Consumi",
  "wizard.consumption.needFetch": "Scarica prima i dati PVGIS: i consumi si aggiungono sul dataset del sito.",
  "wizard.consumption.intro":
    "Aggiungi i consumi per sbloccare le analisi economiche e batteria: «Fine ✓» applica i valori del metodo attivo. Con «Salta» concludi senza consumi e li aggiungi dopo dalla sezione «Consumi» del menu di configurazione.",

  // --- validazioni (messaggi restituiti come chiavi da validate*) ---
  "validate.wizard.lat": "La latitudine deve essere tra -90 e 90.",
  "validate.wizard.lon": "La longitudine deve essere tra -180 e 180.",
  "validate.wizard.timezone": "Fuso orario non valido.",
  "validate.wizard.systemLoss": "Le perdite di sistema devono essere tra 0 e 40.",
  "validate.wizard.radiationDb": "Database di radiazione non valido.",
  "validate.wizard.yearsRange": "Anni fuori dall'intervallo consentito per il database selezionato.",
  "validate.wizard.yearsOrder": "L'anno iniziale deve essere ≤ anno finale.",
  "validate.wizard.faldeMin": "Serve almeno una falda.",
  "validate.wizard.faldaIdEmpty": "L'ID falda non può essere vuoto.",
  "validate.wizard.faldaIdDup": "ID falde duplicati.",
  "validate.wizard.faldaAzimuth": "L'azimuth di una falda deve essere tra -180 e 180.",
  "validate.wizard.faldaTilt": "L'inclinazione di una falda deve essere tra 0 e 90.",
  "validate.system.geometryMismatch": "Geometria diversa dalla baseline (falde non corrispondenti): import non supportato.",
  "validate.system.faldaMissing": "Una falda della baseline è assente.",
  "validate.system.faldaAzimuth": "L'azimuth di una falda non corrisponde alla baseline (geometria non modificabile).",
  "validate.system.faldaPanels": "Pannelli/W di una falda non validi.",
  "validate.system.acCap": "Il tetto AC deve essere > 0.",
  "validate.system.batteryCapacity": "Capacità batteria non valida.",
  "validate.system.batteryUsablePct": "La percentuale utilizzabile deve essere tra 0 e 100.",
  "validate.system.roundTrip": "Il round-trip deve essere tra 0 e 1.",
  "validate.system.installationCost": "Costo installazione non valido.",
  "validate.tariff.defaultBuyNegative": "Il prezzo default non può essere negativo.",
  "validate.tariff.sellNegative": "Il prezzo di vendita non può essere negativo.",
  "validate.tariff.bandBuyNegative": "Una fascia ha un prezzo negativo.",
  "validate.tariff.bandHours": "Una fascia ha ore fuori dall'intervallo 0–24.",

  // --- menu / sidebar ---
  "menu.title": "Configurazione",
  "menu.open": "Apri configurazione",
  "menu.openTitle": "Configurazione (m)",
  "menu.setup": "⚙ Setup dati PVGIS…",
  "menu.consumption": "Consumi",
  "menu.consumptionHint": "(sblocca economia/batteria)",
  "menu.consumptionNeedSetup": "I consumi si aggiungono sul dataset della tua località.",
  "menu.runSetup": "Esegui il setup…",
  "menu.tariff": "Tariffa",
  "menu.incentives": "Incentivi",
  "menu.incentivesHint": "(payback)",
  "menu.systemA": "Sistema A",
  "menu.systemAHint": "(viste mono)",
  "menu.systemB": "Sistema B",
  "menu.systemBHint": "(Confronto)",

  // --- condivisione / export-import setup ---
  "share.section": "Condividi / Esporta setup",
  "share.share": "Condividi via link",
  "share.export": "Esporta file",
  "share.import": "Importa file",
  "share.needSetup": "Esegui prima il setup della tua località.",
  "share.dialogTitle": "Condividi il setup",
  "share.warning": "Il link contiene la posizione dell'impianto e la configurazione. I consumi da CSV non sono inclusi.",
  "share.copy": "Copia link",
  "share.copied": "Copiato ✓",
  "share.importError": "File setup non valido.",
  "share.confirmTitle": "Configurazione condivisa",
  "share.confirmBody": "Scaricare i dati PVGIS per questa località? ({n} chiamate)",
  "share.confirmYes": "Sì, scarica",

  // --- editor sistema ---
  "system.defaultConfig": "default (config)",
  "system.refBody": "{falde} · batteria {batt} kWh · costo {cost} €",
  "system.name": "Nome",
  "system.panels": "pannelli",
  "system.wpPerPanel": "W/pannello",
  "system.acCap": "Tetto AC inverter",
  "system.batteryTotal": "Batteria capacità totale",
  "system.batteryTotalUnit": "kWh, 0=nessuna",
  "system.batteryUsablePct": "Batteria % utilizzabile",
  "system.roundTrip": "Round-trip",
  "system.coupling": "Accoppiamento batteria",
  "system.couplingDc": "DC (inverter ibrido)",
  "system.couplingAc": "AC (inverter batteria separato)",
  "system.installCost": "Costo installazione",
  "system.totalLabel": "Totale",
  "system.usableBattery": "batteria utile",
  "system.reset": "Reset ai default",
  "system.copyFrom": "Copia da {label}",

  // --- editor tariffa ---
  "tariff.title": "Tariffa",
  "tariff.presetMono": "Monorario",
  "tariff.presetF1F2F3": "F1/F2/F3",
  "tariff.name": "Nome",
  "tariff.buyDefault": "Prezzo acquisto default",
  "tariff.sell": "Prezzo vendita",
  "tariff.bandFrom": "dalle ora",
  "tariff.bandTo": "alle ora",
  "tariff.bandDay": "giorno {d}",
  "tariff.bandBuy": "prezzo acquisto",
  "tariff.addBand": "+ fascia",
  "tariff.note": "Le ore non coperte da alcuna fascia usano il prezzo default. Risoluzione oraria.",
  "tariff.dayLabels": "L,M,M,G,V,S,D",

  // --- editor incentivi ---
  "incentive.percentMode": "% del costo",
  "incentive.fixedMode": "importo fisso",
  "incentive.valuePercent": "Incentivo (% del costo)",
  "incentive.valueFixed": "Incentivo (€)",
  "incentive.years": "Restituito in (anni)",
  "incentive.note": "1 anno = immediato. L'incentivo riduce il tempo di rientro.",

  // --- box consumi bloccati ---
  "locked.text": "🔌 Aggiungi i consumi per sbloccare le analisi economiche e batteria",
  "locked.hint": "(prossima versione)",

  // --- import (modale + parser) ---
  "import.title": "Importa {what}",
  "import.dropPrompt": "Trascina qui il file JSON, oppure",
  "import.errorGeneric": "Errore di import.",
  "import.fileUnreadable": "Impossibile leggere il file.",
  "import.jsonUnreadable": "File non valido: JSON non leggibile.",
  "import.system.notObject": "Config non valida: atteso un oggetto.",
  "import.system.faldeMissing": "Config non valida: «falde» mancante.",
  "import.system.field": "Config non valida: un campo ha un valore non valido.",
  "import.tariff.notObject": "Tariffa non valida: atteso un oggetto.",
  "import.tariff.field": "Tariffa non valida: un campo ha un valore non valido.",

  // --- consumi: editor + metodi ---
  "consumption.method.csv": "CSV",
  "consumption.method.monthly": "Template mensili",
  "consumption.method.parametric": "Stima parametrica",
  "consumption.editor.inUse": "In uso:",
  "consumption.editor.perYear": "kWh/anno",
  "consumption.coverage": "copertura {pct}%",

  // --- consumi: CSV ---
  "consumption.csv.introA": "Carica la ",
  "consumption.csv.loadCurve": "curva di carico",
  "consumption.csv.introB": " reale (dal portale del distributore, es. e-distribuzione) oppure un CSV a due colonne ",
  "consumption.csv.introC": " (orario o quartorario). Il formato viene riconosciuto in automatico.",
  "consumption.csv.dropzone": "trascina qui il CSV, oppure",
  "consumption.csv.warnings": "{n} avvisi",

  // --- consumi: template mensili ---
  "consumption.monthly.intro":
    "Per ogni mese indica il consumo medio giornaliero e la sagoma tipica del giorno. L'app distribuisce i totali sulle 8760 ore mantenendo il totale mensile.",
  "consumption.monthly.customShapesLabel": "sagome personalizzate (avanzato)",
  "consumption.monthly.customShapesTip.term": "Sagome personalizzate",
  "consumption.monthly.customShapesTip.desc":
    "Aggiunge alla tendina l'opzione «Personalizzata…»: 24 numeri, uno per ora (0–23), che descrivono la forma del giorno. Contano solo i rapporti tra i valori — la scala la fissa il kWh/giorno. Es: 1,1,1,1,1,1,2,3,2,1,… = picco alle 7.",
  "consumption.monthly.colMonth": "Mese",
  "consumption.monthly.colDailyKwh": "kWh/giorno",
  "consumption.monthly.dailyKwhTip.term": "kWh/giorno",
  "consumption.monthly.dailyKwhTip.desc":
    "Consumo medio giornaliero del mese. Lo trovi in bolletta: consumo del mese ÷ giorni. Es. 300 kWh a gennaio ≈ 9.7 kWh/giorno.",
  "consumption.monthly.colShape": "Sagoma",
  "consumption.monthly.shapeTip.term": "Sagoma del giorno",
  "consumption.monthly.shapeTip.desc":
    "Come si distribuiscono i kWh del giorno sulle 24 ore. «Costante»: stesso consumo a ogni ora (carichi continui, seconda casa). «Mattina + sera»: picchi 7–8 e 18–21, notte bassa — famiglia fuori casa di giorno (il profilo residenziale tipico). «Diurno (smart-working)»: come mattina+sera ma con consumo anche 9–17, qualcuno a casa di giorno. «Notturno»: notte alta, giorno basso, sera media — carichi programmati di notte (boiler, tariffa bioraria, ricarica EV).",
  "consumption.monthly.customOption": "Personalizzata…",
  "consumption.monthly.customPlaceholder": "24 valori separati da virgola",
  "consumption.monthly.weekendFactor.label": "Fattore weekend",
  "consumption.monthly.weekendFactor.desc":
    "Moltiplica il consumo di sabato e domenica rispetto ai feriali: 1 = uguali; 1.3 = +30% nel weekend (si sta più a casa); 0.7 = −30% (casa vuota nel weekend). Il totale mensile resta quello impostato: cambia solo la ripartizione.",

  // --- consumi: sagome del giorno ---
  "consumption.shape.flat": "Costante",
  "consumption.shape.morningEvening": "Mattina + sera",
  "consumption.shape.daytimeWfh": "Diurno (smart-working)",
  "consumption.shape.nightHeavy": "Notturno",

  // --- consumi: stima parametrica ---
  "consumption.parametric.disclaimer":
    "Stima approssimativa calcolata dai parametri inseriti: non sono dati reali, usala come ordine di grandezza.",
  "consumption.parametric.needSetup":
    "La stima parametrica è disponibile dopo il setup della tua località (serve la temperatura oraria reale del sito). Esegui prima il setup dati PVGIS.",
  "consumption.parametric.advancedLabel": "parametri avanzati (pompa di calore, puffer)",
  "consumption.parametric.advancedTip.term": "Parametri avanzati",
  "consumption.parametric.advancedTip.desc":
    "Dettagli della pompa di calore e dell'accumulo termico. I default sono valori tipici: toccali solo se hai la scheda tecnica della tua PdC.",

  // --- consumi: campi casa (parametrico) ---
  "consumption.unit.kwhM2y": "kWh/m²·anno",
  "consumption.unit.kwhThPerYear": "kWh term/anno",
  "consumption.unit.hours": "ore",
  "consumption.field.heatedAreaM2.label": "Superficie riscaldata",
  "consumption.field.heatedAreaM2.desc":
    "Metri quadri effettivamente riscaldati dalla pompa di calore (escludi garage, cantina, locali spenti). Es. 120 m² per una villetta media.",
  "consumption.field.specificHeatDemandKwhM2y.label": "Fabbisogno termico specifico",
  "consumption.field.specificHeatDemandKwhM2y.desc":
    "Quanta energia termica chiede la casa per m² all'anno: dipende dall'isolamento. 40 ≈ nuova costruzione ben isolata; 90 ≈ casa ristrutturata; 120+ ≈ casa non isolata. Lo trovi anche sull'APE.",
  "consumption.field.occupants.label": "Occupanti",
  "consumption.field.occupants.desc":
    "Persone che vivono in casa: scala l'acqua calda sanitaria e i consumi legati alla presenza.",
  "consumption.field.wfhOccupants.label": "Occupanti in smart-working",
  "consumption.field.wfhOccupants.desc":
    "Quante persone restano a casa nei giorni feriali (lavoro da remoto): aggiungono consumo diurno nei feriali (PC, luci, cucina a pranzo).",
  "consumption.field.heatPumpScop.label": "SCOP pompa di calore",
  "consumption.field.heatPumpScop.desc":
    "Rendimento STAGIONALE della pompa di calore: kWh termici resi per kWh elettrico assorbito, in media sull'inverno. È sulla scheda tecnica (SCOP). Tipico 3–4.5; fissa la scala del consumo elettrico per riscaldare.",
  "consumption.field.dhwKwhPerPersonY.label": "ACS per persona",
  "consumption.field.dhwKwhPerPersonY.desc":
    "Energia TERMICA annua per l'acqua calda sanitaria, per persona. ~700 kWh tipico (docce quotidiane); 0 se l'acqua calda non è elettrica (es. caldaia a gas).",
  "consumption.field.baseLoadAnnualKwh.label": "Consumo base annuo",
  "consumption.field.baseLoadAnnualKwh.desc":
    "Tutto tranne riscaldamento e acqua calda: elettrodomestici, luci, standby, cucina. 2000–3500 kWh tipico per una famiglia; è circa la bolletta annua di chi NON ha pompa di calore.",
  "consumption.field.heatingBaseTempC.label": "Temperatura base riscaldamento",
  "consumption.field.heatingBaseTempC.desc":
    "Temperatura esterna sopra la quale il riscaldamento resta spento: sotto questa soglia il fabbisogno cresce col freddo. Tipico 15–16 °C.",
  "consumption.field.copRef.label": "COP di riferimento",
  "consumption.field.copRef.desc":
    "COP dichiarato dalla scheda tecnica al punto di riferimento (vedi campo successivo). Serve a modellare come il rendimento cala col freddo. Es. 4.5 per una PdC dichiarata A7/W35.",
  "consumption.field.copRefOutdoorC.label": "T esterna del COP rif.",
  "consumption.field.copRefOutdoorC.desc":
    "Temperatura esterna a cui è dichiarato il COP di riferimento: nelle schede \"A7/W35\" è il 7 di A7.",
  "consumption.field.flowTempC.label": "Temperatura mandata",
  "consumption.field.flowTempC.desc":
    "Temperatura dell'acqua che circola nei terminali: ~35 °C pavimento radiante, 45–55 °C radiatori. Più è alta, peggiore il COP reale.",
  "consumption.field.dhwCop.label": "COP ACS",
  "consumption.field.dhwCop.desc":
    "Rendimento della pompa di calore quando scalda l'acqua sanitaria: più basso del riscaldamento perché l'acqua va portata a 50–60 °C. Tipico 2.5–3.",
  "consumption.field.standbyLossPct.label": "Perdite di standby",
  "consumption.field.standbyLossPct.desc":
    "Perdite del serbatoio/accumulo (calore disperso da mantenere), in % del fabbisogno termico di riscaldamento + ACS. Tipico 3–5%.",
  "consumption.field.bufferSmoothingHours.label": "Inerzia puffer",
  "consumption.field.bufferSmoothingHours.desc":
    "Inerzia termica del puffer/impianto: distribuisce i picchi di riscaldamento su questa finestra di ore, appiattendo la curva. 0 = nessun accumulo; 2–4 tipico con puffer.",

  // --- consumi: anteprima ---
  "consumption.preview.annualEstimate": "Consumo annuo stimato:",
  "consumption.preview.monthlyTitle": "Consumo per mese (kWh)",
  "consumption.preview.seriesConsumption": "consumo",
  "consumption.preview.dayTitle": "Giornata tipo — media oraria annua (kWh)",
  "consumption.preview.dayTip.term": "Giornata tipo",
  "consumption.preview.dayTip.desc":
    "Per ogni ora del giorno (0–23), la media di quell'ora su tutti i giorni dell'anno: non è un giorno preciso ma il profilo medio. Feriali e weekend sono separati, così il fattore weekend e le sagome si leggono direttamente.",
  "consumption.preview.seriesWeekday": "feriale",
  "consumption.preview.seriesWeekend": "weekend",

  // --- comune: durate ---
  "common.years": "{n} anni",
  "common.yearN": "anno {n}",

  // --- scenari (etichette colonne/serie) ---
  "scenario.noPv": "senza FV",
  "scenario.pv": "FV",
  "scenario.noBattery": "senza batteria",
  "scenario.withBattery": "con batteria",
  "scenario.both": "entrambi",
  "scenario.with": "con",
  "scenario.without": "senza",

  // --- grafici: serie/assi (minuscolo) ---
  "chart.production": "produzione",
  "chart.selfConsumption": "autoconsumo",
  "chart.import": "import",
  "chart.export": "export",
  "chart.clipping": "clipping",
  "chart.consumption": "consumo",
  "chart.hour": "ore {h}",

  // --- metriche: intestazioni tabella + etichette righe ---
  "metrics.metric": "Metrica",
  "metrics.hideRow": "nascondi riga",
  "metrics.showRow": "mostra riga",
  "metrics.hiddenRows": "righe nascoste:",
  "metrics.buyCost": "Spesa acquisto",
  "metrics.sellRevenue": "Ricavo vendita",
  "metrics.netCostYear": "Costo netto/anno",
  "metrics.netDay": "Netto giorno",
  "metrics.production": "Produzione",
  "metrics.productionActual": "Produzione pratica",
  "metrics.consumption": "Consumo",
  "metrics.selfConsumption": "Autoconsumo",
  "metrics.selfConsumptionRate": "Tasso autoconsumo",
  "metrics.selfSufficiency": "Autosufficienza",
  "metrics.import": "Import",
  "metrics.importGrid": "Import da rete",
  "metrics.export": "Export",
  "metrics.exportGrid": "Export in rete",
  "metrics.clipping": "Clipping",
  "metrics.clippingRecovered": "Clipping recuperato",
  "metrics.cycles": "Cicli",
  "metrics.cyclesYear": "Cicli batteria/anno",
  "metrics.roundTripLoss": "Perdita round-trip",
  "metrics.batteryDischarge": "Scarica batteria",
  "metrics.payback": "Tempo di rientro",
  "metrics.energyCostsBattery": "Costi energia (Δ = effetto batteria)",
  "metrics.energyCostsPv": "Costi energia (Δ = FV vs senza FV)",

  // --- panoramica annuale ---
  "annual.productionYear": "Produzione {year}",
  "annual.prodDetail": "teorica {theo} · clipping {clip} ({clipPct}), {hours} h",
  "annual.prodPeak": " · picco {peak} kW",
  "annual.multiyearAvg": "media 2005–2023: {kwh} kWh",
  "annual.pointsPlus": "+{points} punti",
  "annual.paybackOver": "oltre 40 anni",
  "annual.paybackDetail": "CAPEX {capex} € · incentivo {incentive} € · vs «senza FV»",
  "annual.energyChartBattery": "Energia: senza vs con batteria",
  "annual.energyChartPv": "Energia (FV)",

  // --- vista mensile ---
  "monthly.netCostPerMonth": "Costo netto per mese",
  "monthly.productionTitle": "Produzione mensile (pratica + clipping = teorica)",
  "monthly.selfConsumptionGridTitle": "Autoconsumo e rete per mese",
  "monthly.seriesScenario": "{metric} ({scenario})",

  // --- giorno per giorno ---
  "daily.pickMaxClipping": "max clipping",
  "daily.pickMaxProduction": "max produzione",
  "daily.pickMinProduction": "min produzione",
  "daily.summaryBattery": "Riepilogo giorno (Δ = effetto batteria)",
  "daily.summaryPv": "Riepilogo giorno (Δ = FV vs senza FV)",
  "daily.powerTitle": "Potenza oraria (kW)",
  "daily.noBatterySystemA": "Sistema A senza batteria: nessun accumulo.",
  "daily.socTitle": "Stato di carica batteria (kWh)",
  "daily.noBatteryScenario": "Scenario «senza batteria»: nessun accumulo.",

  // --- confronto ---
  "compare.annualTitle": "Annuale: {a} vs {b}",
  "compare.monthlyTitle": "Mensile: {a} vs {b}",
  "compare.tableLabel": "Tabella:",
  "compare.reference": "(riferimento)",
  "compare.charts": "Grafici: A vs B.",
  "compare.editSystemB": "Modifica il Sistema B nel menu per confrontarlo con A.",
  "compare.systemSpecs": "{label}: {kwp} kWp · batteria {batt} kWh",
  "compare.annualIndicators": "Indicatori annui",
  "compare.coveredLabel": "coperto {label}",
  "compare.productionLabel": "produzione {label}",
  "compare.socTitle": "Stato di carica batteria (SoC)",
  "compare.socLabel": "SoC {label}",
  "compare.maxKwh": "max {kwh} kWh",
  "compare.maxLabel": "max {label}",
  "compare.acCeilingLabel": "tetto AC {label} ({kw} kW)",
  "compare.dayBalanceTitle": "Bilancio energetico del giorno",

  // --- grafico potenza ---
  "power.coveredPvBattery": "coperto PV+batteria",
  "power.coveredPvOnly": "coperto solo PV",
  "power.productionTheoretical": "produzione teorica",
  "power.consumptionSynthetic": "consumo (sint.)",
  "power.acCeiling": "tetto AC {kw} kW",

  // --- grafico batteria ---
  "battery.soc": "SoC batteria",
  "battery.capacity": "capacità {kwh} kWh",

  // --- cashflow ---
  "cashflow.buyAvoided": "Spesa acquisto evitata",
  "cashflow.exportRevenue": "Ricavo vendita (export)",
  "cashflow.annualSaving": "Risparmio annuo",
  "cashflow.incentivePerYear": "Incentivo/anno (×{n})",
  "cashflow.capex": "Costo impianto (CAPEX)",
  "cashflow.chartTitle": "Andamento economico (cashflow cumulato)",
  "cashflow.noteA": "Quanto rendi nel tempo rispetto a",
  "cashflow.noteInstallNothing": "non installare nulla",
  "cashflow.noteB":
    ": parti da −CAPEX (anno 0) e ogni anno aggiungi il risparmio in bolletta (acquisto evitato + export) e, per i primi {n} anni, la quota incentivo. La curva taglia lo",
  "cashflow.noteZero": "zero",
  "cashflow.noteC": "al tempo di rientro.",
  "cashflow.system1": "Sistema 1",
  "cashflow.system2": "Sistema 2",
  "cashflow.years": "Anni",
  "cashflow.axisYears": "anni",
  "cashflow.axisCumulative": "€ cumulati",
  "cashflow.crossover": "sorpasso {years}a",
  "cashflow.crossoverA": "supera",
  "cashflow.crossoverAfter": "dopo",
  "cashflow.crossoverCumulative": "(cumulato ≈ {eur})",
  "cashflow.leadAlwaysA": "resta sempre davanti a",
  "cashflow.leadAlwaysB": "entro {years} anni (nessun sorpasso).",
  "cashflow.breakdownTitle": "Scomposizione del rientro (€/anno)",
  "cashflow.cumulativePerYear": "Cumulato per anno",

  // --- attribuzioni / disclaimer (verbatim, vincolanti) ---
  "attribution.pvgis": "Dati solari: PVGIS © Unione Europea",
  "disclaimer.short": "Stime a scopo informativo, non consulenza tecnica o finanziaria",

  // --- footer ---
  "footer.info": "Info & Privacy",
  "footer.blog": "Blog",
  "footer.linkedin": "LinkedIn",
  "footer.coffee": "Offrimi un caffè",

  // --- pagina Info & Privacy ---
  "about.title": "Info & Privacy",
  "about.whatTitle": "Cos'è",
  "about.what":
    "Uno strumento per stimare produzione, autoconsumo, risparmio in bolletta e tempo di rientro di un impianto fotovoltaico con o senza batteria, a partire dai dati climatici PVGIS della tua località.",
  "about.howTitle": "Come funziona",
  "about.how1": "Imposti località, falde del tetto e impianto; l'app scarica i dati solari orari da PVGIS.",
  "about.how2": "Aggiungi i consumi (curva reale da CSV, template mensili o stima parametrica).",
  "about.how3": "Confronti scenari, batteria e tariffe con modelli deterministici — nessuna IA a runtime.",
  "about.privacyTitle": "Privacy",
  "about.privacy":
    "Tutti i dati restano nel tuo browser (IndexedDB/localStorage). Nessun account, nessun cookie di profilazione. Il proxy verso PVGIS non registra le coordinate. Analytics Cloudflare senza cookie.",
  "about.attributionsTitle": "Attribuzioni",
  "about.licenseTitle": "Licenza",
  "about.license": "Codice sorgente sotto licenza AGPL-3.0.",
  "about.repo": "Repository su GitHub",
  "about.disclaimerTitle": "Avvertenza",
};
