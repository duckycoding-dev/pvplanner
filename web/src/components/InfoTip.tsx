import { GLOSSARY } from "../lib/glossary.ts";

/** Small ⓘ that reveals a styled tooltip on hover/focus (immediate, not the slow native title). */
export function InfoTip({ k }: { k: string }) {
  const entry = GLOSSARY[k];
  if (entry === undefined) return null;
  return (
    <span className="info" tabIndex={0}>
      ⓘ
      <span className="info-bubble" role="tooltip">
        <strong>{entry.term}</strong>
        <span>{entry.desc}</span>
        {entry.formula !== undefined && <code>{entry.formula}</code>}
      </span>
    </span>
  );
}
