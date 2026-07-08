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
import { cashflowSeries, firstCrossover } from "../lib/cashflow.ts";
import { paybackYears } from "../../../src/core/economics/payback.ts";
import { type Incentive, incentiveTotalEur } from "../lib/economics.ts";
import { fmt } from "../lib/format.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { NumberField } from "./NumberField.tsx";
import { InfoTip } from "./InfoTip.tsx";
import { useT } from "../i18n/useT.tsx";

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
  const { t } = useT();
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

  // Crossover: when does one system overtake the other in cumulative savings?
  const interp = (s: number[], x: number): number => {
    const i = Math.floor(x);
    const f = x - i;
    return (s[i] ?? 0) * (1 - f) + (s[i + 1] ?? s[i] ?? 0) * f;
  };
  const sameSystem = sys1.id === sys2.id;
  const cross = sameSystem ? null : firstCrossover(m1.series, m2.series);
  const endDiff = (m1.series[years] ?? 0) - (m2.series[years] ?? 0);
  const leader = endDiff >= 0 ? sys1 : sys2;
  const trailer = endDiff >= 0 ? sys2 : sys1;
  const crossY = cross !== null ? interp(m1.series, cross) : 0;

  const breakdownCols = [
    { key: "s1", label: sys1.label },
    { key: "s2", label: sys2.label },
  ];
  const breakdownRows: MetricRow[] = [
    { key: "buy", label: t("cashflow.buyAvoided"), info: "costo", good: "higher", money: "earn", render: eur, values: [m1.buyAvoided, m2.buyAvoided] },
    { key: "exp", label: t("cashflow.exportRevenue"), info: "ricavo", good: "higher", money: "earn", render: eur, values: [m1.exportRevenue, m2.exportRevenue] },
    { key: "save", label: t("cashflow.annualSaving"), info: "payback", good: "higher", money: "earn", render: eur, values: [m1.annualSaving, m2.annualSaving] },
    { key: "inc", label: t("cashflow.incentivePerYear", { n: incN }), good: "higher", money: "earn", render: eur, values: [m1.incPerYear, m2.incPerYear] },
    { key: "capex", label: t("cashflow.capex"), good: "lower", money: "pay", render: eur, values: [sys1.capex, sys2.capex] },
    {
      key: "pay",
      label: t("metrics.payback"),
      info: "payback",
      good: "lower",
      render: (v) => (Number.isFinite(v) ? t("common.years", { n: v.toFixed(1) }) : "—"),
      values: [m1.payback ?? Infinity, m2.payback ?? Infinity],
    },
  ];

  const yearRows: MetricRow[] = Array.from({ length: years + 1 }, (_, y) => ({
    key: `y${y}`,
    label: t("common.yearN", { n: y }),
    good: "higher",
    money: "benefit",
    render: eur,
    values: [m1.series[y] ?? 0, m2.series[y] ?? 0],
  }));

  return (
    <section className="chart-card">
      <div className="section-head">
        <h3>
          {t("cashflow.chartTitle")}
          <InfoTip k="payback" />
        </h3>
      </div>
      <p className="note">
        {t("cashflow.noteA")} <b>{t("cashflow.noteInstallNothing")}</b>
        {t("cashflow.noteB", { n: incN })} <b>{t("cashflow.noteZero")}</b> {t("cashflow.noteC")}
      </p>

      <div className="cashflow-controls">
        <label className="text-field">
          {t("cashflow.system1")}
          <select value={sel1} onChange={(e) => setSel1(e.target.value)}>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-field">
          {t("cashflow.system2")}
          <select value={sel2} onChange={(e) => setSel2(e.target.value)}>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <NumberField label={t("cashflow.years")} value={years} min={5} max={40} step={1} onChange={setYears} />
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, years]}
            allowDecimals={false}
            label={{ value: t("cashflow.axisYears"), position: "insideBottom", offset: -2 }}
          />
          <YAxis label={{ value: t("cashflow.axisCumulative"), angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(v) => eur(Number(v))} labelFormatter={(y) => t("common.yearN", { n: Number(y) })} />
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
          {cross !== null && (
            <ReferenceLine
              x={cross}
              stroke="#7c3aed"
              strokeDasharray="3 3"
              label={{ value: t("cashflow.crossover", { years: cross.toFixed(1) }), position: "insideTop", fill: "#7c3aed", fontSize: 11 }}
            />
          )}
          {cross !== null && <ReferenceDot x={cross} y={crossY} r={5} fill="#7c3aed" stroke="#fff" />}
        </LineChart>
      </ResponsiveContainer>

      {!sameSystem && (
        <div className="crossover-note">
          {cross !== null ? (
            <>
              🔀 <b>{leader.label}</b> {t("cashflow.crossoverA")} <b>{trailer.label}</b> {t("cashflow.crossoverAfter")}{" "}
              <b>{t("common.years", { n: cross.toFixed(1) })}</b> {t("cashflow.crossoverCumulative", { eur: eur(crossY) })}.
            </>
          ) : (
            <>
              <b>{leader.label}</b> {t("cashflow.leadAlwaysA")} <b>{trailer.label}</b>{" "}
              {t("cashflow.leadAlwaysB", { years })}
            </>
          )}
        </div>
      )}

      <h4 className="subchart-title">{t("cashflow.breakdownTitle")}</h4>
      <MetricsTable columns={breakdownCols} rows={breakdownRows} />

      <MetricsTable title={t("cashflow.cumulativePerYear")} columns={breakdownCols} rows={yearRows} />
    </section>
  );
}
