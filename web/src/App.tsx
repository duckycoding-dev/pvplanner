import { useEffect, useState } from "react";
import vizRaw from "../viz.json";
import type { Tab, Viz } from "./types.ts";
import type { Tariff } from "../../src/core/economics/tariff.ts";
import { AnnualOverview } from "./components/AnnualOverview.tsx";
import { MonthlyView } from "./components/MonthlyView.tsx";
import { DailyExplorer } from "./components/DailyExplorer.tsx";
import { Glossary } from "./components/Glossary.tsx";
import { ComparePage } from "./components/ComparePage.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { type SystemConfigB, cloneFromBaseline, validateAgainstBaseline } from "./lib/systemConfig.ts";
import { defaultTariff, validateTariff } from "./lib/tariffPresets.ts";

const viz = vizRaw as unknown as Viz;
const SB_KEY = "systemB";
const TARIFF_KEY = "tariff";
const COLLAPSE_KEY = "sidebarCollapsed";

const TABS: { key: Tab; label: string }[] = [
  { key: "annuale", label: "Panoramica annuale" },
  { key: "mensile", label: "Mensile" },
  { key: "giorno", label: "Giorno per giorno" },
  { key: "confronto", label: "Confronto" },
  { key: "glossario", label: "Glossario" },
];

function loadSystemB(): SystemConfigB {
  try {
    const raw = localStorage.getItem(SB_KEY);
    if (raw !== null) {
      const cfg = JSON.parse(raw) as SystemConfigB;
      if (validateAgainstBaseline(cfg, viz) === null) return cfg;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return cloneFromBaseline(viz);
}

function loadTariff(): Tariff {
  try {
    const raw = localStorage.getItem(TARIFF_KEY);
    if (raw !== null) {
      const t = JSON.parse(raw) as Tariff;
      if (validateTariff(t) === null) return t;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return defaultTariff();
}

export function App() {
  const [tab, setTab] = useState<Tab>("giorno");
  const [systemB, setSystemB] = useState<SystemConfigB>(loadSystemB);
  const [tariff, setTariff] = useState<Tariff>(loadTariff);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(COLLAPSE_KEY);
      return v === null ? true : v === "1"; // default: closed (overlay)
    } catch {
      return true;
    }
  });

  // Hotkey "m" toggles the sidebar (ignored while typing in a form field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "m" && e.key !== "M") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable === true) return;
      setCollapsed((c) => !c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SB_KEY, JSON.stringify(systemB));
    } catch {
      /* ignore */
    }
  }, [systemB]);
  useEffect(() => {
    try {
      localStorage.setItem(TARIFF_KEY, JSON.stringify(tariff));
    } catch {
      /* ignore */
    }
  }, [tariff]);
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const faldeLabel = viz.meta.falde
    .map((f) => `${f.id} ${f.azimuth > 0 ? "+" : ""}${f.azimuth}° ${f.peakKwp} kWp`)
    .join(" · ");

  return (
    <div className="layout">
      <Sidebar
        viz={viz}
        systemB={systemB}
        setSystemB={setSystemB}
        tariff={tariff}
        setTariff={setTariff}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      <div className="main">
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
          {tab === "annuale" && <AnnualOverview viz={viz} tariff={tariff} />}
          {tab === "mensile" && <MonthlyView viz={viz} tariff={tariff} />}
          {tab === "giorno" && <DailyExplorer viz={viz} tariff={tariff} />}
          {tab === "confronto" && <ComparePage viz={viz} systemB={systemB} tariff={tariff} />}
          {tab === "glossario" && <Glossary />}
        </main>

        <footer>{viz.meta.consumptionNote}</footer>
      </div>
    </div>
  );
}
