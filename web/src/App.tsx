import { useState } from "react";
import vizRaw from "../viz.json";
import type { Tab, Viz } from "./types.ts";
import { AnnualOverview } from "./components/AnnualOverview.tsx";
import { MonthlyView } from "./components/MonthlyView.tsx";
import { DailyExplorer } from "./components/DailyExplorer.tsx";

const viz = vizRaw as unknown as Viz;

const TABS: { key: Tab; label: string }[] = [
  { key: "annuale", label: "Panoramica annuale" },
  { key: "mensile", label: "Mensile" },
  { key: "giorno", label: "Giorno per giorno" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("giorno");

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
      </main>

      <footer>{viz.meta.consumptionNote}</footer>
    </div>
  );
}
