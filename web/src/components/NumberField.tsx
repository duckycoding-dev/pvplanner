import type { GlossaryEntry } from "../lib/glossary.ts";
import { InfoTip } from "./InfoTip.tsx";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Voce inline per la ⓘ accanto alla label (descrizione/esempio del campo). */
  tip?: GlossaryEntry;
}

/** A numeric control editable both by slider and by number input (kept in sync). */
export function NumberField({ label, value, onChange, min, max, step = 1, unit, tip }: Props) {
  const set = (raw: string): void => {
    const n = Number(raw);
    if (!Number.isNaN(n)) onChange(n);
  };
  return (
    <div className="number-field">
      <label>
        {label}
        {unit !== undefined ? ` (${unit})` : ""}
        {tip !== undefined && <InfoTip entry={tip} />}
      </label>
      <div className="nf-row">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(e.target.value)} />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(e) => set(e.target.value)} />
      </div>
    </div>
  );
}
