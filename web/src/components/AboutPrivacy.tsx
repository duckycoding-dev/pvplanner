import { useT } from "../i18n/useT.tsx";

const REPO_URL = "https://github.com/duckycoding-dev/pvverdict";

/**
 * Pagina Info & Privacy (bilingue via i18n): cos'è, come funziona, privacy by design,
 * attribuzioni dati, licenza AGPL con link al repo, disclaimer. Overlay modale chiudibile.
 */
export function AboutPrivacy({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          <h3>{t("about.title")}</h3>
          <button className="menu-close" onClick={onClose} aria-label={t("common.close")}>
            ✕
          </button>
        </div>

        <section>
          <h4>{t("about.whatTitle")}</h4>
          <p>{t("about.what")}</p>
        </section>

        <section>
          <h4>{t("about.howTitle")}</h4>
          <ol className="about-steps">
            <li>{t("about.how1")}</li>
            <li>{t("about.how2")}</li>
            <li>{t("about.how3")}</li>
          </ol>
        </section>

        <section>
          <h4>{t("about.privacyTitle")}</h4>
          <p>{t("about.privacy")}</p>
        </section>

        <section>
          <h4>{t("about.attributionsTitle")}</h4>
          <p>{t("attribution.pvgis")}</p>
          <p>{t("attribution.osm")}</p>
        </section>

        <section>
          <h4>{t("about.licenseTitle")}</h4>
          <p>
            {t("about.license")}{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {t("about.repo")}
            </a>
          </p>
        </section>

        <section>
          <h4>{t("about.disclaimerTitle")}</h4>
          <p>{t("disclaimer.short")}.</p>
        </section>
      </div>
    </div>
  );
}
