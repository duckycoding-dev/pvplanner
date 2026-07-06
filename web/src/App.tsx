import { useEffect, useMemo, useState } from "react";
import vizRaw from "../viz.demo.json";
import type { Tab, Viz } from "./types.ts";
import type { Tariff } from "../../src/core/economics/tariff.ts";
import { AnnualOverview } from "./components/AnnualOverview.tsx";
import { MonthlyView } from "./components/MonthlyView.tsx";
import { DailyExplorer } from "./components/DailyExplorer.tsx";
import { Glossary } from "./components/Glossary.tsx";
import { ComparePage } from "./components/ComparePage.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { SetupWizard } from "./components/wizard/SetupWizard.tsx";
import { ConsumptionLockedBox } from "./components/ConsumptionLockedBox.tsx";
import type { StoredSetup } from "./lib/setupTypes.ts";
import { type SystemConfigB, cloneFromBaseline, parseSystemConfigB, validateAgainstBaseline } from "./lib/systemConfig.ts";
import { deriveMonoViz } from "./lib/monoView.ts";
import { hasConsumption } from "./lib/vizFlags.ts";
import { loadSetup } from "./lib/datasetStore.ts";
import { defaultTariff, validateTariff } from "./lib/tariffPresets.ts";
import { type Incentive, defaultIncentive } from "./lib/economics.ts";

// Viz "demo" caricato staticamente: usato come fallback finché non c'è un setup salvato.
// (Il Task 9 sostituirà questo con il vero demo Roma.)
const demoViz = vizRaw as unknown as Viz;
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

function loadSystem(key: string, label: string, viz: Viz): SystemConfigB {
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
  return defaultIncentive(demoViz);
}

export function App() {
  const [tab, setTab] = useState<Tab>("giorno");
  // Boot: "loading" finché IndexedDB non risponde; StoredSetup = dataset dell'utente;
  // null = nessun setup salvato → si usa il viz demo e si mostra il banner.
  const [dataset, setDataset] = useState<StoredSetup | null | "loading">("loading");
  const [systemA, setSystemA] = useState<SystemConfigB>(() => loadSystem(SA_KEY, "Sistema A", demoViz));
  const [systemB, setSystemB] = useState<SystemConfigB>(() => loadSystem(SB_KEY, "Sistema B", demoViz));
  const [tariff, setTariff] = useState<Tariff>(loadTariff);
  const [incentive, setIncentive] = useState<Incentive>(loadIncentive);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Viz attivo: quello del setup salvato, altrimenti il demo (fallback statico).
  const activeViz = dataset !== "loading" && dataset !== null ? dataset.viz : demoViz;
  const consumption = hasConsumption(activeViz);

  // Boot asincrono da IndexedDB. Rilegge anche i sistemi A/B validandoli contro il
  // viz attivo (la localStorage non viene toccata prima: i persist sono sospesi durante il boot).
  useEffect(() => {
    let cancelled = false;
    loadSetup()
      .then((s) => {
        if (cancelled) return;
        setDataset(s);
        const viz = s ? s.viz : demoViz;
        setSystemA(loadSystem(SA_KEY, "Sistema A", viz));
        setSystemB(loadSystem(SB_KEY, "Sistema B", viz));
      })
      .catch(() => {
        if (!cancelled) setDataset(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fine wizard: adotta il nuovo dataset e ri-deriva i sistemi A/B dal nuovo viz
  // (la geometria è cambiata: i sistemi salvati fallirebbero validateAgainstBaseline).
  const onSetupComplete = (setup: StoredSetup): void => {
    setDataset(setup);
    setSystemA(cloneFromBaseline(setup.viz, "Sistema A"));
    setSystemB(cloneFromBaseline(setup.viz, "Sistema B"));
  };

  // Mono views (annual/monthly/daily) follow System A, recomputed live.
  const { vizA, hasBattery } = useMemo(() => deriveMonoViz(activeViz, systemA), [activeViz, systemA]);

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

  // I persist restano sospesi durante il boot ("loading"): così la lettura iniziale dei
  // sistemi dalla localStorage non viene sovrascritta dai valori-placeholder pre-boot.
  useEffect(() => {
    if (dataset === "loading") return;
    try {
      localStorage.setItem(SA_KEY, JSON.stringify(systemA));
    } catch {
      /* ignore */
    }
  }, [systemA, dataset]);
  useEffect(() => {
    if (dataset === "loading") return;
    try {
      localStorage.setItem(SB_KEY, JSON.stringify(systemB));
    } catch {
      /* ignore */
    }
  }, [systemB, dataset]);
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
  // Splash minimale finché il boot da IndexedDB non ha risolto (niente flash della dashboard).
  if (dataset === "loading") {
    return <div className="boot-splash">Caricamento…</div>;
  }

  const faldeLabel = vizA.meta.falde
    .map((f) => `${f.id} ${f.azimuth > 0 ? "+" : ""}${f.azimuth}° ${f.peakKwp.toFixed(2)} kWp`)
    .join(" · ");
  const batteryLabel = hasBattery ? `batteria ${vizA.meta.batteryUsableKwh.toFixed(2)} kWh` : "senza batteria";

  return (
    <div className="layout">
      <Sidebar
        viz={activeViz}
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
        onOpenWizard={() => setWizardOpen(true)}
      />

      <SetupWizard open={wizardOpen} setOpen={setWizardOpen} initialInputs={null} onComplete={onSetupComplete} />

      <div className="main">
        <header>
          <h1>
            Analisi Fotovoltaico <span className="year">{vizA.meta.year}</span>
          </h1>
          <p className="sub">
            {systemA.label}: {faldeLabel} · tetto AC {vizA.meta.acCapKw} kW · {batteryLabel}
          </p>
        </header>

        {dataset === null && (
          <div className="demo-banner">
            <span>Stai guardando dati demo (Roma).</span>
            <button onClick={() => setWizardOpen(true)}>⚙ Esegui il setup per la tua località</button>
          </div>
        )}

        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>

        <main>
          {tab === "annuale" && (
            <AnnualOverview viz={vizA} tariff={tariff} incentive={incentive} hasBattery={hasBattery} hasConsumption={consumption} />
          )}
          {tab === "mensile" && <MonthlyView viz={vizA} tariff={tariff} hasBattery={hasBattery} hasConsumption={consumption} />}
          {tab === "giorno" && <DailyExplorer viz={vizA} tariff={tariff} hasBattery={hasBattery} hasConsumption={consumption} />}
          {tab === "confronto" &&
            (consumption ? (
              <ComparePage viz={activeViz} systemA={systemA} systemB={systemB} tariff={tariff} incentive={incentive} />
            ) : (
              <ConsumptionLockedBox />
            ))}
          {tab === "glossario" && <Glossary />}
        </main>

        <footer>{activeViz.meta.consumptionNote}</footer>
      </div>
    </div>
  );
}
