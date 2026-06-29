import { useState } from "react";
import { type Good, bestWorstClasses, deltaClass } from "../lib/metricsTable.ts";
import { InfoTip } from "./InfoTip.tsx";

export interface MetricCol {
  key: string;
  label: string;
}

export interface MetricRow {
  key: string;
  label: string;
  info?: string; // glossary key
  good: Good;
  render: (v: number) => string;
  values: number[]; // aligned with columns
}

/**
 * Generic comparison table: columns = cases/systems, rows = metrics. Each cell is
 * coloured best/worst per row by the metric's "good" direction. With exactly two
 * columns a Δ column (col2 − col1) is shown. Rows can be hidden by clicking the label.
 */
export function MetricsTable({
  columns,
  rows,
  showDelta,
}: {
  columns: MetricCol[];
  rows: MetricRow[];
  showDelta?: boolean;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (key: string): void =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const delta = (showDelta ?? columns.length === 2) && columns.length === 2;
  const visible = rows.filter((r) => !hidden.has(r.key));
  const hiddenRows = rows.filter((r) => hidden.has(r.key));

  return (
    <div className="metrics-wrap">
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Metrica</th>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {delta && <th>Δ</th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const cls = bestWorstClasses(r.values, r.good);
            const d = (r.values[1] ?? 0) - (r.values[0] ?? 0);
            return (
              <tr key={r.key}>
                <td>
                  <button className="row-toggle" onClick={() => toggle(r.key)} title="nascondi riga">
                    {r.label}
                  </button>
                  {r.info !== undefined && <InfoTip k={r.info} />}
                </td>
                {r.values.map((v, i) => (
                  <td key={columns[i]?.key ?? i} className={cls[i]}>
                    {r.render(v)}
                  </td>
                ))}
                {delta && (
                  <td className={deltaClass(d, r.good)}>
                    {d >= 0 ? "+" : ""}
                    {r.render(d)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {hiddenRows.length > 0 && (
        <div className="metrics-hidden">
          righe nascoste:{" "}
          {hiddenRows.map((r) => (
            <button key={r.key} className="chip" onClick={() => toggle(r.key)} title="mostra riga">
              {r.label} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
