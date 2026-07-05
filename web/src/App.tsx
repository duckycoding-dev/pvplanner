import { useEffect, useMemo, useState } from "react";
import vizRaw from "../viz.json";
import type { Tab, Viz } from "./types.ts";
import type { Tariff } from "../../src/core/economics/tariff.ts";
import { AnnualOverview } from "./components/AnnualOverview.tsx";
import { MonthlyView } from "./components/MonthlyView.tsx";
import { DailyExplorer } from "./components/DailyExplorer.tsx";
import { Glossary } from "./components/Glossary.tsx";
import { ComparePage } from "./components/ComparePage.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { type SystemConfigB, cloneFromBaseline, parseSystemConfigB, validateAgainstBaseline } from "./lib/systemConfig.ts";
import { deriveMonoViz } from "./lib/monoView.ts";
import { defaultTariff, validateTariff } from "./lib/tariffPresets.ts";
import { type Incentive, defaultIncentive } from "./lib/economics.ts";

const viz = vizRaw as unknown as Viz;
const SA_KEY = "systemA";
const SB_KEY = "systemB";
const TARIFF_KEY = "tariff";
const INCENTIVE_KEY = "incentive";

const TABS: { key: Tab; label: string }[] = [
  { key: "annuale", label: "Panoramica annuale" },
  { key: "mensile", label: "Mensile" },
  { key: "giorno", label: "Giorno per giorno" },
  { key: "confronto", label: "Confronto" },
  { key: "glossario", label: "Glossario" },
];

function loadSystem(key: string, label: string): SystemConfigB {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      // parseSystemConfigB normalizes legacy payloads (e.g. missing `coupling` → "dc")
      // and throws on malformed data, which the catch below turns into the baseline.
      const cfg = parseSystemConfigB(raw);
      if (validateAgainstBaseline(cfg, viz) === null) return cfg;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return cloneFromBaseline(viz, label);
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

function loadIncentive(): Incentive {
  try {
    const raw = localStorage.getItem(INCENTIVE_KEY);
    if (raw !== null) {
      const i = JSON.parse(raw) as Incentive;
      if ((i.mode === "percent" || i.mode === "fixed") && typeof i.value === "number" && typeof i.years === "number") {
        return i;
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return defaultIncentive(viz);
}

export function App() {
  const [tab, setTab] = useState<Tab>("giorno");
  const [systemA, setSystemA] = useState<SystemConfigB>(() => loadSystem(SA_KEY, "Sistema A"));
  const [systemB, setSystemB] = useState<SystemConfigB>(() => loadSystem(SB_KEY, "Sistema B"));
  const [tariff, setTariff] = useState<Tariff>(loadTariff);
  const [incentive, setIncentive] = useState<Incentive>(loadIncentive);
  const [menuOpen, setMenuOpen] = useState(false);

  // Mono views (annual/monthly/daily) follow System A, recomputed live.
  const { vizA, hasBattery } = useMemo(() => deriveMonoViz(viz, systemA), [systemA]);

  // Hotkey "m" toggles the configuration menu (ignored while typing in a form field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "m" && e.key !== "M") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable === true) return;
      setMenuOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SA_KEY, JSON.stringify(systemA));
    } catch {
      /* ignore */
    }
  }, [systemA]);
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
      localStorage.setItem(INCENTIVE_KEY, JSON.stringify(incentive));
    } catch {
      /* ignore */
    }
  }, [incentive]);
  const faldeLabel = vizA.meta.falde
    .map((f) => `${f.id} ${f.azimuth > 0 ? "+" : ""}${f.azimuth}° ${f.peakKwp.toFixed(2)} kWp`)
    .join(" · ");
  const batteryLabel = hasBattery ? `batteria ${vizA.meta.batteryUsableKwh.toFixed(2)} kWh` : "senza batteria";

  return (
    <div className="layout">
      <Sidebar
        viz={viz}
        systemA={systemA}
        setSystemA={setSystemA}
        systemB={systemB}
        setSystemB={setSystemB}
        tariff={tariff}
        setTariff={setTariff}
        incentive={incentive}
        setIncentive={setIncentive}
        open={menuOpen}
        setOpen={setMenuOpen}
      />

      <div className="main">
        <header>
          <h1>
            Analisi Fotovoltaico <span className="year">{vizA.meta.year}</span>
          </h1>
          <p className="sub">
            {systemA.label}: {faldeLabel} · tetto AC {vizA.meta.acCapKw} kW · {batteryLabel}
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
          {tab === "annuale" && <AnnualOverview viz={vizA} tariff={tariff} incentive={incentive} hasBattery={hasBattery} />}
          {tab === "mensile" && <MonthlyView viz={vizA} tariff={tariff} hasBattery={hasBattery} />}
          {tab === "giorno" && <DailyExplorer viz={vizA} tariff={tariff} hasBattery={hasBattery} />}
          {tab === "confronto" && (
            <ComparePage viz={viz} systemA={systemA} systemB={systemB} tariff={tariff} incentive={incentive} />
          )}
          {tab === "glossario" && <Glossary />}
        </main>

        <footer>{viz.meta.consumptionNote}</footer>
      </div>
    </div>
  );
}
