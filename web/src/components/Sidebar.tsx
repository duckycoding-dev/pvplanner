import { useEffect, useRef, useState } from "react";
import type { Viz } from "../types.ts";
import type { SystemConfigB } from "../lib/systemConfig.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import { TariffEditor } from "./TariffEditor.tsx";
import { SystemBEditor } from "./SystemBEditor.tsx";

/**
 * Fixed left rail with a single toggle that opens the configuration as a native
 * <dialog> modal (top layer, backdrop, Esc/click-outside to close).
 */
export function Sidebar({
  viz,
  systemB,
  setSystemB,
  tariff,
  setTariff,
  open,
  setOpen,
}: {
  viz: Viz;
  systemB: SystemConfigB;
  setSystemB: (c: SystemConfigB) => void;
  tariff: Tariff;
  setTariff: (t: Tariff) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [openTariff, setOpenTariff] = useState(true);
  const [openB, setOpenB] = useState(true);
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
            <button className="section-toggle" onClick={() => setOpenB((o) => !o)}>
              {openB ? "▾" : "▸"} Sistema B <span className="hint">(Confronto)</span>
            </button>
            {openB && <SystemBEditor viz={viz} systemB={systemB} setSystemB={setSystemB} />}
          </section>
        </div>
      </dialog>
    </>
  );
}
