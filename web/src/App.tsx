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
import { loadSetup, saveSetup } from "./lib/datasetStore.ts";
import { defaultTariff, validateTariff } from "./lib/tariffPresets.ts";
import { type Incentive, defaultIncentive } from "./lib/economics.ts";
import { type SharedConfig, decodeShare, reconstructSharedConsumption } from "./lib/shareSetup.ts";
import { applyConsumption } from "./lib/applyConsumption.ts";
import type { WizardInputs } from "./lib/setupTypes.ts";
import { Footer } from "./components/Footer.tsx";
import { AboutPrivacy } from "./components/AboutPrivacy.tsx";
import { useT } from "./i18n/useT.tsx";

// Viz "demo" caricato staticamente: usato come fallback finché non c'è un setup salvato.
// (Il Task 9 sostituirà questo con il vero demo Roma.)
const demoViz = vizRaw as unknown as Viz;
const SA_KEY = "systemA";
const SB_KEY = "systemB";
const TARIFF_KEY = "tariff";
const INCENTIVE_KEY = "incentive";

const TABS: { key: Tab; labelKey: string }[] = [
  { key: "annuale", labelKey: "tabs.annual" },
  { key: "mensile", labelKey: "tabs.monthly" },
  { key: "giorno", labelKey: "tabs.daily" },
  { key: "confronto", labelKey: "tabs.compare" },
  { key: "glossario", labelKey: "tabs.glossary" },
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
  const { t, lang, setLang } = useT();
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
  // Flusso "setup condiviso" (hash #s= o import file): conferma → wizard precompilato allo Scarico.
  const [confirmShare, setConfirmShare] = useState<SharedConfig | null>(null);
  const [pendingShare, setPendingShare] = useState<SharedConfig | null>(null);
  const [wizardInputs, setWizardInputs] = useState<WizardInputs | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 3>(1);
  const [aboutOpen, setAboutOpen] = useState(false);

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

  // Boot: se l'URL ha un setup condiviso nel fragment (#s=…), decodificalo e chiedi conferma.
  // Il fragment non raggiunge il server; qualunque errore → rimuovi l'hash e prosegui normale.
  useEffect(() => {
    const h = window.location.hash;
    if (!h.startsWith("#s=")) return;
    const clearHash = (): void =>
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    decodeShare(h)
      .then((cfg) => setConfirmShare(cfg))
      .catch(clearHash);
  }, []);

  // Utente accetta il setup condiviso: rimuovi l'hash, precompila il wizard e aprilo allo Scarico.
  const acceptShare = (cfg: SharedConfig): void => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setConfirmShare(null);
    setPendingShare(cfg);
    setWizardInputs(cfg.wizard);
    setWizardStep(3);
    setWizardOpen(true);
  };

  const rejectShare = (): void => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setConfirmShare(null);
  };

  // Fine wizard: adotta il nuovo dataset e ri-deriva i sistemi A/B dal nuovo viz
  // (la geometria è cambiata: i sistemi salvati fallirebbero validateAgainstBaseline).
  const onSetupComplete = (setup: StoredSetup): void => {
    // Reset del precompilamento del wizard (torna al comportamento normale alla prossima apertura).
    setWizardInputs(null);
    setWizardStep(1);

    if (pendingShare !== null) {
      applySharedConfig(setup, pendingShare);
      setPendingShare(null);
      return;
    }
    setDataset(setup);
    setSystemA(cloneFromBaseline(setup.viz, "Sistema A"));
    setSystemB(cloneFromBaseline(setup.viz, "Sistema B"));
  };

  // Applica una SharedConfig sul dataset appena scaricato: consumi (ricostruiti dai produttori
  // puri) + sistemi A/B + tariffa + incentivo. La geometria delle falde combacia col wizard, quindi
  // i sistemi condivisi validano contro il nuovo viz; se non validassero, si ricade sulla baseline.
  const applySharedConfig = (setup: StoredSetup, cfg: SharedConfig): void => {
    let finalSetup = setup;
    // Applica i consumi condivisi solo se l'utente non ne ha già aggiunti nello step 4.
    if (cfg.consumption !== undefined && setup.consumption === undefined) {
      const result = reconstructSharedConsumption(setup, cfg.consumption);
      finalSetup = applyConsumption(setup, cfg.consumption, result);
      void saveSetup(finalSetup);
    }
    setDataset(finalSetup);
    const adopt = (shared: SystemConfigB, label: string): SystemConfigB =>
      validateAgainstBaseline(shared, finalSetup.viz) === null ? shared : cloneFromBaseline(finalSetup.viz, label);
    setSystemA(adopt(cfg.systemA, "Sistema A"));
    setSystemB(adopt(cfg.systemB, "Sistema B"));
    setTariff(cfg.tariff);
    setIncentive(cfg.incentive);
  };

  // Consumi applicati (da wizard o sezione «Consumi»): salva e adotta il nuovo dataset.
  // La geometria non cambia → i sistemi A/B restano validi; vizA si ri-deriva via useMemo.
  const onConsumptionApplied = (next: StoredSetup): void => {
    void saveSetup(next);
    setDataset(next);
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
    return <div className="boot-splash">{t("app.loading")}</div>;
  }

  const faldeLabel = vizA.meta.falde
    .map((f) => `${f.id} ${f.azimuth > 0 ? "+" : ""}${f.azimuth}° ${f.peakKwp.toFixed(2)} kWp`)
    .join(" · ");
  const batteryLabel = hasBattery
    ? t("header.battery", { kwh: vizA.meta.batteryUsableKwh.toFixed(2) })
    : t("header.noBattery");

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
        dataset={dataset}
        onConsumptionApplied={onConsumptionApplied}
        onImportSetup={setConfirmShare}
      />

      <SetupWizard
        open={wizardOpen}
        setOpen={setWizardOpen}
        initialInputs={wizardInputs}
        initialStep={wizardStep}
        onComplete={onSetupComplete}
      />

      {confirmShare !== null && (
        <div className="modal-overlay" onClick={rejectShare}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t("share.confirmTitle")}</h3>
            <p className="note">{t("share.confirmBody", { n: confirmShare.wizard.falde.length })}</p>
            <div className="editor-actions">
              <button className="wizard-primary" onClick={() => acceptShare(confirmShare)}>
                {t("share.confirmYes")}
              </button>
              <button onClick={rejectShare}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="main">
        <header>
          <div className="header-top">
            <h1>
              {t("app.title")} <span className="year">{vizA.meta.year}</span>
            </h1>
            <span className="lang-toggle seg" role="group" aria-label={t("lang.switch")}>
              <button className={lang === "it" ? "active" : ""} aria-pressed={lang === "it"} onClick={() => setLang("it")}>
                {t("lang.it")}
              </button>
              <button className={lang === "en" ? "active" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                {t("lang.en")}
              </button>
            </span>
          </div>
          <p className="sub">
            {t("header.sub", {
              system: systemA.label,
              falde: faldeLabel,
              acCap: vizA.meta.acCapKw,
              battery: batteryLabel,
            })}
          </p>
        </header>

        {dataset === null && (
          <div className="demo-banner">
            <span>{t("demo.viewing")}</span>
            <button onClick={() => setWizardOpen(true)}>{t("demo.runSetup")}</button>
          </div>
        )}

        <nav className="tabs">
          {TABS.map((tb) => (
            <button key={tb.key} className={tab === tb.key ? "active" : ""} onClick={() => setTab(tb.key)}>
              {t(tb.labelKey)}
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

        <Footer consumptionNote={activeViz.meta.consumptionNote} onOpenAbout={() => setAboutOpen(true)} />
      </div>

      {aboutOpen && <AboutPrivacy onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
