import { useT } from "../i18n/useT.tsx";

/**
 * Box mostrato (una volta per tab) quando il dataset è "solo produzione": le sezioni
 * economiche/batteria/autoconsumo sono nascoste finché non si aggiungono i consumi.
 */
export function ConsumptionLockedBox() {
  const { t } = useT();
  return (
    <section className="chart-card locked-box">
      <p>
        {t("locked.text")} <span className="muted">{t("locked.hint")}</span>
      </p>
    </section>
  );
}
