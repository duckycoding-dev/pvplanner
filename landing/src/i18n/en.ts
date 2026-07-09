import type { LandingCopy } from "./types";

// Copy verbatim from spec docs/superpowers/specs/2026-07-09-landing-page-design.md §4.
// Written per-language, not machine-translated. Do not edit without updating the spec.
export const en: LandingCopy = {
  meta: {
    title: "PVVerdict — Is rooftop solar worth it? The verdict with real numbers",
    description:
      "PVVerdict simulates your system hour by hour on PVGIS climate data for your location — with or without a battery, with your time-of-use rates — and gives you the verdict: payback years, savings, self-consumption.",
  },
  nav: { how: "How it works", features: "What you see", faq: "FAQ", cta: "Try the tool" },
  hero: {
    h1: "Is rooftop solar actually worth it? Find out with real numbers.",
    sub: "PVVerdict simulates your system hour by hour on PVGIS climate data for your location — with or without a battery, with your time-of-use rates — and gives you the verdict: payback years, savings, self-consumption. Free, in your browser, no account.",
    cta: "Try the tool now",
    micro:
      "Opens with a ready-made example (Rome): explore the numbers, then run the setup for your own location. Two minutes.",
    trust: ["Free", "Open source", "No account", "Your data never leaves your browser"],
    verdictBox: { payback: "Payback", battery: "Battery worth it", selfConsumption: "Self-consumption" },
  },
  problem: {
    h2: "Why monthly-average solar calculators can't answer you",
    intro:
      "Most online calculators work the same way: average annual yield, a rule-of-thumb self-consumption factor, an estimated saving. Three numbers, three problems:",
    points: [
      {
        title: "The sun and your consumption don't overlap on average.",
        body: "Your panels peak at noon; your dishwasher runs at 9 pm. What you actually save depends on how those two curves overlap, hour by hour — a monthly average can't know that.",
      },
      {
        title: "The battery is the most expensive decision, and the one nobody models.",
        body: "Thousands of euros, yes or no, decided by how much evening consumption you can really shift. Without simulating charge and discharge for every hour of the year, any answer is an opinion.",
      },
      {
        title: "If you're on time-of-use rates, averages fail exactly where the money is.",
        body: "The same self-consumed kWh is worth a different amount depending on when you use it. A single factor can't see that.",
      },
    ],
    closing:
      "PVVerdict simulates all 8,760 hours of your year — PVGIS production for your location, your consumption, your tariff, with and without a battery — and only then delivers the verdict.",
  },
  how: {
    h2: "Three steps from your roof to the verdict",
    steps: [
      {
        title: "Your location.",
        body: "Pick your spot on the map, set roof orientation, tilt and panel power. PVVerdict downloads years of hourly climate data for your area from PVGIS — measured irradiance and temperature, not generic tables.",
      },
      {
        title: "Your consumption.",
        body: "Upload your smart-meter export for a real load curve (Italy's e-distribuzione CSV is supported out of the box), or start from monthly bills or a guided estimate. Then your tariff: flat or time-of-use.",
        privacyNote:
          "Files are read directly in your browser: nothing is uploaded to or stored on our servers.",
      },
      {
        title: "The verdict.",
        body: "Payback years, annual savings, self-consumption and self-sufficiency. Plus the side-by-side comparison: with battery versus without, to see whether the extra thousands pay for themselves.",
      },
    ],
  },
  features: {
    h2: "What you actually see, numbers in hand",
    items: [
      {
        title: "Battery: yes or no, side by side.",
        body: "Two systems on one screen — same roof, same consumption, with and without storage. Cycles per year, energy shifted, payback difference: the most expensive decision becomes a readable comparison.",
        shot: "/shots/en/compare.webp",
        alt: "Side-by-side comparison of two solar systems, with and without battery",
      },
      {
        title: "Your year, hour by hour.",
        body: "Production, consumption and temperature on the daily chart: see when you produce, when you consume, and how much they overlap. This is where monthly averages stop being enough.",
        shot: "/shots/en/daily.webp",
        alt: "Hour-by-hour daily chart with production, consumption and temperature",
      },
      {
        title: "The economics, year by year.",
        body: "The capital curve: investment, incentives, cumulative savings — and the year the line crosses zero.",
        shot: "/shots/en/cashflow.webp",
        alt: "Economic trend chart with cumulative cashflow and break-even point",
      },
      {
        title: "Your rates, your prices.",
        body: "Time-of-use or flat: every kWh is valued at the price of the hour you use or export it.",
        shot: "/shots/en/tariff.webp",
        alt: "Time-of-use electricity tariff configuration",
      },
    ],
  },
  notModeled: {
    h2: "What we don't model (and why we tell you)",
    intro: "Every estimate has boundaries. These are ours:",
    points: [
      {
        title: "Panel and battery degradation.",
        body: "Modules lose a fraction of a percent per year, batteries lose capacity with every cycle. We don't simulate it: over a 5–7 year payback it moves little, and we prefer a simple, verifiable model to one full of invisible parameters.",
      },
      {
        title: "Discounting (NPV).",
        body: "Future savings are worth less than today's. Our cashflow is nominal: easier to read and to check, less “financially elegant”.",
      },
      {
        title: "Future energy prices.",
        body: "Nobody knows them. We use your current tariff, held constant: if prices rise, your payback will be faster than what we show.",
      },
      {
        title: "Your specific tax situation.",
        body: "Deductions and incentives vary by country, situation and year: you enter the amount you're entitled to, the tool doesn't guess it.",
      },
    ],
    closing:
      "These are deliberate simplifications, all documented. We'd rather tell you here than have you find out later — it's also why the code is open: you can check how we calculate, line by line.",
  },
  privacy: {
    h2: "Your data stays yours. And you can read the code.",
    points: [
      {
        title: "Everything in the browser.",
        body: "The simulation runs on your device: your consumption, bills and CSV files never leave the browser. The only request that goes out is for climate data: it passes through our technical proxy (needed to talk to PVGIS) and contains only coordinates and system parameters — never your consumption, never anything that identifies you. The proxy stores nothing: it forwards and forgets.",
      },
      {
        title: "No account.",
        body: "No sign-up, no email, no newsletter. Open and calculate.",
      },
      {
        title: "Open source (AGPL-3.0).",
        body: "Every formula is public and documented. If you think a calculation is wrong, you can verify it — and tell us.",
      },
      {
        title: "Public European data.",
        body: "Production estimates come from PVGIS, the scientific service of the European Commission's Joint Research Centre. We don't invent numbers: we take them from the people who measure them.",
      },
    ],
  },
  faq: {
    h2: "Frequently asked questions",
    items: [
      {
        q: "Is a battery worth adding to solar panels?",
        a: "It depends on how much you produce while you're out and how much you consume after sunset: a battery only pays for itself if it shifts enough kWh from day to evening. With low evening consumption it can lengthen your payback instead of shortening it. It's a calculation, not an opinion: PVVerdict compares the same system with and without storage, hour by hour, and shows you the difference in years and euros.",
      },
      {
        q: "How many years does it take for solar to pay for itself?",
        a: "In southern Europe, typically 4 to 9 years — a wide range precisely because it depends on location, self-consumption, tariff and incentives. Any single number you read online says little about your roof. The tool computes your cashflow year by year, with your system cost and your incentives.",
      },
      {
        q: "How much does a solar system actually produce in my area?",
        a: "The same installed power can yield 30% more or less across a single country, and roof orientation and tilt matter too. PVVerdict uses hourly historical data from PVGIS (the European Commission's scientific service) for your exact position: not a national average — your point on the map.",
      },
      {
        q: "Can I use my smart-meter data?",
        a: "Yes. Upload your distributor's consumption export (Italy's e-distribuzione quarter-hourly CSV is supported natively; generic CSV formats work too) and the simulation runs on your real load curve instead of a standard profile. The file is read directly in your browser — it never reaches any server.",
      },
      {
        q: "How reliable are the estimates?",
        a: "They're estimates, and we say so plainly: we use years of measured climate data, your consumption and your tariff, but we don't model component degradation or future energy prices. Every assumption is documented and the code is open source: you can check how we calculate, formula by formula.",
      },
      {
        q: "Is solar worth it even without a battery?",
        a: "Often yes: panels alone usually have the fastest payback, because they cost less and direct self-consumption is the most efficient saving. The battery is a second investment, to be judged on its own — and that's exactly the comparison the tool puts in front of you.",
      },
      {
        q: "Where does my consumption data end up?",
        a: "Nowhere: it stays in your browser. No account, no upload, no tracking of your consumption. The only outgoing request is for the climate data of your location. The project is open source precisely so you don't have to take our word for it.",
      },
    ],
  },
  finalCta: {
    h2: "Ready for the real numbers?",
    body: "Two minutes of setup, no account. The verdict on your roof — payback, savings, battery yes or no — computed on your data, not on an average.",
    cta: "Try the tool now",
    micro: "Opens with the Rome example: explore, then run the setup for your own location.",
  },
  footer: {
    product: {
      label: "Product",
      links: [
        { text: "Open the tool", href: "__TOOL__" },
        { text: "How it works", href: "#how" },
        { text: "FAQ", href: "#faq" },
      ],
    },
    project: {
      label: "Project",
      links: [
        { text: "Source code (GitHub)", href: "__REPO__" },
        { text: "AGPL-3.0 license", href: "https://www.gnu.org/licenses/agpl-3.0" },
        { text: "What we don't model", href: "#not-modeled" },
      ],
    },
    data: {
      label: "Data & privacy",
      links: [
        { text: "Privacy — no data collected", href: "#privacy" },
        { text: "Climate data: PVGIS © European Union", href: "https://re.jrc.ec.europa.eu/pvg_tools/en/" },
        { text: "Blog (soon)", href: "" },
      ],
    },
    bottom: "© 2026 PVVerdict · Made in Italy",
  },
};
