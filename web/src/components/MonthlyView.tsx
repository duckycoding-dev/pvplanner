import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Viz } from "../types.ts";
import { fmt, MONTH_LABELS } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";
import { InfoTip } from "./InfoTip.tsx";

export function MonthlyView({ viz }: { viz: Viz }) {
  const prodToggle = useLegendToggle();
  const netToggle = useLegendToggle();
  const [scenario, setScenario] = useState<"con" | "senza">("con");

  const data = viz.monthly.map((m) => {
    const s = scenario === "con" ? m.wb : m.nb;
    return {
      name: MONTH_LABELS[m.month - 1],
      pratica: m.prodPracticalKwh,
      clipping: m.clippingKwh,
      self: s.selfConsumedKwh,
      imp: s.importKwh,
      exp: s.exportKwh,
    };
  });

  return (
    <div>
      <section className="chart-card">
        <div className="section-head">
          <h3>
            Produzione mensile (pratica + clipping = teorica)
            <InfoTip k="clipping" />
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
            <Legend onClick={prodToggle.onClick} wrapperStyle={{ cursor: "pointer" }} />
            <Bar dataKey="pratica" name="produzione" stackId="p" fill="#16a34a" hide={prodToggle.isHidden("pratica")} />
            <Bar dataKey="clipping" name="clipping" stackId="p" fill="#f59e0b" hide={prodToggle.isHidden("clipping")} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="chart-card">
        <div className="section-head">
          <h3>
            Autoconsumo e rete per mese
            <InfoTip k="autoconsumo" />
          </h3>
          <span className="seg">
            <button className={scenario === "con" ? "active" : ""} onClick={() => setScenario("con")}>
              con batteria
            </button>
            <button className={scenario === "senza" ? "active" : ""} onClick={() => setScenario("senza")}>
              senza batteria
            </button>
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
            <Legend onClick={netToggle.onClick} wrapperStyle={{ cursor: "pointer" }} />
            <Bar dataKey="self" name="autoconsumo" fill="#3b82f6" hide={netToggle.isHidden("self")} />
            <Bar dataKey="imp" name="import" fill="#dc2626" hide={netToggle.isHidden("imp")} />
            <Bar dataKey="exp" name="export" fill="#94a3b8" hide={netToggle.isHidden("exp")} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
