import type { CanonicalConsumption } from "../../../src/core/consumption/canonical.ts";
import { formatConsumptionNote } from "../lib/consumptionDisplay.ts";
import { useT } from "../i18n/useT.tsx";

const BLOG_URL = "https://duckycoding.dev"; // es. https://blog.example.com
const LINKEDIN_URL = "https://www.linkedin.com/in/davide-m-997874254/"; // es. https://www.linkedin.com/in/…
const COFFEE_URL = "TODO-DAVIDE"; // es. https://buymeacoffee.com/…

/**
 * Footer sempre visibile: nota consumi dal dataset live con fallback al testo baked
 * + attribuzioni dati vincolanti (PVGIS/OSM), disclaimer breve, link alla pagina Info &
 * Privacy e link personali di Davide.
 */
export function Footer({
  consumptionNote,
  consumptionResult,
  onOpenAbout,
}: {
  consumptionNote: string;
  consumptionResult: CanonicalConsumption | null;
  onOpenAbout: () => void;
}) {
  const { t } = useT();
  const note = consumptionResult !== null ? formatConsumptionNote(consumptionResult, t) : consumptionNote;
  return (
    <footer className="app-footer">
      {note !== "" && <p className="footer-note">{note}</p>}
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
        {
          COFFEE_URL !== "TODO-DAVIDE" && (
            <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer">
              {t("footer.coffee")}
            </a>
          )
        }
      </nav>
    </footer>
  );
}
