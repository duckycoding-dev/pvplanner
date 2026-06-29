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
import { NumberField } from "./NumberField.tsx";
import { ImportModal } from "./ImportModal.tsx";

/** Editable System B (equipment only); System A shown compactly for reference. Lives in the sidebar. */
export function SystemBEditor({
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
    <div className="editor">
      <p className="editor-ref">
        <b>A (baseline)</b>:{" "}
        {viz.meta.falde.map((f) => `${f.id} ${f.panelCount}×${f.wp}W`).join(" · ")} · batteria{" "}
        {viz.meta.batteryUsableKwh} kWh
      </p>

      <label className="text-field">
        Nome B
        <input value={systemB.label} onChange={(e) => setSystemB({ ...systemB, label: e.target.value })} />
      </label>

      {systemB.falde.map((f) => (
        <fieldset className="falda-edit" key={f.id}>
          <legend>
            {f.id} ({f.azimuth > 0 ? "+" : ""}
            {f.azimuth}°) · {faldaPeakKwp(f).toFixed(2)} kWp
          </legend>
          <NumberField
            label="pannelli"
            value={f.panelCount}
            min={0}
            max={40}
            step={1}
            onChange={(v) => updateFalda(f.id, { panelCount: v })}
          />
          <NumberField
            label="W/pannello"
            value={f.wp}
            min={200}
            max={700}
            step={5}
            onChange={(v) => updateFalda(f.id, { wp: v })}
          />
        </fieldset>
      ))}

      <NumberField
        label="Tetto AC inverter"
        unit="kW"
        value={systemB.acCapKw}
        min={1}
        max={15}
        step={0.1}
        onChange={(v) => setSystemB({ ...systemB, acCapKw: v })}
      />
      <NumberField
        label="Batteria capacità totale"
        unit="kWh, 0=nessuna"
        value={systemB.batteryTotalKwh}
        min={0}
        max={30}
        step={0.1}
        onChange={(v) => setSystemB({ ...systemB, batteryTotalKwh: v })}
      />
      <NumberField
        label="Batteria % utilizzabile"
        unit="%"
        value={systemB.batteryUsablePct}
        min={0}
        max={100}
        step={1}
        onChange={(v) => setSystemB({ ...systemB, batteryUsablePct: v })}
      />
      <NumberField
        label="Round-trip"
        value={systemB.roundTrip}
        min={0.5}
        max={1}
        step={0.01}
        onChange={(v) => setSystemB({ ...systemB, roundTrip: v })}
      />

      <p className="editor-total">
        Totale B: <b>{totalPeakKwp(systemB).toFixed(2)} kWp</b> · batteria utile{" "}
        <b>{batteryUsableKwh(systemB).toFixed(2)} kWh</b>
      </p>

      <div className="editor-actions">
        <button onClick={() => setSystemB(cloneFromBaseline(viz))}>Copia da A</button>
        <button onClick={exportB}>Esporta</button>
        <button onClick={() => setImporting(true)}>Importa</button>
      </div>

      {importing && <ImportModal viz={viz} onImport={setSystemB} onClose={() => setImporting(false)} />}
    </div>
  );
}
