import { useEffect, useState } from "react";
import { type SharedConfig, encodeShare } from "../lib/shareSetup.ts";
import { useT } from "../i18n/useT.tsx";

/**
 * Dialog di condivisione: mostra l'avviso vincolante (il link contiene la posizione) e il
 * link `#s=<payload-compresso>` copiabile. Il payload sta nel FRAGMENT dell'URL, quindi
 * non raggiunge server/proxy (le coordinate restano fuori dai log).
 */
export function ShareSetupDialog({ config, onClose }: { config: SharedConfig; onClose: () => void }) {
  const { t } = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void encodeShare(config).then((encoded) => {
      if (cancelled) return;
      const { origin, pathname } = window.location;
      setUrl(`${origin}${pathname}#s=${encoded}`);
    });
    return () => {
      cancelled = true;
    };
  }, [config]);

  const copy = (): void => {
    if (url === null) return;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("share.dialogTitle")}</h3>
        <p className="note share-warning">{t("share.warning")}</p>
        <textarea className="share-url" readOnly value={url ?? t("app.loading")} rows={4} onFocus={(e) => e.currentTarget.select()} />
        <div className="editor-actions">
          <button className="wizard-primary" onClick={copy} disabled={url === null}>
            {copied ? t("share.copied") : t("share.copy")}
          </button>
          <button onClick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </div>
  );
}
