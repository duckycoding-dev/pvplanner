import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Viz } from "../types.ts";
import { fmt, MONTH_LABELS } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";

export function MonthlyView({ viz }: { viz: Viz }) {
  const { onClick, isHidden } = useLegendToggle();
  const data = viz.monthly.map((m) => ({
    name: MONTH_LABELS[m.month - 1],
    pratica: m.prodPracticalKwh,
    clipping: m.clippingKwh,
    wbSelf: m.wb.selfConsumedKwh,
    wbImport: m.wb.importKwh,
    wbExport: m.wb.exportKwh,
  }));

  return (
    <div>
      <section className="chart-card">
        <h3>Produzione mensile (pratica + clipping = teorica)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
            <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />
            <Bar dataKey="pratica" name="produzione" stackId="p" fill="#16a34a" hide={isHidden("pratica")} />
            <Bar dataKey="clipping" name="clipping" stackId="p" fill="#f59e0b" hide={isHidden("clipping")} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="chart-card">
        <h3>Autoconsumo e rete per mese (con batteria)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
            <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />
            <Bar dataKey="wbSelf" name="autoconsumo" fill="#3b82f6" hide={isHidden("wbSelf")} />
            <Bar dataKey="wbImport" name="import" fill="#dc2626" hide={isHidden("wbImport")} />
            <Bar dataKey="wbExport" name="export" fill="#94a3b8" hide={isHidden("wbExport")} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
