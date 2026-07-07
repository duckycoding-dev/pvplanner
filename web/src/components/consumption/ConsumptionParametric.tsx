import { useEffect, useState } from "react";
import type { HouseParams } from "../../../../src/core/consumption/houseLoad.ts";
import type { CanonicalConsumption } from "../../../../src/core/consumption/canonical.ts";
import type { ConsumptionSpec, StoredSetup } from "../../lib/setupTypes.ts";
import { parametricConsumption } from "../../lib/parametricConsumption.ts";
import { useT } from "../../i18n/useT.tsx";
import { InfoTip } from "../InfoTip.tsx";
import { NumberField } from "../NumberField.tsx";
import { ConsumptionPreview } from "./ConsumptionPreview.tsx";

interface FieldSpec {
  key: keyof HouseParams;
  unit?: string; // unità letterale (simboli neutri) …
  unitKey?: string; // … oppure chiave i18n quando l'unità contiene parole (anno/ore/term).
  min: number;
  max: number;
  step: number;
}

// label/desc di ciascun campo sono chiavi i18n derivate da `key`: consumption.field.<key>.label/.desc.
const BASE_FIELDS: FieldSpec[] = [
  { key: "heatedAreaM2", unit: "m²", min: 20, max: 1000, step: 5 },
  { key: "specificHeatDemandKwhM2y", unitKey: "consumption.unit.kwhM2y", min: 20, max: 200, step: 5 },
  { key: "occupants", min: 1, max: 10, step: 1 },
  { key: "wfhOccupants", min: 0, max: 10, step: 1 },
  { key: "heatPumpScop", min: 2, max: 6, step: 0.1 },
  { key: "dhwKwhPerPersonY", unitKey: "consumption.unit.kwhThPerYear", min: 0, max: 2000, step: 50 },
  { key: "baseLoadAnnualKwh", unit: "kWh", min: 500, max: 8000, step: 100 },
];

const ADVANCED_FIELDS: FieldSpec[] = [
  { key: "heatingBaseTempC", unit: "°C", min: 10, max: 20, step: 1 },
  { key: "copRef", min: 1, max: 6, step: 0.1 },
  { key: "copRefOutdoorC", unit: "°C", min: -10, max: 20, step: 1 },
  { key: "flowTempC", unit: "°C", min: 25, max: 60, step: 1 },
  { key: "dhwCop", min: 1, max: 5, step: 0.1 },
  { key: "standbyLossPct", unit: "%", min: 0, max: 20, step: 1 },
  { key: "bufferSmoothingHours", unitKey: "consumption.unit.hours", min: 0, max: 12, step: 1 },
];

/**
 * Metodo parametrico: modello fisico deterministico (houseLoad) sulle temperature reali
 * del sito. Disclaimer sempre visibile. Anteprima live con debounce. Nessun LLM a runtime.
 * Richiede `hourlyT2m` (temperatura del sito): sul demo / senza setup è disabilitato.
 */
export function ConsumptionParametric({
  setup,
  house,
  setHouse,
  apply,
  hideApply,
}: {
  setup: StoredSetup;
  house: HouseParams;
  setHouse: (h: HouseParams) => void;
  apply: (spec: ConsumptionSpec, result: CanonicalConsumption) => void;
  /** Wizard: «Applica» nascosto, applica il bottone «Fine» del wizard. */
  hideApply?: boolean;
}) {
  const { t } = useT();
  const [advanced, setAdvanced] = useState(false);
  const [preview, setPreview] = useState<CanonicalConsumption | null>(null);

  const hasT2m = setup.hourlyT2m.length > 0;

  // Ricalcolo live con debounce 300 ms (modello fisico, deterministico).
  useEffect(() => {
    if (!hasT2m) {
      setPreview(null);
      return;
    }
    const id = setTimeout(() => {
      try {
        setPreview(parametricConsumption(house, setup));
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [house, setup, hasT2m]);

  if (!hasT2m) {
    return (
      <div className="consumption-method">
        <p className="note">{t("consumption.parametric.needSetup")}</p>
      </div>
    );
  }

  const set = (key: keyof HouseParams, v: number): void => setHouse({ ...house, [key]: v });

  const renderField = (f: FieldSpec) => {
    const label = t(`consumption.field.${f.key}.label`);
    return (
      <NumberField
        key={f.key}
        label={label}
        unit={f.unitKey !== undefined ? t(f.unitKey) : f.unit}
        value={house[f.key]}
        min={f.min}
        max={f.max}
        step={f.step}
        onChange={(v) => set(f.key, v)}
        tip={{ term: label, desc: t(`consumption.field.${f.key}.desc`) }}
      />
    );
  };

  return (
    <div className="consumption-method">
      <div className="consumption-disclaimer">{t("consumption.parametric.disclaimer")}</div>

      {BASE_FIELDS.map(renderField)}

      <label className="consumption-adv-toggle">
        <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />{" "}
        {t("consumption.parametric.advancedLabel")}
        <InfoTip
          entry={{
            term: t("consumption.parametric.advancedTip.term"),
            desc: t("consumption.parametric.advancedTip.desc"),
          }}
        />
      </label>
      {advanced && ADVANCED_FIELDS.map(renderField)}

      {preview !== null && (
        <>
          <ConsumptionPreview result={preview} viz={setup.viz} />
          {hideApply !== true && (
            <button className="wizard-primary" onClick={() => apply({ method: "parametric", house }, preview)}>
              {t("common.apply")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
