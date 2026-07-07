import { useMemo, useState } from "react";
import {
  type DayShapeKey,
  type MonthlyTemplate,
  expandMonthlyTemplate,
} from "../../../../src/core/consumption/monthlyTemplate.ts";
import type { CanonicalConsumption } from "../../../../src/core/consumption/canonical.ts";
import type { ConsumptionSpec, StoredSetup } from "../../lib/setupTypes.ts";
import { useMonthLabels, useT } from "../../i18n/useT.tsx";
import { InfoTip } from "../InfoTip.tsx";
import { NumberField } from "../NumberField.tsx";
import { ConsumptionPreview } from "./ConsumptionPreview.tsx";

const SHAPE_KEYS: DayShapeKey[] = ["flat", "morningEvening", "daytimeWfh", "nightHeavy"];

export function defaultTemplate(): MonthlyTemplate {
  // Sagoma mattina/sera, 10 kWh/giorno per mese: punto di partenza da tarare in ~2 minuti.
  return {
    months: Array.from({ length: 12 }, () => ({ dailyKwh: 10, shape: "morningEvening" as DayShapeKey | number[] })),
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
  const { t } = useT();
  const monthLabels = useMonthLabels();
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
      <p className="note">{t("consumption.monthly.intro")}</p>

      <label className="consumption-adv-toggle">
        <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />{" "}
        {t("consumption.monthly.customShapesLabel")}
        <InfoTip
          entry={{
            term: t("consumption.monthly.customShapesTip.term"),
            desc: t("consumption.monthly.customShapesTip.desc"),
          }}
        />
      </label>

      <table className="consumption-months">
        <thead>
          <tr>
            <th>{t("consumption.monthly.colMonth")}</th>
            <th>
              {t("consumption.monthly.colDailyKwh")}
              <InfoTip
                entry={{
                  term: t("consumption.monthly.dailyKwhTip.term"),
                  desc: t("consumption.monthly.dailyKwhTip.desc"),
                }}
              />
            </th>
            <th>
              {t("consumption.monthly.colShape")}
              <InfoTip
                entry={{ term: t("consumption.monthly.shapeTip.term"), desc: t("consumption.monthly.shapeTip.desc") }}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {template.months.map((m, i) => (
            <tr key={i}>
              <td>{monthLabels[i]}</td>
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
                  {SHAPE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {t(`consumption.shape.${k}`)}
                    </option>
                  ))}
                  {advanced && <option value="custom">{t("consumption.monthly.customOption")}</option>}
                </select>
                {advanced && Array.isArray(m.shape) && (
                  <input
                    className="consumption-custom"
                    type="text"
                    placeholder={t("consumption.monthly.customPlaceholder")}
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
        label={t("consumption.monthly.weekendFactor.label")}
        value={template.weekendFactor}
        min={0.2}
        max={3}
        step={0.1}
        onChange={(v) => setTemplate({ ...template, weekendFactor: v })}
        tip={{
          term: t("consumption.monthly.weekendFactor.label"),
          desc: t("consumption.monthly.weekendFactor.desc"),
        }}
      />

      <ConsumptionPreview result={result} viz={setup.viz} />
      <button className="wizard-primary" onClick={() => apply({ method: "monthly", template }, result)}>
        {t("common.apply")}
      </button>
    </div>
  );
}
