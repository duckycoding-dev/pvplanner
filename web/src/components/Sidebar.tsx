import { useEffect, useRef, useState } from "react";
import type { Viz } from "../types.ts";
import type { SystemConfigB } from "../lib/systemConfig.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import type { Incentive } from "../lib/economics.ts";
import { TariffEditor } from "./TariffEditor.tsx";
import { SystemEditor } from "./SystemEditor.tsx";
import { IncentiveEditor } from "./IncentiveEditor.tsx";

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
}) {
  const [openTariff, setOpenTariff] = useState(true);
  const [openA, setOpenA] = useState(true);
  const [openB, setOpenB] = useState(false);
  const [openInc, setOpenInc] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d === null) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <div className="rail">
        <button className="rail-toggle" onClick={() => setOpen(true)} title="Configurazione (m)" aria-label="Apri configurazione">
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
          <strong>Configurazione</strong>
          <button className="menu-close" onClick={() => setOpen(false)} aria-label="Chiudi">
            ✕
          </button>
        </div>
        <div className="sidebar-body">
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenTariff((o) => !o)}>
              {openTariff ? "▾" : "▸"} Tariffa
            </button>
            {openTariff && <TariffEditor tariff={tariff} setTariff={setTariff} />}
          </section>
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenInc((o) => !o)}>
              {openInc ? "▾" : "▸"} Incentivi <span className="hint">(payback)</span>
            </button>
            {openInc && <IncentiveEditor incentive={incentive} setIncentive={setIncentive} />}
          </section>
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenA((o) => !o)}>
              {openA ? "▾" : "▸"} Sistema A <span className="hint">(viste mono)</span>
            </button>
            {openA && (
              <SystemEditor viz={viz} system={systemA} setSystem={setSystemA} title="Sistema A" downloadName="sistema-a.json" />
            )}
          </section>
          <section className="sidebar-section">
            <button className="section-toggle" onClick={() => setOpenB((o) => !o)}>
              {openB ? "▾" : "▸"} Sistema B <span className="hint">(Confronto)</span>
            </button>
            {openB && (
              <SystemEditor
                viz={viz}
                system={systemB}
                setSystem={setSystemB}
                title="Sistema B"
                downloadName="sistema-b.json"
                copyFrom={{ label: systemA.label, system: systemA }}
              />
            )}
          </section>
        </div>
      </dialog>
    </>
  );
}
