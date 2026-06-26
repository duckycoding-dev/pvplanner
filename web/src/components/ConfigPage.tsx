import { useState } from "react";
import type { Viz } from "../types.ts";
import {
  type FaldaConfigB,
  type SystemConfigB,
  batteryUsableKwh,
  cloneFromBaseline,
  faldaPeakKwp,
  serialize,
  totalPeakKwp,
} from "../lib/systemConfig.ts";
import { ImportModal } from "./ImportModal.tsx";

function num(v: string, fallback: number): number {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export function ConfigPage({
  viz,
  systemB,
  setSystemB,
}: {
  viz: Viz;
  systemB: SystemConfigB;
  setSystemB: (c: SystemConfigB) => void;
}) {
  const [importing, setImporting] = useState(false);

  const updateFalda = (id: string, patch: Partial<FaldaConfigB>): void => {
    setSystemB({ ...systemB, falde: systemB.falde.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };

  const exportB = (): void => {
    const blob = new Blob([serialize(systemB)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sistema-b.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="config-page">
      <section className="sys-block">
        <h3>Sistema A — baseline (sola lettura)</h3>
        {viz.meta.falde.map((f) => (
          <div className="falda-row" key={f.id}>
            <span className="falda-id">
              {f.id} ({f.azimuth > 0 ? "+" : ""}
              {f.azimuth}°)
            </span>
            <span>
              {f.panelCount} × {f.wp} W
            </span>
            <span className="kwp">{f.peakKwp.toFixed(3)} kWp</span>
          </div>
        ))}
        <p className="note">
          tetto AC {viz.meta.acCapKw} kW · batteria {viz.meta.batteryTotalKwh} kWh × {viz.meta.batteryUsablePct}%
          utilizzabile = {viz.meta.batteryUsableKwh} kWh · round-trip {viz.meta.batteryRoundTrip}
        </p>
      </section>

      <section className="sys-block">
        <h3>Sistema B — modificabile</h3>
        <div className="field">
          <label>Nome</label>
          <input value={systemB.label} onChange={(e) => setSystemB({ ...systemB, label: e.target.value })} />
        </div>

        {systemB.falde.map((f) => (
          <div className="falda-row" key={f.id}>
            <span className="falda-id">
              {f.id} ({f.azimuth > 0 ? "+" : ""}
              {f.azimuth}°)
            </span>
            <label>
              pannelli
              <input
                type="number"
                min={0}
                value={f.panelCount}
                onChange={(e) => updateFalda(f.id, { panelCount: num(e.target.value, f.panelCount) })}
              />
            </label>
            <label>
              W/pannello
              <input
                type="number"
                min={1}
                value={f.wp}
                onChange={(e) => updateFalda(f.id, { wp: num(e.target.value, f.wp) })}
              />
            </label>
            <span className="kwp">{faldaPeakKwp(f).toFixed(3)} kWp</span>
          </div>
        ))}

        <div className="field">
          <label>Tetto AC inverter (kW)</label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={systemB.acCapKw}
            onChange={(e) => setSystemB({ ...systemB, acCapKw: num(e.target.value, systemB.acCapKw) })}
          />
        </div>
        <div className="field">
          <label>Batteria — capacità totale (kWh, 0 = nessuna)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={systemB.batteryTotalKwh}
            onChange={(e) => setSystemB({ ...systemB, batteryTotalKwh: num(e.target.value, systemB.batteryTotalKwh) })}
          />
        </div>
        <div className="field">
          <label>Batteria — % utilizzabile</label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={systemB.batteryUsablePct}
            onChange={(e) => setSystemB({ ...systemB, batteryUsablePct: num(e.target.value, systemB.batteryUsablePct) })}
          />
        </div>
        <div className="field">
          <label>Round-trip (0–1)</label>
          <input
            type="number"
            min={0.1}
            max={1}
            step={0.01}
            value={systemB.roundTrip}
            onChange={(e) => setSystemB({ ...systemB, roundTrip: num(e.target.value, systemB.roundTrip) })}
          />
        </div>

        <p className="note">
          Totale B: <b>{totalPeakKwp(systemB).toFixed(2)} kWp</b> · batteria utile{" "}
          <b>{batteryUsableKwh(systemB).toFixed(2)} kWh</b>. Geometria (azimuth/inclinazione) e sito ereditati da A.
        </p>

        <div className="config-actions">
          <button onClick={() => setSystemB(cloneFromBaseline(viz))}>Copia da A</button>
          <button onClick={exportB}>Esporta B</button>
          <button onClick={() => setImporting(true)}>Importa B</button>
        </div>
      </section>

      {importing && <ImportModal viz={viz} onImport={setSystemB} onClose={() => setImporting(false)} />}
    </div>
  );
}
