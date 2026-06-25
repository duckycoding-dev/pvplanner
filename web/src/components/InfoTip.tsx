import { GLOSSARY } from "../lib/glossary.ts";

/** Small unobtrusive ⓘ that shows a glossary description on hover (native title). */
export function InfoTip({ k }: { k: string }) {
  const entry = GLOSSARY[k];
  if (entry === undefined) return null;
  const text = entry.formula ? `${entry.desc}\n\n${entry.formula}` : entry.desc;
  return (
    <span className="info" title={text} role="img" aria-label={`spiegazione: ${entry.term}`}>
      ⓘ
    </span>
  );
}
