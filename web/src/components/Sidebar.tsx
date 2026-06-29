import { useState } from "react";
import type { Viz } from "../types.ts";
import type { SystemConfigB } from "../lib/systemConfig.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import { TariffEditor } from "./TariffEditor.tsx";
import { SystemBEditor } from "./SystemBEditor.tsx";

/** Global collapsible sidebar: Tariffa (all views) + Sistema B (comparison). */
export function Sidebar({
  viz,
  systemB,
  setSystemB,
  tariff,
  setTariff,
  collapsed,
  onToggle,
}: {
  viz: Viz;
  systemB: SystemConfigB;
  setSystemB: (c: SystemConfigB) => void;
  tariff: Tariff;
  setTariff: (t: Tariff) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [openTariff, setOpenTariff] = useState(true);
  const [openB, setOpenB] = useState(true);

  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
      <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? "Apri configurazione" : "Chiudi"}>
        {collapsed ? "›" : "‹"}
      </button>
      {!collapsed && (
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
      )}
    </aside>
  );
}
