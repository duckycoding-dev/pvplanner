import { useState } from "react";
import type { StoredSetup } from "../../lib/setupTypes.ts";
import { ConsumptionEditor } from "../consumption/ConsumptionEditor.tsx";

/**
 * Step consumi del wizard: ospita l'editor consumi sul dataset appena scaricato.
 * Resta saltabile — si può concludere senza applicare consumi (dataset solo-produzione)
 * e aggiungerli in seguito dalla sezione «Consumi» del menu di configurazione.
 * Nota: questo step segue lo «Scarico» perché l'editor ha bisogno dell'asse orario e
 * della temperatura reale del sito, disponibili solo dopo il download PVGIS.
 */
export function StepConsumption({
  setup,
  onApply,
}: {
  setup: StoredSetup | null;
  onApply: (next: StoredSetup) => void;
}) {
  const [applied, setApplied] = useState(false);

  if (setup === null) {
    return (
      <div className="wizard-body">
        <h4>Consumi</h4>
        <p className="note">Scarica prima i dati PVGIS: i consumi si aggiungono sul dataset del sito.</p>
      </div>
    );
  }

  return (
    <div className="wizard-body">
      <h4>Consumi</h4>
      <p className="note">
        Aggiungi i consumi per sbloccare le analisi economiche e batteria. Puoi anche saltare e farlo dopo dalla sezione
        «Consumi» del menu di configurazione.
      </p>
      {applied && <p className="note consumption-applied">Consumi applicati ✓ — premi «Fine» per concludere.</p>}
      <ConsumptionEditor
        setup={setup}
        onApply={(next) => {
          setApplied(true);
          onApply(next);
        }}
      />
    </div>
  );
}
