import { GLOSSARY } from "../lib/glossary.ts";
import { useT } from "../i18n/useT.tsx";

export function Glossary() {
  const { t, lang } = useT();
  return (
    <div className="glossary">
      <p className="muted">{t("glossary.intro")}</p>
      {Object.values(GLOSSARY).map((e) => {
        const entry = e[lang];
        return (
          <div className="gloss-item" key={entry.term}>
            <h4>{entry.term}</h4>
            <p>{entry.desc}</p>
            {entry.formula !== undefined && <code>{entry.formula}</code>}
          </div>
        );
      })}
    </div>
  );
}
