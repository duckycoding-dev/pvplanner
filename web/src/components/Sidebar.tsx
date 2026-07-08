import { useEffect, useRef, useState } from "react";
import type { Viz } from "../types.ts";
import type { SystemConfigB } from "../lib/systemConfig.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import type { Incentive } from "../lib/economics.ts";
import type { StoredSetup } from "../lib/setupTypes.ts";
import { TariffEditor } from "./TariffEditor.tsx";
import { SystemEditor } from "./SystemEditor.tsx";
import { IncentiveEditor } from "./IncentiveEditor.tsx";
import { ConsumptionEditor } from "./consumption/ConsumptionEditor.tsx";
import { ShareSetupDialog } from "./ShareSetupDialog.tsx";
import { type SharedConfig, buildSharedConfig, parseSharedConfig, serializeSharedConfig } from "../lib/shareSetup.ts";
import { useT } from "../i18n/useT.tsx";

/**
 * Fixed left rail with a single toggle that opens the configuration as a native
 * <dialog> modal (top layer, backdrop, Esc/click-outside to close).
 */
export function Sidebar({
  viz,
  systemA,
  setSystemA,
  systemB,
  setSystemB,
  tariff,
  setTariff,
  incentive,
  setIncentive,
  open,
  setOpen,
  onOpenWizard,
  dataset,
  onConsumptionApplied,
}: {
  viz: Viz;
  systemA: SystemConfigB;
  setSystemA: (c: SystemConfigB) => void;
  systemB: SystemConfigB;
  setSystemB: (c: SystemConfigB) => void;
  tariff: Tariff;
  setTariff: (t: Tariff) => void;
  incentive: Incentive;
  setIncentive: (i: Incentive) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Apre il wizard di setup dati PVGIS (montato in App). */
  onOpenWizard: () => void;
  /** Dataset attivo dell'utente (null = demo/nessun setup → editor consumi non disponibile). */
  dataset: StoredSetup | null;
  /** Consumi applicati dall'editor: il chiamante salva e aggiorna lo stato. */
  onConsumptionApplied: (next: StoredSetup) => void;
  /** Setup importato da file: il chiamante mostra la conferma e apre il wizard precompilato. */
  onImportSetup: (cfg: SharedConfig) => void;
}) {
  const { t } = useT();
  const [openTariff, setOpenTariff] = useState(true);
  const [openA, setOpenA] = useState(true);
  const [openB, setOpenB] = useState(false);
  const [openInc, setOpenInc] = useState(false);
  const [openCons, setOpenCons] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  // SharedConfig dallo stato corrente; disponibile solo con un dataset dell'utente (non demo).
  const shareConfig: SharedConfig | null =
    dataset !== null
      ? buildSharedConfig({
          wizard: dataset.inputs,
          consumption: dataset.consumption?.spec ?? null,
          systemA,
          systemB,
          tariff,
          incentive,
        })
      : null;

  const exportFile = (): void => {
    if (shareConfig === null) return;
    const blob = new Blob([serializeSharedConfig(shareConfig)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "setup-fotovoltaico.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFile = (file: File | undefined): void => {
    if (file === undefined) return;
    file
      .text()
      .then((text) => {
        const cfg = parseSharedConfig(text);
        setImportError(null);
        setOpen(false);
        onImportSetup(cfg);
      })
      .catch(() => setImportError(t("share.importError")));
  };

  useEffect(() => {
    const d = ref.current;
    if (d === null) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <div className="rail">
        <img src="/pvplanner_fullsize_logo.png" alt="" className="rail-logo" />
        <button className="rail-toggle" onClick={() => setOpen(true)} title={t("menu.openTitle")} aria-label={t("menu.open")}>
          ☰
        </button>
      </div>

      <dialog
        ref={ref}
        className="menu-dialog"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false); // click on backdrop
        }}
      >
        <div className="menu-head">
          <strong>{t("menu.title")}</strong>
          <button className="menu-close" onClick={() => setOpen(false)} aria-label={t("common.close")}>
            ✕
          </button>
        </div>
        <div className="sidebar-body">
          <section className="sidebar-section">
            <button
              className="section-toggle"
              onClick={() => {
                setOpen(false); // chiudi il menu: il wizard è un dialog a sé
                onOpenWizard();
              }}
            >
              {t("menu.setup")}
            </button>
            <div className="editor-actions share-actions">
              <button onClick={() => setShareOpen(true)} disabled={shareConfig === null}>
                {t("share.share")}
              </button>
              <button onClick={exportFile} disabled={shareConfig === null}>
                {t("share.export")}
              </button>
              <label className="file-pick button-like">
                {t("share.import")}
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => importFile(e.target.files?.[0])}
                />
              </label>
            </div>
            {shareConfig === null && <p className="note">{t("share.needSetup")}</p>}
            {importError !== null && <p className="err">{importError}</p>}
          </section>
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenCons((o) => !o)}>
              {openCons ? "▾" : "▸"} {t("menu.consumption")} <span className="hint">{t("menu.consumptionHint")}</span>
            </button>
            {openCons &&
              (dataset !== null ? (
                <ConsumptionEditor setup={dataset} onApply={onConsumptionApplied} />
              ) : (
                <p className="note">
                  {t("menu.consumptionNeedSetup")}{" "}
                  <button
                    className="section-toggle"
                    onClick={() => {
                      setOpen(false);
                      onOpenWizard();
                    }}
                  >
                    {t("menu.runSetup")}
                  </button>
                </p>
              ))}
          </section>
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenTariff((o) => !o)}>
              {openTariff ? "▾" : "▸"} {t("menu.tariff")}
            </button>
            {openTariff && <TariffEditor tariff={tariff} setTariff={setTariff} />}
          </section>
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenInc((o) => !o)}>
              {openInc ? "▾" : "▸"} {t("menu.incentives")} <span className="hint">{t("menu.incentivesHint")}</span>
            </button>
            {openInc && <IncentiveEditor incentive={incentive} setIncentive={setIncentive} />}
          </section>
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenA((o) => !o)}>
              {openA ? "▾" : "▸"} {t("menu.systemA")} <span className="hint">{t("menu.systemAHint")}</span>
            </button>
            {openA && (
              <SystemEditor viz={viz} system={systemA} setSystem={setSystemA} title={t("menu.systemA")} downloadName="sistema-a.json" />
            )}
          </section>
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenB((o) => !o)}>
              {openB ? "▾" : "▸"} {t("menu.systemB")} <span className="hint">{t("menu.systemBHint")}</span>
            </button>
            {openB && (
              <SystemEditor
                viz={viz}
                system={systemB}
                setSystem={setSystemB}
                title={t("menu.systemB")}
                downloadName="sistema-b.json"
                copyFrom={{ label: systemA.label, system: systemA }}
              />
            )}
          </section>
        </div>
      </dialog>

      {shareOpen && shareConfig !== null && <ShareSetupDialog config={shareConfig} onClose={() => setShareOpen(false)} />}
    </>
  );
}
