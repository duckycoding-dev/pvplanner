import { useState } from "react";
import type { Viz } from "../types.ts";
import {
  type FaldaConfigB,
  type SystemConfigB,
  batteryUsableKwh,
  cloneFromBaseline,
  faldaPeakKwp,
  parseSystemConfigB,
  serialize,
  totalPeakKwp,
  validateAgainstBaseline,
} from "../lib/systemConfig.ts";
import { NumberField } from "./NumberField.tsx";
import { ImportModal } from "./ImportModal.tsx";

/**
 * Editable system (equipment + CAPEX). Used for both System A and System B in the menu.
 * Geometry (azimuth/site) stays the baseline; only equipment varies. config.json (via
 * viz.meta) is the default seed, restorable with "Reset ai default".
 */
export function SystemEditor({
  viz,
  system,
  setSystem,
  title,
  downloadName,
  copyFrom,
}: {
  viz: Viz;
  system: SystemConfigB;
  setSystem: (c: SystemConfigB) => void;
  title: string;
  downloadName: string;
  copyFrom?: { label: string; system: SystemConfigB };
}) {
  const [importing, setImporting] = useState(false);

  const updateFalda = (id: string, patch: Partial<FaldaConfigB>): void => {
    setSystem({ ...system, falde: system.falde.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };

  const exportSystem = (): void => {
    const blob = new Blob([serialize(system)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="editor">
      <p className="editor-ref">
        <b>default (config)</b>:{" "}
        {viz.meta.falde.map((f) => `${f.id} ${f.panelCount}×${f.wp}W`).join(" · ")} · batteria{" "}
        {viz.meta.batteryUsableKwh} kWh · costo {viz.meta.installationCostEur} €
      </p>

      <label className="text-field">
        Nome
        <input value={system.label} onChange={(e) => setSystem({ ...system, label: e.target.value })} />
      </label>

      {system.falde.map((f) => (
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
        value={system.acCapKw}
        min={1}
        max={15}
        step={0.1}
        onChange={(v) => setSystem({ ...system, acCapKw: v })}
      />
      <NumberField
        label="Batteria capacità totale"
        unit="kWh, 0=nessuna"
        value={system.batteryTotalKwh}
        min={0}
        max={30}
        step={0.1}
        onChange={(v) => setSystem({ ...system, batteryTotalKwh: v })}
      />
      <NumberField
        label="Batteria % utilizzabile"
        unit="%"
        value={system.batteryUsablePct}
        min={0}
        max={100}
        step={1}
        onChange={(v) => setSystem({ ...system, batteryUsablePct: v })}
      />
      <NumberField
        label="Round-trip"
        value={system.roundTrip}
        min={0.5}
        max={1}
        step={0.01}
        onChange={(v) => setSystem({ ...system, roundTrip: v })}
      />
      <label className="text-field">
        Accoppiamento batteria
        <select
          value={system.coupling}
          onChange={(e) => setSystem({ ...system, coupling: e.target.value === "ac" ? "ac" : "dc" })}
        >
          <option value="dc">DC (inverter ibrido)</option>
          <option value="ac">AC (inverter batteria separato)</option>
        </select>
      </label>
      <NumberField
        label="Costo installazione"
        unit="€"
        value={system.installationCostEur}
        min={0}
        max={60000}
        step={100}
        onChange={(v) => setSystem({ ...system, installationCostEur: v })}
      />

      <p className="editor-total">
        Totale: <b>{totalPeakKwp(system).toFixed(2)} kWp</b> · batteria utile{" "}
        <b>{batteryUsableKwh(system).toFixed(2)} kWh</b>
      </p>

      <div className="editor-actions">
        <button onClick={() => setSystem({ ...cloneFromBaseline(viz), label: system.label })}>Reset ai default</button>
        {copyFrom !== undefined && (
          <button onClick={() => setSystem({ ...copyFrom.system, label: system.label })}>
            Copia da {copyFrom.label}
          </button>
        )}
        <button onClick={exportSystem}>Esporta</button>
        <button onClick={() => setImporting(true)}>Importa</button>
      </div>

      {importing && (
        <ImportModal
          title={`Importa ${title}`}
          parse={parseSystemConfigB}
          validate={(c) => validateAgainstBaseline(c, viz)}
          onImport={setSystem}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}
