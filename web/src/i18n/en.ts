import type { Dict } from "./types.ts";

// English dictionary. Keys must stay in parity with it.ts (guarded by test/i18n.test.ts).
export const en: Dict = {
  // --- app / common ---
  "format.months": "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
  "app.title": "PvPlanner - Solar PV Analysis",
  "app.loading": "Loading…",
  "lang.it": "IT",
  "lang.en": "EN",
  "lang.switch": "Language",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.chooseFile": "choose file",
  "common.apply": "Apply",
  "common.export": "Export",
  "common.import": "Import",

  // --- attribution / legal (verbatim) ---
  "attribution.osm": "Geocoding © OpenStreetMap contributors",

  // --- glossary ---
  "glossary.intro": "What the dashboard metrics mean. Formulas refer to a single hour (Δt = 1 h, energy in kWh).",

  // --- tabs / header / footer ---
  "tabs.annual": "Annual overview",
  "tabs.monthly": "Monthly",
  "tabs.daily": "Day by day",
  "tabs.compare": "Compare",
  "tabs.glossary": "Glossary",
  "header.sub": "{system}: {falde} · AC ceiling {acCap} kW · {battery}",
  "header.battery": "battery {kwh} kWh",
  "header.noBattery": "no battery",
  "demo.viewing": "You are viewing demo data (Rome).",
  "demo.runSetup": "⚙ Run the setup for your location",

  // --- wizard: structure ---
  "wizard.title": "PVGIS data setup",
  "wizard.step.location": "Location",
  "wizard.step.roof": "Roof",
  "wizard.step.fetch": "Download",
  "wizard.step.consumption": "Consumption",
  "wizard.back": "← Back",
  "wizard.next": "Next →",
  "wizard.finish": "Done ✓",
  "wizard.skip": "Skip",

  // --- wizard: location ---
  "wizard.location.title": "Location",
  "wizard.location.searchLabel": "Search for a place",
  "wizard.location.searchPlaceholder": "e.g. Rome, Via Nazionale 1",
  "wizard.location.search": "Search",
  "wizard.location.searching": "Searching…",
  "wizard.location.noResults": "No results.",
  "wizard.location.searchError": "Search failed. Try again in a few seconds.",
  "wizard.location.selected": "Selected:",
  "wizard.location.lat": "Latitude",
  "wizard.location.lon": "Longitude",
  "wizard.location.timezone": "Time zone",
  "wizard.location.horizon": "Account for the horizon (terrain shading)",
  "wizard.location.attribution": "© OpenStreetMap contributors",

  // --- wizard: roof ---
  "wizard.roof.title": "Roof and faces",
  "wizard.roof.azimuthHint": "0 = South · −90 = East · +90 = West, PVGIS convention",
  "wizard.roof.faldaIdAria": "Roof-face ID",
  "wizard.roof.removeFalda": "Remove roof face",
  "wizard.roof.azimuth": "Azimuth (°)",
  "wizard.roof.tilt": "Tilt (°)",
  "wizard.roof.addFalda": "+ Add roof face",
  "wizard.roof.mounting": "Mounting",
  "wizard.roof.mountingBuilding": "Building-integrated",
  "wizard.roof.mountingFree": "Free-standing (ground)",
  "wizard.roof.systemLoss": "System losses",
  "wizard.roof.radiationDb": "Radiation database",
  "wizard.roof.yearFrom": "Year from",
  "wizard.roof.yearTo": "Year to",
  "wizard.roof.multiYearNote": "hour-by-hour average of {n} years ({from}–{to})",

  // --- wizard: download ---
  "wizard.fetch.title": "PVGIS data download",
  "wizard.fetch.state.idle": "waiting",
  "wizard.fetch.state.running": "in progress…",
  "wizard.fetch.state.ok": "ok",
  "wizard.fetch.state.error": "error",
  "wizard.fetch.retry": "Retry",
  "wizard.fetch.download": "Download PVGIS data",
  "wizard.fetch.downloading": "Downloading…",
  "wizard.fetch.fileReadError": "Could not read one of the files (invalid JSON).",
  "wizard.fetch.dropBefore": "or drag the",
  "wizard.fetch.dropAfter": "JSON files downloaded manually from the PVGIS site here (one per roof face), or",
  "wizard.fetch.removeFile": "Remove file",

  // --- wizard: consumption ---
  "wizard.consumption.title": "Consumption",
  "wizard.consumption.needFetch": "Download the PVGIS data first: consumption is added on top of the site dataset.",
  "wizard.consumption.intro":
    "Add consumption to unlock the economic and battery analyses: “Done ✓” applies the active method's values. “Skip” finishes without consumption; you can add it later from the “Consumption” section of the configuration menu.",

  // --- validations (messages returned as keys by validate*) ---
  "validate.wizard.lat": "Latitude must be between -90 and 90.",
  "validate.wizard.lon": "Longitude must be between -180 and 180.",
  "validate.wizard.timezone": "Invalid time zone.",
  "validate.wizard.systemLoss": "System losses must be between 0 and 40.",
  "validate.wizard.radiationDb": "Invalid radiation database.",
  "validate.wizard.yearsRange": "Years outside the range allowed for the selected database.",
  "validate.wizard.yearsOrder": "The start year must be ≤ the end year.",
  "validate.wizard.faldeMin": "At least one roof face is required.",
  "validate.wizard.faldaIdEmpty": "Roof-face ID cannot be empty.",
  "validate.wizard.faldaIdDup": "Duplicate roof-face IDs.",
  "validate.wizard.faldaAzimuth": "A roof face azimuth must be between -180 and 180.",
  "validate.wizard.faldaTilt": "A roof face tilt must be between 0 and 90.",
  "validate.system.geometryMismatch": "Geometry differs from the baseline (roof faces do not match): import not supported.",
  "validate.system.faldaMissing": "A baseline roof face is missing.",
  "validate.system.faldaAzimuth": "A roof face azimuth does not match the baseline (geometry cannot be changed).",
  "validate.system.faldaPanels": "A roof face has invalid panels/W.",
  "validate.system.acCap": "AC ceiling must be > 0.",
  "validate.system.batteryCapacity": "Invalid battery capacity.",
  "validate.system.batteryUsablePct": "Usable percentage must be between 0 and 100.",
  "validate.system.roundTrip": "Round-trip must be between 0 and 1.",
  "validate.system.installationCost": "Invalid installation cost.",
  "validate.tariff.defaultBuyNegative": "The default price cannot be negative.",
  "validate.tariff.sellNegative": "The sell price cannot be negative.",
  "validate.tariff.bandBuyNegative": "A band has a negative price.",
  "validate.tariff.bandHours": "A band has hours outside the 0–24 range.",

  // --- menu / sidebar ---
  "menu.title": "Settings",
  "menu.open": "Open settings",
  "menu.openTitle": "Settings (m)",
  "menu.setup": "⚙ PVGIS data setup…",
  "menu.consumption": "Consumption",
  "menu.consumptionHint": "(unlocks economics/battery)",
  "menu.consumptionNeedSetup": "Consumption is added on top of your location's dataset.",
  "menu.runSetup": "Run the setup…",
  "menu.tariff": "Tariff",
  "menu.incentives": "Incentives",
  "menu.incentivesHint": "(payback)",
  "menu.systemA": "System A",
  "menu.systemAHint": "(single-system views)",
  "menu.systemB": "System B",
  "menu.systemBHint": "(Compare)",

  // --- share / export-import setup ---
  "share.section": "Share / Export setup",
  "share.share": "Share via link",
  "share.export": "Export file",
  "share.import": "Import file",
  "share.needSetup": "Run the setup for your location first.",
  "share.dialogTitle": "Share the setup",
  "share.warning": "The link contains the plant location and configuration. CSV consumption is not included.",
  "share.copy": "Copy link",
  "share.copied": "Copied ✓",
  "share.importError": "Invalid setup file.",
  "share.confirmTitle": "Shared configuration",
  "share.confirmBody": "Download PVGIS data for this location? ({n} calls)",
  "share.confirmYes": "Yes, download",

  // --- system editor ---
  "system.defaultConfig": "default (config)",
  "system.refBody": "{falde} · battery {batt} kWh · cost {cost} €",
  "system.name": "Name",
  "system.panels": "panels",
  "system.wpPerPanel": "W/panel",
  "system.acCap": "Inverter AC ceiling",
  "system.batteryTotal": "Battery total capacity",
  "system.batteryTotalUnit": "kWh, 0=none",
  "system.batteryUsablePct": "Battery usable %",
  "system.roundTrip": "Round-trip",
  "system.coupling": "Battery coupling",
  "system.couplingDc": "DC (hybrid inverter)",
  "system.couplingAc": "AC (separate battery inverter)",
  "system.installCost": "Installation cost",
  "system.totalLabel": "Total",
  "system.usableBattery": "usable battery",
  "system.reset": "Reset to defaults",
  "system.copyFrom": "Copy from {label}",

  // --- tariff editor ---
  "tariff.title": "Tariff",
  "tariff.presetMono": "Single-rate",
  "tariff.presetF1F2F3": "F1/F2/F3",
  "tariff.name": "Name",
  "tariff.buyDefault": "Default purchase price",
  "tariff.sell": "Sell price",
  "tariff.bandFrom": "from hour",
  "tariff.bandTo": "to hour",
  "tariff.bandDay": "day {d}",
  "tariff.bandBuy": "purchase price",
  "tariff.addBand": "+ band",
  "tariff.note": "Hours not covered by any band use the default price. Hourly resolution.",
  "tariff.dayLabels": "M,T,W,T,F,S,S",

  // --- incentive editor ---
  "incentive.percentMode": "% of cost",
  "incentive.fixedMode": "fixed amount",
  "incentive.valuePercent": "Incentive (% of cost)",
  "incentive.valueFixed": "Incentive (€)",
  "incentive.years": "Paid back over (years)",
  "incentive.note": "1 year = immediate. The incentive shortens the payback time.",

  // --- consumption locked box ---
  "locked.text": "🔌 Add consumption to unlock the economic and battery analyses",
  "locked.hint": "(next version)",

  // --- import (modal + parsers) ---
  "import.title": "Import {what}",
  "import.dropPrompt": "Drag the JSON file here, or",
  "import.errorGeneric": "Import error.",
  "import.fileUnreadable": "Could not read the file.",
  "import.jsonUnreadable": "Invalid file: unreadable JSON.",
  "import.system.notObject": "Invalid config: expected an object.",
  "import.system.faldeMissing": "Invalid config: «falde» missing.",
  "import.system.field": "Invalid config: a field has an invalid value.",
  "import.tariff.notObject": "Invalid tariff: expected an object.",
  "import.tariff.field": "Invalid tariff: a field has an invalid value.",

  // --- consumption: editor + methods ---
  "consumption.method.csv": "CSV",
  "consumption.method.monthly": "Monthly templates",
  "consumption.method.parametric": "Parametric estimate",
  "consumption.editor.inUse": "In use:",
  "consumption.editor.perYear": "kWh/year",
  "consumption.coverage": "coverage {pct}%",

  // --- consumption: CSV ---
  "consumption.csv.introA": "Load your real ",
  "consumption.csv.loadCurve": "load curve",
  "consumption.csv.introB": " (from your distributor's portal, e.g. e-distribuzione) or a two-column CSV ",
  "consumption.csv.introC": " (hourly or quarter-hourly). The format is detected automatically.",
  "consumption.csv.dropzone": "drag the CSV here, or",
  "consumption.csv.warnings": "{n} warnings",

  // --- consumption: monthly templates ---
  "consumption.monthly.intro":
    "For each month enter the average daily consumption and the typical day shape. The app distributes the totals across the 8760 hours while preserving the monthly total.",
  "consumption.monthly.customShapesLabel": "custom day shapes (advanced)",
  "consumption.monthly.customShapesTip.term": "Custom day shapes",
  "consumption.monthly.customShapesTip.desc":
    "Adds a “Custom…” option to the dropdown: 24 numbers, one per hour (0–23), describing the shape of the day. Only the ratios between the values matter — the scale is set by kWh/day. E.g. 1,1,1,1,1,1,2,3,2,1,… = peak at 7.",
  "consumption.monthly.colMonth": "Month",
  "consumption.monthly.colDailyKwh": "kWh/day",
  "consumption.monthly.dailyKwhTip.term": "kWh/day",
  "consumption.monthly.dailyKwhTip.desc":
    "Average daily consumption for the month. You can find it on your bill: monthly consumption ÷ days. E.g. 300 kWh in January ≈ 9.7 kWh/day.",
  "consumption.monthly.colShape": "Shape",
  "consumption.monthly.shapeTip.term": "Day shape",
  "consumption.monthly.shapeTip.desc":
    "How the day's kWh are spread across the 24 hours. “Constant”: same consumption every hour (continuous loads, second home). “Morning + evening”: peaks at 7–8 and 18–21, low at night — a family out during the day (the typical residential profile). “Daytime (work-from-home)”: like morning+evening but with consumption also at 9–17, someone home during the day. “Night-heavy”: high at night, low during the day, medium in the evening — loads scheduled at night (water heater, two-band tariff, EV charging).",
  "consumption.monthly.customOption": "Custom…",
  "consumption.monthly.customPlaceholder": "24 comma-separated values",
  "consumption.monthly.weekendFactor.label": "Weekend factor",
  "consumption.monthly.weekendFactor.desc":
    "Multiplies Saturday and Sunday consumption relative to weekdays: 1 = equal; 1.3 = +30% on the weekend (more time at home); 0.7 = −30% (empty house on the weekend). The monthly total stays as set: only the distribution changes.",

  // --- consumption: day shapes ---
  "consumption.shape.flat": "Constant",
  "consumption.shape.morningEvening": "Morning + evening",
  "consumption.shape.daytimeWfh": "Daytime (work-from-home)",
  "consumption.shape.nightHeavy": "Night-heavy",

  // --- consumption: parametric estimate ---
  "consumption.parametric.disclaimer":
    "Rough estimate computed from the parameters you entered: this is not real data, use it as an order of magnitude.",
  "consumption.parametric.needSetup":
    "The parametric estimate is available after setting up your location (it needs the site's real hourly temperature). Run the PVGIS data setup first.",
  "consumption.parametric.advancedLabel": "advanced parameters (heat pump, buffer tank)",
  "consumption.parametric.advancedTip.term": "Advanced parameters",
  "consumption.parametric.advancedTip.desc":
    "Details of the heat pump and thermal storage. The defaults are typical values: touch them only if you have your heat pump's datasheet.",

  // --- consumption: house parameters (parametric) ---
  "consumption.unit.kwhM2y": "kWh/m²·year",
  "consumption.unit.kwhThPerYear": "kWh th/year",
  "consumption.unit.hours": "hours",
  "consumption.field.heatedAreaM2.label": "Heated area",
  "consumption.field.heatedAreaM2.desc":
    "Square metres actually heated by the heat pump (exclude garage, cellar, unheated rooms). E.g. 120 m² for a mid-size house.",
  "consumption.field.specificHeatDemandKwhM2y.label": "Specific heat demand",
  "consumption.field.specificHeatDemandKwhM2y.desc":
    "How much thermal energy the house needs per m² per year: it depends on insulation. 40 ≈ well-insulated new build; 90 ≈ renovated house; 120+ ≈ uninsulated house. You can also find it on the EPC.",
  "consumption.field.occupants.label": "Occupants",
  "consumption.field.occupants.desc":
    "People living in the house: scales domestic hot water and presence-related consumption.",
  "consumption.field.wfhOccupants.label": "Work-from-home occupants",
  "consumption.field.wfhOccupants.desc":
    "How many people stay home on weekdays (remote work): they add daytime consumption on weekdays (PC, lights, lunchtime cooking).",
  "consumption.field.heatPumpScop.label": "Heat pump SCOP",
  "consumption.field.heatPumpScop.desc":
    "SEASONAL efficiency of the heat pump: thermal kWh delivered per electrical kWh absorbed, averaged over the winter. It's on the datasheet (SCOP). Typical 3–4.5; it sets the scale of the electricity used for heating.",
  "consumption.field.dhwKwhPerPersonY.label": "DHW per person",
  "consumption.field.dhwKwhPerPersonY.desc":
    "Annual THERMAL energy for domestic hot water, per person. ~700 kWh typical (daily showers); 0 if hot water is not electric (e.g. gas boiler).",
  "consumption.field.baseLoadAnnualKwh.label": "Annual base load",
  "consumption.field.baseLoadAnnualKwh.desc":
    "Everything except heating and hot water: appliances, lights, standby, cooking. 2000–3500 kWh typical for a family; it's roughly the annual bill of someone WITHOUT a heat pump.",
  "consumption.field.heatingBaseTempC.label": "Heating base temperature",
  "consumption.field.heatingBaseTempC.desc":
    "Outdoor temperature above which heating stays off: below this threshold demand grows with the cold. Typical 15–16 °C.",
  "consumption.field.copRef.label": "Reference COP",
  "consumption.field.copRef.desc":
    "COP declared on the datasheet at the reference point (see next field). It's used to model how efficiency drops with the cold. E.g. 4.5 for a heat pump rated A7/W35.",
  "consumption.field.copRefOutdoorC.label": "Outdoor T of reference COP",
  "consumption.field.copRefOutdoorC.desc":
    "Outdoor temperature at which the reference COP is declared: on \"A7/W35\" datasheets it's the 7 in A7.",
  "consumption.field.flowTempC.label": "Flow temperature",
  "consumption.field.flowTempC.desc":
    "Temperature of the water circulating in the emitters: ~35 °C for underfloor heating, 45–55 °C for radiators. The higher it is, the worse the real COP.",
  "consumption.field.dhwCop.label": "DHW COP",
  "consumption.field.dhwCop.desc":
    "Heat pump efficiency when heating domestic hot water: lower than for space heating because the water must reach 50–60 °C. Typical 2.5–3.",
  "consumption.field.standbyLossPct.label": "Standby losses",
  "consumption.field.standbyLossPct.desc":
    "Tank/storage losses (heat lost to maintenance), as % of the heating + DHW thermal demand. Typical 3–5%.",
  "consumption.field.bufferSmoothingHours.label": "Buffer tank inertia",
  "consumption.field.bufferSmoothingHours.desc":
    "Thermal inertia of the buffer tank/system: it spreads heating peaks over this window of hours, flattening the curve. 0 = no storage; 2–4 typical with a buffer tank.",

  // --- consumption: preview ---
  "consumption.preview.annualEstimate": "Estimated annual consumption:",
  "consumption.preview.monthlyTitle": "Consumption per month (kWh)",
  "consumption.preview.seriesConsumption": "consumption",
  "consumption.preview.dayTitle": "Typical day — annual hourly average (kWh)",
  "consumption.preview.dayTip.term": "Typical day",
  "consumption.preview.dayTip.desc":
    "For each hour of the day (0–23), the average of that hour across all days of the year: not a specific day but the average profile. Weekdays and weekends are separated, so the weekend factor and the shapes can be read directly.",
  "consumption.preview.seriesWeekday": "weekday",
  "consumption.preview.seriesWeekend": "weekend",

  // --- common: durations ---
  "common.years": "{n} years",
  "common.yearN": "year {n}",

  // --- scenarios (column/series labels) ---
  "scenario.noPv": "no PV",
  "scenario.pv": "PV",
  "scenario.noBattery": "no battery",
  "scenario.withBattery": "with battery",
  "scenario.both": "both",
  "scenario.with": "with",
  "scenario.without": "without",

  // --- charts: series/axes (lowercase) ---
  "chart.production": "production",
  "chart.selfConsumption": "self-consumption",
  "chart.import": "import",
  "chart.export": "export",
  "chart.clipping": "clipping",
  "chart.consumption": "consumption",
  "chart.hour": "hour {h}",

  // --- metrics: table headers + row labels ---
  "metrics.metric": "Metric",
  "metrics.hideRow": "hide row",
  "metrics.showRow": "show row",
  "metrics.hiddenRows": "hidden rows:",
  "metrics.buyCost": "Purchase cost",
  "metrics.sellRevenue": "Sale revenue",
  "metrics.netCostYear": "Net cost/year",
  "metrics.netDay": "Net for the day",
  "metrics.production": "Production",
  "metrics.productionActual": "Actual production",
  "metrics.consumption": "Consumption",
  "metrics.selfConsumption": "Self-consumption",
  "metrics.selfConsumptionRate": "Self-consumption rate",
  "metrics.selfSufficiency": "Self-sufficiency",
  "metrics.import": "Import",
  "metrics.importGrid": "Grid import",
  "metrics.export": "Export",
  "metrics.exportGrid": "Grid export",
  "metrics.clipping": "Clipping",
  "metrics.clippingRecovered": "Recovered clipping",
  "metrics.cycles": "Cycles",
  "metrics.cyclesYear": "Battery cycles/year",
  "metrics.roundTripLoss": "Round-trip loss",
  "metrics.batteryDischarge": "Battery discharge",
  "metrics.payback": "Payback time",
  "metrics.energyCostsBattery": "Energy costs (Δ = battery effect)",
  "metrics.energyCostsPv": "Energy costs (Δ = PV vs no PV)",

  // --- annual overview ---
  "annual.productionYear": "Production {year}",
  "annual.prodDetail": "theoretical {theo} · clipping {clip} ({clipPct}), {hours} h",
  "annual.prodPeak": " · peak {peak} kW",
  "annual.multiyearAvg": "2005–2023 average: {kwh} kWh",
  "annual.pointsPlus": "+{points} points",
  "annual.paybackOver": "over 40 years",
  "annual.paybackDetail": "CAPEX {capex} € · incentive {incentive} € · vs “no PV”",
  "annual.energyChartBattery": "Energy: no battery vs with battery",
  "annual.energyChartPv": "Energy (PV)",

  // --- monthly view ---
  "monthly.netCostPerMonth": "Net cost per month",
  "monthly.productionTitle": "Monthly production (actual + clipping = theoretical)",
  "monthly.selfConsumptionGridTitle": "Self-consumption and grid per month",
  "monthly.seriesScenario": "{metric} ({scenario})",

  // --- day by day ---
  "daily.pickMaxClipping": "max clipping",
  "daily.pickMaxProduction": "max production",
  "daily.pickMinProduction": "min production",
  "daily.summaryBattery": "Day summary (Δ = battery effect)",
  "daily.summaryPv": "Day summary (Δ = PV vs no PV)",
  "daily.powerTitle": "Hourly power (kW)",
  "daily.noBatterySystemA": "System A without battery: no storage.",
  "daily.socTitle": "Battery state of charge (kWh)",
  "daily.noBatteryScenario": "“No battery” scenario: no storage.",

  // --- compare ---
  "compare.annualTitle": "Annual: {a} vs {b}",
  "compare.monthlyTitle": "Monthly: {a} vs {b}",
  "compare.tableLabel": "Table:",
  "compare.reference": "(reference)",
  "compare.charts": "Charts: A vs B.",
  "compare.editSystemB": "Edit System B in the menu to compare it with A.",
  "compare.systemSpecs": "{label}: {kwp} kWp · battery {batt} kWh",
  "compare.annualIndicators": "Annual indicators",
  "compare.coveredLabel": "covered {label}",
  "compare.productionLabel": "production {label}",
  "compare.socTitle": "Battery state of charge (SoC)",
  "compare.socLabel": "SoC {label}",
  "compare.maxKwh": "max {kwh} kWh",
  "compare.maxLabel": "max {label}",
  "compare.acCeilingLabel": "AC ceiling {label} ({kw} kW)",
  "compare.dayBalanceTitle": "Day energy balance",

  // --- power chart ---
  "power.coveredPvBattery": "covered PV+battery",
  "power.coveredPvOnly": "covered PV only",
  "power.productionTheoretical": "theoretical production",
  "power.consumptionSynthetic": "consumption (synth.)",
  "power.acCeiling": "AC ceiling {kw} kW",

  // --- battery chart ---
  "battery.soc": "battery SoC",
  "battery.capacity": "capacity {kwh} kWh",

  // --- cashflow ---
  "cashflow.buyAvoided": "Avoided purchase cost",
  "cashflow.exportRevenue": "Sale revenue (export)",
  "cashflow.annualSaving": "Annual saving",
  "cashflow.incentivePerYear": "Incentive/year (×{n})",
  "cashflow.capex": "System cost (CAPEX)",
  "cashflow.chartTitle": "Economic trend (cumulative cash flow)",
  "cashflow.noteA": "How much you earn over time compared to",
  "cashflow.noteInstallNothing": "installing nothing",
  "cashflow.noteB":
    ": you start from −CAPEX (year 0) and each year you add the bill savings (avoided purchase + export) and, for the first {n} years, the incentive share. The curve crosses",
  "cashflow.noteZero": "zero",
  "cashflow.noteC": "at the payback time.",
  "cashflow.system1": "System 1",
  "cashflow.system2": "System 2",
  "cashflow.years": "Years",
  "cashflow.axisYears": "years",
  "cashflow.axisCumulative": "cumulative €",
  "cashflow.crossover": "overtake {years}y",
  "cashflow.crossoverA": "overtakes",
  "cashflow.crossoverAfter": "after",
  "cashflow.crossoverCumulative": "(cumulative ≈ {eur})",
  "cashflow.leadAlwaysA": "stays ahead of",
  "cashflow.leadAlwaysB": "within {years} years (no overtake).",
  "cashflow.breakdownTitle": "Payback breakdown (€/year)",
  "cashflow.cumulativePerYear": "Cumulative per year",

  // --- attributions / disclaimer (verbatim, binding) ---
  "attribution.pvgis": "Solar data: PVGIS © European Union",
  "disclaimer.short": "Estimates for informational purposes only — not technical or financial advice",

  // --- footer ---
  "footer.info": "Info & Privacy",
  "footer.blog": "Blog",
  "footer.linkedin": "LinkedIn",
  "footer.coffee": "Buy me a coffee",

  // --- Info & Privacy page ---
  "about.title": "Info & Privacy",
  "about.whatTitle": "What it is",
  "about.what":
    "A tool to estimate the production, self-consumption, bill savings and payback time of a solar PV system with or without a battery, starting from PVGIS climate data for your location.",
  "about.howTitle": "How it works",
  "about.how1": "Set the location, roof faces and system; the app downloads hourly solar data from PVGIS.",
  "about.how2": "Add your consumption (real load curve from CSV, monthly templates, or a parametric estimate).",
  "about.how3": "Compare scenarios, battery and tariffs with deterministic models — no AI at runtime.",
  "about.privacyTitle": "Privacy",
  "about.privacy":
    "All data stays in your browser (IndexedDB/localStorage). No account, no profiling cookies. The PVGIS proxy does not log coordinates. Cloudflare analytics without cookies.",
  "about.attributionsTitle": "Attributions",
  "about.licenseTitle": "License",
  "about.license": "Source code licensed under AGPL-3.0.",
  "about.repo": "Repository on GitHub",
  "about.disclaimerTitle": "Disclaimer",
};
