import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cashflowSeries } from "../lib/cashflow.ts";
import { paybackYears } from "../../../src/core/economics/payback.ts";
import { type Incentive, incentiveTotalEur } from "../lib/economics.ts";
import { fmt } from "../lib/format.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { NumberField } from "./NumberField.tsx";
import { InfoTip } from "./InfoTip.tsx";

export interface CashSystem {
  id: string; // "a" | "b" | "novf"
  label: string;
  capex: number;
  buy: number; // annual buy cost
  sell: number; // annual sell revenue
  net: number; // annual net cost
}

const eur = (v: number): string => `${fmt(v, 0)} €`;
const COLORS = ["#2563eb", "#f59e0b"];

export function CashflowSection({
  systems,
  noPv,
  incentive,
  defaultSecond,
}: {
  systems: CashSystem[];
  noPv: { net: number; buy: number; sell: number };
  incentive: Incentive;
  defaultSecond: string;
}) {
  const [sel1, setSel1] = useState<string>(systems[0]?.id ?? "a");
  const [sel2, setSel2] = useState<string>(defaultSecond);
  const [years, setYears] = useState<number>(20);

  const incN = Math.max(1, Math.round(incentive.years));
  const metricsFor = (s: CashSystem) => {
    const annualSaving = noPv.net - s.net;
    const buyAvoided = noPv.buy - s.buy;
    const exportRevenue = s.sell - noPv.sell;
    const incentiveTotal = incentiveTotalEur(incentive, s.capex);
    const series = cashflowSeries({ capex: s.capex, annualSaving, incentiveTotal, incentiveYears: incentive.years, years });
    const payback =
      s.capex > 0
        ? paybackYears({ capexEur: s.capex, annualSavingEur: annualSaving, incentiveEur: incentiveTotal, incentiveYears: incentive.years, horizonYears: years })
        : null;
    return { annualSaving, buyAvoided, exportRevenue, incentiveTotal, incPerYear: incentiveTotal / incN, series, payback };
  };

  const sys1 = systems.find((s) => s.id === sel1) ?? systems[0]!;
  const sys2 = systems.find((s) => s.id === sel2) ?? systems[systems.length - 1]!;
  const m1 = metricsFor(sys1);
  const m2 = metricsFor(sys2);

  const data = Array.from({ length: years + 1 }, (_, y) => ({ year: y, s1: m1.series[y] ?? 0, s2: m2.series[y] ?? 0 }));

  const breakdownCols = [
    { key: "s1", label: sys1.label },
    { key: "s2", label: sys2.label },
  ];
  const breakdownRows: MetricRow[] = [
    { key: "buy", label: "Spesa acquisto evitata", info: "costo", good: "higher", money: "earn", render: eur, values: [m1.buyAvoided, m2.buyAvoided] },
    { key: "exp", label: "Ricavo vendita (export)", info: "ricavo", good: "higher", money: "earn", render: eur, values: [m1.exportRevenue, m2.exportRevenue] },
    { key: "save", label: "Risparmio annuo", info: "payback", good: "higher", money: "earn", render: eur, values: [m1.annualSaving, m2.annualSaving] },
    { key: "inc", label: `Incentivo/anno (×${incN})`, good: "higher", money: "earn", render: eur, values: [m1.incPerYear, m2.incPerYear] },
    { key: "capex", label: "Costo impianto (CAPEX)", good: "lower", money: "pay", render: eur, values: [sys1.capex, sys2.capex] },
    {
      key: "pay",
      label: "Tempo di rientro",
      info: "payback",
      good: "lower",
      render: (v) => (Number.isFinite(v) ? `${v.toFixed(1)} anni` : "—"),
      values: [m1.payback ?? Infinity, m2.payback ?? Infinity],
    },
  ];

  const yearRows: MetricRow[] = Array.from({ length: years + 1 }, (_, y) => ({
    key: `y${y}`,
    label: `anno ${y}`,
    good: "higher",
    money: "benefit",
    render: eur,
    values: [m1.series[y] ?? 0, m2.series[y] ?? 0],
  }));

  return (
    <section className="chart-card">
      <div className="section-head">
        <h3>
          Andamento economico (cashflow cumulato)
          <InfoTip k="payback" />
        </h3>
      </div>
      <p className="note">
        Quanto rendi nel tempo rispetto a <b>non installare nulla</b>: parti da −CAPEX (anno 0) e ogni
        anno aggiungi il risparmio in bolletta (acquisto evitato + export) e, per i primi {incN} anni, la
        quota incentivo. La curva taglia lo <b>zero</b> al tempo di rientro.
      </p>

      <div className="cashflow-controls">
        <label className="text-field">
          Sistema 1
          <select value={sel1} onChange={(e) => setSel1(e.target.value)}>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-field">
          Sistema 2
          <select value={sel2} onChange={(e) => setSel2(e.target.value)}>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <NumberField label="Anni" value={years} min={5} max={40} step={1} onChange={setYears} />
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, years]}
            allowDecimals={false}
            label={{ value: "anni", position: "insideBottom", offset: -2 }}
          />
          <YAxis label={{ value: "€ cumulati", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(v) => eur(Number(v))} labelFormatter={(y) => `anno ${y}`} />
          <Legend />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />
          <Line type="monotone" dataKey="s1" name={sys1.label} stroke={COLORS[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="s2" name={sys2.label} stroke={COLORS[1]} strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
          {m1.payback !== null && m1.payback <= years && (
            <ReferenceDot x={m1.payback} y={0} r={5} fill={COLORS[0]} stroke="#fff" />
          )}
          {m2.payback !== null && m2.payback <= years && (
            <ReferenceDot x={m2.payback} y={0} r={5} fill={COLORS[1]} stroke="#fff" />
          )}
        </LineChart>
      </ResponsiveContainer>

      <h4 className="subchart-title">Scomposizione del rientro (€/anno)</h4>
      <MetricsTable columns={breakdownCols} rows={breakdownRows} />

      <MetricsTable title="Cumulato per anno" columns={breakdownCols} rows={yearRows} />
    </section>
  );
}
