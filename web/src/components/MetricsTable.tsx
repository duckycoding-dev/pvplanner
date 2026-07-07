import { useState } from "react";
import { type Good, type Money, deltaClass, moneyClass } from "../lib/metricsTable.ts";
import { useT } from "../i18n/useT.tsx";
import { InfoTip } from "./InfoTip.tsx";

export interface MetricCol {
  key: string;
  label: string;
}

export interface MetricRow {
  key: string;
  label: string;
  info?: string; // glossary key
  good: Good; // drives the Δ colour
  money?: Money; // if set, value cells are coloured by sign
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
  title,
}: {
  columns: MetricCol[];
  rows: MetricRow[];
  showDelta?: boolean;
  title?: string;
}) {
  const { t } = useT();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [bodyOpen, setBodyOpen] = useState(true);
  const toggle = (key: string): void =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const delta = (showDelta ?? columns.length >= 2) && columns.length >= 2;
  const nCols = columns.length;
  const visible = rows.filter((r) => !hidden.has(r.key));
  const hiddenRows = rows.filter((r) => hidden.has(r.key));

  const body = (
    <div className="metrics-wrap">
      <table className="metrics-table">
        <thead>
          <tr>
            <th>{t("metrics.metric")}</th>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {delta && <th>Δ</th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const d = (r.values[nCols - 1] ?? 0) - (r.values[nCols - 2] ?? 0);
            return (
              <tr key={r.key}>
                <td>
                  <button className="row-toggle" onClick={() => toggle(r.key)} title={t("metrics.hideRow")}>
                    {r.label}
                  </button>
                  {r.info !== undefined && <InfoTip k={r.info} />}
                </td>
                {r.values.map((v, i) => (
                  <td key={columns[i]?.key ?? i} className={moneyClass(v, r.money)}>
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
          {t("metrics.hiddenRows")}{" "}
          {hiddenRows.map((r) => (
            <button key={r.key} className="chip" onClick={() => toggle(r.key)} title={t("metrics.showRow")}>
              {r.label} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (title === undefined) return body;
  return (
    <div className="metrics-block">
      <button className="metrics-title" onClick={() => setBodyOpen((o) => !o)}>
        {bodyOpen ? "▾" : "▸"} {title}
      </button>
      {bodyOpen && body}
    </div>
  );
}
