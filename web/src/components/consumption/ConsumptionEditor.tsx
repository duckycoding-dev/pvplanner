import { useEffect, useState } from "react";
import { HOUSE_DEFAULTS, type HouseParams } from "../../../../src/core/consumption/houseLoad.ts";
import type { MonthlyTemplate } from "../../../../src/core/consumption/monthlyTemplate.ts";
import { type CanonicalConsumption, validateCanonical } from "../../../../src/core/consumption/canonical.ts";
import type { ConsumptionSpec, StoredSetup } from "../../lib/setupTypes.ts";
import { applyConsumption } from "../../lib/applyConsumption.ts";
import { buildPendingSetup } from "../../lib/pendingConsumption.ts";
import { fmt } from "../../lib/format.ts";
import { useT } from "../../i18n/useT.tsx";
import { ConsumptionCsv, type CsvState } from "./ConsumptionCsv.tsx";
import { ConsumptionMonthly, defaultTemplate } from "./ConsumptionMonthly.tsx";
import { ConsumptionParametric } from "./ConsumptionParametric.tsx";

type Method = "csv" | "monthly" | "parametric";

const METHOD_TABS: { key: Method; labelKey: string }[] = [
  { key: "csv", labelKey: "consumption.method.csv" },
  { key: "monthly", labelKey: "consumption.method.monthly" },
  { key: "parametric", labelKey: "consumption.method.parametric" },
];

/**
 * Editor consumi con tre metodi (CSV, template mensili, stima parametrica) che
 * convergono nella forma canonica e vengono applicati al dataset via applyConsumption.
 * Lo stato di ciascun metodo è conservato al cambio tab. Riusato in wizard e sidebar.
 * Se il dataset ha già dei consumi, l'editor riparte dalla spec salvata (metodo attivo
 * e form popolati) così restano modificabili; per il CSV il file grezzo non è salvato:
 * si mostra il risultato salvato e per cambiare si ricarica un file.
 */
export function ConsumptionEditor({
  setup,
  onApply,
  wizard,
}: {
  setup: StoredSetup;
  /** Riceve il NUOVO StoredSetup con i consumi applicati; il chiamante lo salva.
   *  Assente in modalità wizard (i bottoni «Applica» sono nascosti). */
  onApply?: (next: StoredSetup) => void;
  /** Modalità wizard: nasconde «Applica» e registra il getter del candidato
   *  corrente, che il bottone «Fine» del wizard applica. */
  wizard?: { registerGetPending: (get: () => StoredSetup | null) => void };
}) {
  const { t } = useT();
  const saved = setup.consumption ?? null;
  const [method, setMethod] = useState<Method>(saved?.spec.method ?? "monthly");
  // Stato per metodo, conservato al cambio tab; il metodo salvato riparte dalla sua spec.
  const [csv, setCsv] = useState<CsvState | null>(
    saved !== null && saved.spec.method === "csv"
      ? { filename: saved.spec.filename, result: saved.result, warnings: [] }
      : null,
  );
  const [template, setTemplate] = useState<MonthlyTemplate>(
    saved !== null && saved.spec.method === "monthly" ? saved.spec.template : defaultTemplate,
  );
  const [house, setHouse] = useState<HouseParams>(
    saved !== null && saved.spec.method === "parametric" ? saved.spec.house : HOUSE_DEFAULTS,
  );
  const [error, setError] = useState<string | null>(null);

  const apply = (spec: ConsumptionSpec, result: CanonicalConsumption): void => {
    const err = validateCanonical(result, setup.viz.hourly.timestampsUtc.length);
    if (err !== null) {
      setError(err);
      return;
    }
    setError(null);
    onApply?.(applyConsumption(setup, spec, result));
  };

  const hideApply = wizard !== undefined;
  // Senza deps: a ogni render registra la closure sullo stato più recente.
  useEffect(() => {
    wizard?.registerGetPending(() => buildPendingSetup(setup, { method, template, house, csv }));
  });

  return (
    <div className="consumption-editor">
      {saved !== null && (
        <p className="note consumption-current">
          {t("consumption.editor.inUse")} <strong>{saved.result.meta.label}</strong> ·{" "}
          {fmt(saved.result.meta.annualKwh)} {t("consumption.editor.perYear")}
        </p>
      )}
      <div className="consumption-tabs">
        {METHOD_TABS.map((tab) => (
          <button key={tab.key} className={method === tab.key ? "active" : ""} onClick={() => setMethod(tab.key)}>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {method === "csv" && <ConsumptionCsv setup={setup} state={csv} setState={setCsv} apply={apply} hideApply={hideApply} />}
      {method === "monthly" && (
        <ConsumptionMonthly setup={setup} template={template} setTemplate={setTemplate} apply={apply} hideApply={hideApply} />
      )}
      {method === "parametric" && (
        <ConsumptionParametric setup={setup} house={house} setHouse={setHouse} apply={apply} hideApply={hideApply} />
      )}

      {error !== null && <p className="err">{error}</p>}
    </div>
  );
}
