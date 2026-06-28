import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SystemResult } from "../../../src/core/comparison/computeSystem.ts";
import { fmt, MONTH_LABELS } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";

type Metric = "produzione" | "autoconsumo" | "import" | "export";

const METRICS: { key: Metric; label: string }[] = [
  { key: "produzione", label: "produzione" },
  { key: "autoconsumo", label: "autoconsumo" },
  { key: "import", label: "import" },
  { key: "export", label: "export" },
];

function monthlyValue(r: SystemResult, metric: Metric, k: number): number {
  if (metric === "produzione") return r.production.monthly[k]?.practicalKwh ?? 0;
  const m = r.monthly[k];
  if (m === undefined) return 0;
  if (metric === "autoconsumo") return m.selfConsumedKwh;
  if (metric === "import") return m.importKwh;
  return m.exportKwh;
}

function annualValue(r: SystemResult, metric: Metric): number {
  if (metric === "produzione") return r.production.annual.practicalKwh;
  if (metric === "autoconsumo") return r.metrics.selfConsumedKwh;
  if (metric === "import") return r.metrics.importKwh;
  return r.metrics.exportKwh;
}

interface Props {
  a: SystemResult;
  b: SystemResult;
  labelA: string;
  labelB: string;
}

export function CompareAnnualBars({ a, b, labelA, labelB }: Props) {
  const { onClick, isHidden } = useLegendToggle();
  const data = METRICS.map((m) => ({ metric: m.label, A: annualValue(a, m.key), B: annualValue(b, m.key) }));
  return (
    <section className="chart-card">
      <h3>
        Annuale: {labelA} vs {labelB}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="metric" />
          <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(v) => `${fmt(Number(v))} kWh`} />
          <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />
          <Bar dataKey="A" name={labelA} fill="#94a3b8" hide={isHidden("A")} />
          <Bar dataKey="B" name={labelB} fill="#3b82f6" hide={isHidden("B")} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

export function CompareMonthlyBars({ a, b, labelA, labelB }: Props) {
  const { onClick, isHidden } = useLegendToggle();
  const [metric, setMetric] = useState<Metric>("produzione");
  const data = MONTH_LABELS.map((name, k) => ({ name, A: monthlyValue(a, metric, k), B: monthlyValue(b, metric, k) }));
  return (
    <section className="chart-card">
      <div className="section-head">
        <h3>
          Mensile: {labelA} vs {labelB}
        </h3>
        <span className="seg">
          {METRICS.map((m) => (
            <button key={m.key} className={metric === m.key ? "active" : ""} onClick={() => setMetric(m.key)}>
              {m.label}
            </button>
          ))}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(v) => `${fmt(Number(v))} kWh`} />
          <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />
          <Bar dataKey="A" name={labelA} fill="#94a3b8" hide={isHidden("A")} />
          <Bar dataKey="B" name={labelB} fill="#3b82f6" hide={isHidden("B")} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
