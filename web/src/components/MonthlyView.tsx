import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Scenario, Viz } from "../types.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import { fmt, MONTH_LABELS } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";
import { scenarioCost } from "../lib/viewCosts.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { InfoTip } from "./InfoTip.tsx";

const eur = (v: number): string => `${fmt(v, 2)} €`;
const COST_COLS = [
  { key: "senza", label: "senza batteria" },
  { key: "con", label: "con batteria" },
];

interface BarSpec {
  key: string;
  name: string;
  fill: string;
}

const NET_BARS: Record<Scenario, BarSpec[]> = {
  con: [
    { key: "selfCon", name: "autoconsumo", fill: "#3b82f6" },
    { key: "impCon", name: "import", fill: "#dc2626" },
    { key: "expCon", name: "export", fill: "#94a3b8" },
  ],
  senza: [
    { key: "selfSen", name: "autoconsumo", fill: "#3b82f6" },
    { key: "impSen", name: "import", fill: "#dc2626" },
    { key: "expSen", name: "export", fill: "#94a3b8" },
  ],
  entrambi: [
    { key: "selfCon", name: "autoconsumo (con)", fill: "#3b82f6" },
    { key: "selfSen", name: "autoconsumo (senza)", fill: "#93c5fd" },
    { key: "impCon", name: "import (con)", fill: "#dc2626" },
    { key: "impSen", name: "import (senza)", fill: "#fca5a5" },
    { key: "expCon", name: "export (con)", fill: "#64748b" },
    { key: "expSen", name: "export (senza)", fill: "#cbd5e1" },
  ],
};

const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: "con", label: "con batteria" },
  { key: "senza", label: "senza batteria" },
  { key: "entrambi", label: "entrambi" },
];

export function MonthlyView({ viz, tariff }: { viz: Viz; tariff: Tariff }) {
  const prodToggle = useLegendToggle();
  const netToggle = useLegendToggle();
  const [scenario, setScenario] = useState<Scenario>("con");
  const cs = scenarioCost(viz, "senza", tariff);
  const cc = scenarioCost(viz, "con", tariff);
  const costRows: MetricRow[] = [
    { key: "buy", label: "Spesa acquisto", info: "costo", good: "lower", money: "pay", render: eur, values: [cs.annual.buyCost, cc.annual.buyCost] },
    { key: "sell", label: "Ricavo vendita", info: "ricavo", good: "higher", money: "earn", render: eur, values: [cs.annual.sellRevenue, cc.annual.sellRevenue] },
    { key: "net", label: "Costo netto/anno", info: "nettoCosto", good: "lower", money: "net", render: eur, values: [cs.annual.netCost, cc.annual.netCost] },
  ];
  const monthlyNetRows: MetricRow[] = MONTH_LABELS.map((name, k) => ({
    key: `m${k}`,
    label: name,
    good: "lower",
    money: "net",
    render: eur,
    values: [cs.monthly[k]?.netCost ?? 0, cc.monthly[k]?.netCost ?? 0],
  }));

  const data = viz.monthly.map((m) => ({
    name: MONTH_LABELS[m.month - 1],
    pratica: m.prodPracticalKwh,
    clipping: m.clippingKwh,
    selfCon: m.wb.selfConsumedKwh,
    selfSen: m.nb.selfConsumedKwh,
    impCon: m.wb.importKwh,
    impSen: m.nb.importKwh,
    expCon: m.wb.exportKwh,
    expSen: m.nb.exportKwh,
  }));

  return (
    <div>
      <section className="chart-card">
        <div className="section-head">
          <h3>Costi energia (Δ = effetto batteria)</h3>
        </div>
        <MetricsTable columns={COST_COLS} rows={costRows} />
      </section>

      <section className="chart-card">
        <div className="section-head">
          <h3>Costo netto per mese</h3>
        </div>
        <MetricsTable columns={COST_COLS} rows={monthlyNetRows} />
      </section>

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
            {SCENARIOS.map((s) => (
              <button key={s.key} className={scenario === s.key ? "active" : ""} onClick={() => setScenario(s.key)}>
                {s.label}
              </button>
            ))}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
            <Legend onClick={netToggle.onClick} wrapperStyle={{ cursor: "pointer" }} />
            {NET_BARS[scenario].map((b) => (
              <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.fill} hide={netToggle.isHidden(b.key)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
