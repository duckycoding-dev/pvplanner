/**
 * Box mostrato (una volta per tab) quando il dataset è "solo produzione": le sezioni
 * economiche/batteria/autoconsumo sono nascoste finché non si aggiungono i consumi.
 */
export function ConsumptionLockedBox() {
  return (
    <section className="chart-card locked-box">
      <p>
        🔌 Aggiungi i consumi per sbloccare le analisi economiche e batteria <span className="muted">(prossima versione)</span>
      </p>
    </section>
  );
}
