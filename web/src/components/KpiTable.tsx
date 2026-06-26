import type { SystemResult } from "../../../src/core/comparison/computeSystem.ts";
import { fmt, pct } from "../lib/format.ts";
import { InfoTip } from "./InfoTip.tsx";

interface Row {
  label: string;
  info?: string;
  a: number;
  b: number;
  render: (v: number) => string;
  /** Custom Δ formatter (e.g. percentage points for rates). */
  delta?: (a: number, b: number) => string;
}

export function KpiTable({
  a,
  b,
  labelA,
  labelB,
}: {
  a: SystemResult;
  b: SystemResult;
  labelA: string;
  labelB: string;
}) {
  const kwh = (v: number): string => `${fmt(v)} kWh`;
  const points = (x: number, y: number): string => `${((y - x) * 100 >= 0 ? "+" : "")}${((y - x) * 100).toFixed(1)} pt`;

  const rows: Row[] = [
    { label: "Produzione pratica", info: "produzione", a: a.production.annual.practicalKwh, b: b.production.annual.practicalKwh, render: kwh },
    { label: "Clipping", info: "clipping", a: a.production.annual.clippingLossKwh, b: b.production.annual.clippingLossKwh, render: kwh },
    { label: "Autoconsumo", info: "autoconsumo", a: a.metrics.selfConsumedKwh, b: b.metrics.selfConsumedKwh, render: kwh },
    { label: "Tasso autoconsumo", info: "tassoAutoconsumo", a: a.metrics.selfConsumptionRate, b: b.metrics.selfConsumptionRate, render: pct, delta: points },
    { label: "Autosufficienza", info: "autosufficienza", a: a.metrics.selfSufficiency, b: b.metrics.selfSufficiency, render: pct, delta: points },
    { label: "Import da rete", info: "import", a: a.metrics.importKwh, b: b.metrics.importKwh, render: kwh },
    { label: "Export in rete", info: "export", a: a.metrics.exportKwh, b: b.metrics.exportKwh, render: kwh },
    { label: "Cicli batteria/anno", info: "cicli", a: a.metrics.battery?.equivalentCycles ?? 0, b: b.metrics.battery?.equivalentCycles ?? 0, render: (v) => (v > 0 ? fmt(v) : "—") },
  ];

  const renderDelta = (r: Row): string => {
    if (r.delta) return r.delta(r.a, r.b);
    const d = r.b - r.a;
    return `${d >= 0 ? "+" : ""}${r.render(d)}`;
  };

  return (
    <table className="kpi-table">
      <thead>
        <tr>
          <th>Metrica</th>
          <th>{labelA}</th>
          <th>{labelB}</th>
          <th>
            Δ<InfoTip k="delta" />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const sign = r.b - r.a;
          return (
            <tr key={r.label}>
              <td>
                {r.label}
                {r.info !== undefined && <InfoTip k={r.info} />}
              </td>
              <td>{r.render(r.a)}</td>
              <td>{r.render(r.b)}</td>
              <td className={sign === 0 ? "" : sign > 0 ? "pos" : "neg"}>{renderDelta(r)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
