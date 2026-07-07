import { useT } from "../i18n/useT.tsx";

// TODO-DAVIDE: sostituire questi URL segnaposto (blog, LinkedIn, donazione) prima del deploy.
const BLOG_URL = "TODO-DAVIDE"; // es. https://blog.example.com
const LINKEDIN_URL = "TODO-DAVIDE"; // es. https://www.linkedin.com/in/…
const COFFEE_URL = "TODO-DAVIDE"; // es. https://buymeacoffee.com/…

/**
 * Footer sempre visibile: nota consumi (baked nel dataset) + attribuzioni dati vincolanti
 * (PVGIS/OSM), disclaimer breve, link alla pagina Info & Privacy e link personali di Davide.
 */
export function Footer({ consumptionNote, onOpenAbout }: { consumptionNote: string; onOpenAbout: () => void }) {
  const { t } = useT();
  return (
    <footer className="app-footer">
      {consumptionNote !== "" && <p className="footer-note">{consumptionNote}</p>}
      <p className="footer-attr">
        {t("attribution.pvgis")} · {t("attribution.osm")}
      </p>
      <p className="footer-disclaimer">{t("disclaimer.short")}</p>
      <nav className="footer-links">
        <button className="link-button" onClick={onOpenAbout}>
          {t("footer.info")}
        </button>
        <a href={BLOG_URL} target="_blank" rel="noopener noreferrer">
          {t("footer.blog")}
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
          {t("footer.linkedin")}
        </a>
        <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer">
          {t("footer.coffee")}
        </a>
      </nav>
    </footer>
  );
}
