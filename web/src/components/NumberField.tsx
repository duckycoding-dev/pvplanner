interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

/** A numeric control editable both by slider and by number input (kept in sync). */
export function NumberField({ label, value, onChange, min, max, step = 1, unit }: Props) {
  const set = (raw: string): void => {
    const n = Number(raw);
    if (!Number.isNaN(n)) onChange(n);
  };
  return (
    <div className="number-field">
      <label>
        {label}
        {unit !== undefined ? ` (${unit})` : ""}
      </label>
      <div className="nf-row">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(e.target.value)} />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(e) => set(e.target.value)} />
      </div>
    </div>
  );
}
