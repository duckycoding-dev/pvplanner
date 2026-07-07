import type { StoredSetup } from "../../lib/setupTypes.ts";
import { ConsumptionEditor } from "../consumption/ConsumptionEditor.tsx";
import { useT } from "../../i18n/useT.tsx";

/**
 * Step consumi del wizard: ospita l'editor consumi sul dataset appena scaricato.
 * Niente «Applica» qui: «Fine» applica i valori del metodo attivo (se validi),
 * «Salta» conclude senza consumi (aggiungibili poi dalla sezione «Consumi»).
 * Nota: questo step segue lo «Scarico» perché l'editor ha bisogno dell'asse orario e
 * della temperatura reale del sito, disponibili solo dopo il download PVGIS.
 */
export function StepConsumption({
  setup,
  registerGetPending,
}: {
  setup: StoredSetup | null;
  registerGetPending: (get: () => StoredSetup | null) => void;
}) {
  const { t } = useT();

  if (setup === null) {
    return (
      <div className="wizard-body">
        <h4>{t("wizard.consumption.title")}</h4>
        <p className="note">{t("wizard.consumption.needFetch")}</p>
      </div>
    );
  }

  return (
    <div className="wizard-body">
      <h4>{t("wizard.consumption.title")}</h4>
      <p className="note">{t("wizard.consumption.intro")}</p>
      <ConsumptionEditor setup={setup} wizard={{ registerGetPending }} />
    </div>
  );
}
