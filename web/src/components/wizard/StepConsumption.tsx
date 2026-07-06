/**
 * Step 3 — consumi: segnaposto della Fase 1. L'inserimento vero dei consumi arriva
 * nella fase successiva; qui si spiega che il setup prosegue in modalità solo-produzione.
 * Il bottone "Continua" è nella barra di navigazione del wizard.
 */
export function StepConsumption() {
  return (
    <div className="wizard-body">
      <h4>Consumi</h4>
      <p className="note">
        L'inserimento dei consumi (CSV, template mensili, stima parametrica) arriva con la prossima versione. Il
        setup prosegue in modalità solo-produzione: vedrai la produzione dell'impianto; per le analisi economiche e
        batteria servono i consumi.
      </p>
    </div>
  );
}
