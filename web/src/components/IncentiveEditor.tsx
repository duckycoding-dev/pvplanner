import { type Incentive, incentiveForMode } from "../lib/economics.ts";
import { NumberField } from "./NumberField.tsx";
import { useT } from "../i18n/useT.tsx";

/** Shared incentive policy: % of CAPEX or fixed €, returned over N years. */
export function IncentiveEditor({ incentive, setIncentive }: { incentive: Incentive; setIncentive: (i: Incentive) => void }) {
  const { t } = useT();
  return (
    <div className="editor">
      <span className="seg">
        <button className={incentive.mode === "percent" ? "active" : ""} onClick={() => setIncentive(incentiveForMode(incentive, "percent"))}>
          {t("incentive.percentMode")}
        </button>
        <button className={incentive.mode === "fixed" ? "active" : ""} onClick={() => setIncentive(incentiveForMode(incentive, "fixed"))}>
          {t("incentive.fixedMode")}
        </button>
      </span>
      <NumberField
        label={incentive.mode === "percent" ? t("incentive.valuePercent") : t("incentive.valueFixed")}
        value={incentive.value}
        min={0}
        max={incentive.mode === "percent" ? 100 : 60000}
        step={incentive.mode === "percent" ? 1 : 100}
        onChange={(v) => setIncentive({ ...incentive, value: v })}
      />
      <NumberField
        label={t("incentive.years")}
        value={incentive.years}
        min={1}
        max={20}
        step={1}
        onChange={(v) => setIncentive({ ...incentive, years: Math.max(1, Math.round(v)) })}
      />
      <p className="note">{t("incentive.note")}</p>
    </div>
  );
}
