import { useEffect, useState } from "react";
import vizRaw from "../viz.json";
import type { Tab, Viz } from "./types.ts";
import { AnnualOverview } from "./components/AnnualOverview.tsx";
import { MonthlyView } from "./components/MonthlyView.tsx";
import { DailyExplorer } from "./components/DailyExplorer.tsx";
import { Glossary } from "./components/Glossary.tsx";
import { ConfigPage } from "./components/ConfigPage.tsx";
import { ComparePage } from "./components/ComparePage.tsx";
import { type SystemConfigB, cloneFromBaseline, validateAgainstBaseline } from "./lib/systemConfig.ts";

const viz = vizRaw as unknown as Viz;
const STORAGE_KEY = "systemB";

const TABS: { key: Tab; label: string }[] = [
  { key: "annuale", label: "Panoramica annuale" },
  { key: "mensile", label: "Mensile" },
  { key: "giorno", label: "Giorno per giorno" },
  { key: "config", label: "Configurazione" },
  { key: "confronto", label: "Confronto" },
  { key: "glossario", label: "Glossario" },
];

function loadSystemB(): SystemConfigB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const cfg = JSON.parse(raw) as SystemConfigB;
      if (validateAgainstBaseline(cfg, viz) === null) return cfg;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return cloneFromBaseline(viz);
}

export function App() {
  const [tab, setTab] = useState<Tab>("giorno");
  const [systemB, setSystemB] = useState<SystemConfigB>(loadSystemB);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(systemB));
    } catch {
      /* ignore */
    }
  }, [systemB]);

  const faldeLabel = viz.meta.falde
    .map((f) => `${f.id} ${f.azimuth > 0 ? "+" : ""}${f.azimuth}° ${f.peakKwp} kWp`)
    .join(" · ");

  return (
    <div className="app">
      <header>
        <h1>
          Analisi Fotovoltaico <span className="year">{viz.meta.year}</span>
        </h1>
        <p className="sub">
          {faldeLabel} · tetto AC {viz.meta.acCapKw} kW · batteria {viz.meta.batteryUsableKwh} kWh
        </p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "annuale" && <AnnualOverview viz={viz} />}
        {tab === "mensile" && <MonthlyView viz={viz} />}
        {tab === "giorno" && <DailyExplorer viz={viz} />}
        {tab === "config" && <ConfigPage viz={viz} systemB={systemB} setSystemB={setSystemB} />}
        {tab === "confronto" && <ComparePage viz={viz} systemB={systemB} />}
        {tab === "glossario" && <Glossary />}
      </main>

      <footer>{viz.meta.consumptionNote}</footer>
    </div>
  );
}
