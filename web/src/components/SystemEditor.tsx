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
import { useT } from "../i18n/useT.tsx";

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
  const { t } = useT();
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
        <b>{t("system.defaultConfig")}</b>:{" "}
        {t("system.refBody", {
          falde: viz.meta.falde.map((f) => `${f.id} ${f.panelCount}×${f.wp}W`).join(" · "),
          batt: viz.meta.batteryUsableKwh,
          cost: viz.meta.installationCostEur,
        })}
      </p>

      <label className="text-field">
        {t("system.name")}
        <input value={system.label} onChange={(e) => setSystem({ ...system, label: e.target.value })} />
      </label>

      {system.falde.map((f) => (
        <fieldset className="falda-edit" key={f.id}>
          <legend>
            {f.id} ({f.azimuth > 0 ? "+" : ""}
            {f.azimuth}°) · {faldaPeakKwp(f).toFixed(2)} kWp
          </legend>
          <NumberField
            label={t("system.panels")}
            value={f.panelCount}
            min={0}
            max={40}
            step={1}
            onChange={(v) => updateFalda(f.id, { panelCount: v })}
          />
          <NumberField
            label={t("system.wpPerPanel")}
            value={f.wp}
            min={200}
            max={700}
            step={5}
            onChange={(v) => updateFalda(f.id, { wp: v })}
          />
        </fieldset>
      ))}

      <NumberField
        label={t("system.acCap")}
        unit="kW"
        value={system.acCapKw}
        min={1}
        max={15}
        step={0.1}
        onChange={(v) => setSystem({ ...system, acCapKw: v })}
      />
      <NumberField
        label={t("system.batteryTotal")}
        unit={t("system.batteryTotalUnit")}
        value={system.batteryTotalKwh}
        min={0}
        max={30}
        step={0.1}
        onChange={(v) => setSystem({ ...system, batteryTotalKwh: v })}
      />
      <NumberField
        label={t("system.batteryUsablePct")}
        unit="%"
        value={system.batteryUsablePct}
        min={0}
        max={100}
        step={1}
        onChange={(v) => setSystem({ ...system, batteryUsablePct: v })}
      />
      <NumberField
        label={t("system.roundTrip")}
        value={system.roundTrip}
        min={0.5}
        max={1}
        step={0.01}
        onChange={(v) => setSystem({ ...system, roundTrip: v })}
      />
      <label className="text-field">
        {t("system.coupling")}
        <select
          value={system.coupling}
          onChange={(e) => setSystem({ ...system, coupling: e.target.value === "ac" ? "ac" : "dc" })}
        >
          <option value="dc">{t("system.couplingDc")}</option>
          <option value="ac">{t("system.couplingAc")}</option>
        </select>
      </label>
      <NumberField
        label={t("system.installCost")}
        unit="€"
        value={system.installationCostEur}
        min={0}
        max={60000}
        step={100}
        onChange={(v) => setSystem({ ...system, installationCostEur: v })}
      />

      <p className="editor-total">
        {t("system.totalLabel")}: <b>{totalPeakKwp(system).toFixed(2)} kWp</b> · {t("system.usableBattery")}{" "}
        <b>{batteryUsableKwh(system).toFixed(2)} kWh</b>
      </p>

      <div className="editor-actions">
        <button onClick={() => setSystem({ ...cloneFromBaseline(viz), label: system.label })}>{t("system.reset")}</button>
        {copyFrom !== undefined && (
          <button onClick={() => setSystem({ ...copyFrom.system, label: system.label })}>
            {t("system.copyFrom", { label: copyFrom.label })}
          </button>
        )}
        <button onClick={exportSystem}>{t("common.export")}</button>
        <button onClick={() => setImporting(true)}>{t("common.import")}</button>
      </div>

      {importing && (
        <ImportModal
          title={t("import.title", { what: title })}
          parse={parseSystemConfigB}
          validate={(c) => validateAgainstBaseline(c, viz)}
          onImport={setSystem}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}
