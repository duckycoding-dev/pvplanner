import { useMemo, useState } from "react";
import {
  type DayShapeKey,
  type MonthlyTemplate,
  expandMonthlyTemplate,
} from "../../../../src/core/consumption/monthlyTemplate.ts";
import type { CanonicalConsumption } from "../../../../src/core/consumption/canonical.ts";
import type { ConsumptionSpec, StoredSetup } from "../../lib/setupTypes.ts";
import { MONTH_LABELS } from "../../lib/format.ts";
import { InfoTip } from "../InfoTip.tsx";
import { NumberField } from "../NumberField.tsx";
import { ConsumptionPreview } from "./ConsumptionPreview.tsx";

const SHAPE_LABELS: Record<DayShapeKey, string> = {
  flat: "Costante",
  morningEvening: "Mattina + sera",
  daytimeWfh: "Diurno (smart-working)",
  nightHeavy: "Notturno",
};

const SHAPE_TIP =
  "Come si distribuiscono i kWh del giorno sulle 24 ore. " +
  "«Costante»: stesso consumo a ogni ora (carichi continui, seconda casa). " +
  "«Mattina + sera»: picchi 7–8 e 18–21, notte bassa — famiglia fuori casa di giorno (il profilo residenziale tipico). " +
  "«Diurno (smart-working)»: come mattina+sera ma con consumo anche 9–17, qualcuno a casa di giorno. " +
  "«Notturno»: notte alta, giorno basso, sera media — carichi programmati di notte (boiler, tariffa bioraria, ricarica EV).";

export function defaultTemplate(): MonthlyTemplate {
  // Sagoma mattina/sera, 10 kWh/giorno per mese: punto di partenza da tarare in ~2 minuti.
  return {
    months: MONTH_LABELS.map(() => ({ dailyKwh: 10, shape: "morningEvening" as DayShapeKey | number[] })),
    weekendFactor: 1,
  };
}

function parseCustom(raw: string): number[] | null {
  const parts = raw.split(/[,;\s]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (parts.length !== 24) return null;
  const nums = parts.map((s) => Number(s.replace(",", ".")));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return nums;
}

/**
 * Metodo template mensili: per ogni mese kWh/giorno + sagoma (preset o 24 valori custom),
 * più il fattore weekend. Anteprima live e "Applica".
 */
export function ConsumptionMonthly({
  setup,
  template,
  setTemplate,
  apply,
}: {
  setup: StoredSetup;
  template: MonthlyTemplate;
  setTemplate: (t: MonthlyTemplate) => void;
  apply: (spec: ConsumptionSpec, result: CanonicalConsumption) => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const [customText, setCustomText] = useState<Record<number, string>>({});

  const result = useMemo<CanonicalConsumption>(
    () => expandMonthlyTemplate(template, setup.viz.hourly.timestampsUtc, setup.viz.hourly.months, setup.inputs.timeZone),
    [template, setup],
  );

  const setMonth = (i: number, p: Partial<MonthlyTemplate["months"][number]>): void => {
    setTemplate({ ...template, months: template.months.map((m, k) => (k === i ? { ...m, ...p } : m)) });
  };

  const shapeValue = (shape: DayShapeKey | number[]): string => (Array.isArray(shape) ? "custom" : shape);

  return (
    <div className="consumption-method">
      <p className="note">
        Per ogni mese indica il consumo medio giornaliero e la sagoma tipica del giorno. L'app distribuisce i totali
        sulle 8760 ore mantenendo il totale mensile.
      </p>

      <label className="consumption-adv-toggle">
        <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} /> sagome personalizzate
        (avanzato)
        <InfoTip
          entry={{
            term: "Sagome personalizzate",
            desc:
              "Aggiunge alla tendina l'opzione «Personalizzata…»: 24 numeri, uno per ora (0–23), che descrivono la forma del giorno. Contano solo i rapporti tra i valori — la scala la fissa il kWh/giorno. Es: 1,1,1,1,1,1,2,3,2,1,… = picco alle 7.",
          }}
        />
      </label>

      <table className="consumption-months">
        <thead>
          <tr>
            <th>Mese</th>
            <th>
              kWh/giorno
              <InfoTip
                entry={{
                  term: "kWh/giorno",
                  desc: "Consumo medio giornaliero del mese. Lo trovi in bolletta: consumo del mese ÷ giorni. Es. 300 kWh a gennaio ≈ 9.7 kWh/giorno.",
                }}
              />
            </th>
            <th>
              Sagoma
              <InfoTip entry={{ term: "Sagoma del giorno", desc: SHAPE_TIP }} />
            </th>
          </tr>
        </thead>
        <tbody>
          {template.months.map((m, i) => (
            <tr key={i}>
              <td>{MONTH_LABELS[i]}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={m.dailyKwh}
                  onChange={(e) => setMonth(i, { dailyKwh: Number(e.target.value) })}
                />
              </td>
              <td>
                <select
                  value={shapeValue(m.shape)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "custom") {
                      const parsed = parseCustom(customText[i] ?? "") ?? new Array<number>(24).fill(1);
                      setMonth(i, { shape: parsed });
                    } else {
                      setMonth(i, { shape: v as DayShapeKey });
                    }
                  }}
                >
                  {(Object.keys(SHAPE_LABELS) as DayShapeKey[]).map((k) => (
                    <option key={k} value={k}>
                      {SHAPE_LABELS[k]}
                    </option>
                  ))}
                  {advanced && <option value="custom">Personalizzata…</option>}
                </select>
                {advanced && Array.isArray(m.shape) && (
                  <input
                    className="consumption-custom"
                    type="text"
                    placeholder="24 valori separati da virgola"
                    value={customText[i] ?? m.shape.join(",")}
                    onChange={(e) => {
                      const txt = e.target.value;
                      setCustomText((prev) => ({ ...prev, [i]: txt }));
                      const parsed = parseCustom(txt);
                      if (parsed) setMonth(i, { shape: parsed });
                    }}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <NumberField
        label="Fattore weekend"
        value={template.weekendFactor}
        min={0.2}
        max={3}
        step={0.1}
        onChange={(v) => setTemplate({ ...template, weekendFactor: v })}
        tip={{
          term: "Fattore weekend",
          desc: "Moltiplica il consumo di sabato e domenica rispetto ai feriali: 1 = uguali; 1.3 = +30% nel weekend (si sta più a casa); 0.7 = −30% (casa vuota nel weekend). Il totale mensile resta quello impostato: cambia solo la ripartizione.",
        }}
      />

      <ConsumptionPreview result={result} viz={setup.viz} />
      <button className="wizard-primary" onClick={() => apply({ method: "monthly", template }, result)}>
        Applica
      </button>
    </div>
  );
}
