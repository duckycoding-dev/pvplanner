import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Scenario, Viz } from "../types.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import { fmt } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";
import { noPvCost, scenarioCost } from "../lib/viewCosts.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { InfoTip } from "./InfoTip.tsx";
import { ConsumptionLockedBox } from "./ConsumptionLockedBox.tsx";
import { useMonthLabels, useT } from "../i18n/useT.tsx";

const eur = (v: number): string => `${fmt(v, 2)} €`;

interface BarSpec {
  key: string;
  nameKey: string;
  scenarioKey?: string;
  fill: string;
}

const NET_BARS: Record<Scenario, BarSpec[]> = {
  con: [
    { key: "selfCon", nameKey: "chart.selfConsumption", fill: "#3b82f6" },
    { key: "impCon", nameKey: "chart.import", fill: "#dc2626" },
    { key: "expCon", nameKey: "chart.export", fill: "#94a3b8" },
  ],
  senza: [
    { key: "selfSen", nameKey: "chart.selfConsumption", fill: "#3b82f6" },
    { key: "impSen", nameKey: "chart.import", fill: "#dc2626" },
    { key: "expSen", nameKey: "chart.export", fill: "#94a3b8" },
  ],
  entrambi: [
    { key: "selfCon", nameKey: "chart.selfConsumption", scenarioKey: "scenario.with", fill: "#3b82f6" },
    { key: "selfSen", nameKey: "chart.selfConsumption", scenarioKey: "scenario.without", fill: "#93c5fd" },
    { key: "impCon", nameKey: "chart.import", scenarioKey: "scenario.with", fill: "#dc2626" },
    { key: "impSen", nameKey: "chart.import", scenarioKey: "scenario.without", fill: "#fca5a5" },
    { key: "expCon", nameKey: "chart.export", scenarioKey: "scenario.with", fill: "#64748b" },
    { key: "expSen", nameKey: "chart.export", scenarioKey: "scenario.without", fill: "#cbd5e1" },
  ],
};

const SCENARIOS: { key: Scenario; labelKey: string }[] = [
  { key: "con", labelKey: "scenario.withBattery" },
  { key: "senza", labelKey: "scenario.noBattery" },
  { key: "entrambi", labelKey: "scenario.both" },
];

export function MonthlyView({
  viz,
  tariff,
  hasBattery,
  hasConsumption,
}: {
  viz: Viz;
  tariff: Tariff;
  hasBattery: boolean;
  hasConsumption: boolean;
}) {
  const { t } = useT();
  const monthLabels = useMonthLabels();
  const prodToggle = useLegendToggle();
  const netToggle = useLegendToggle();
  const [scenario, setScenario] = useState<Scenario>("con");
  const effScenario: Scenario = hasBattery ? scenario : "senza";
  const np = noPvCost(viz, tariff);
  const cs = scenarioCost(viz, "senza", tariff);
  const cc = scenarioCost(viz, "con", tariff);
  // First column "senza FV" (reference); Δ = last two columns.
  const costCols = hasBattery
    ? [{ key: "novf", label: t("scenario.noPv") }, { key: "senza", label: t("scenario.noBattery") }, { key: "con", label: t("scenario.withBattery") }]
    : [{ key: "novf", label: t("scenario.noPv") }, { key: "fv", label: t("scenario.pv") }];
  const v3 = (noPvV: number, senzaV: number, conV: number): number[] =>
    hasBattery ? [noPvV, senzaV, conV] : [noPvV, senzaV];
  const costRows: MetricRow[] = [
    { key: "buy", label: t("metrics.buyCost"), info: "costo", good: "lower", money: "pay", render: eur, values: v3(np.annual.buyCost, cs.annual.buyCost, cc.annual.buyCost) },
    { key: "sell", label: t("metrics.sellRevenue"), info: "ricavo", good: "higher", money: "earn", render: eur, values: v3(np.annual.sellRevenue, cs.annual.sellRevenue, cc.annual.sellRevenue) },
    { key: "net", label: t("metrics.netCostYear"), info: "nettoCosto", good: "lower", money: "net", render: eur, values: v3(np.annual.netCost, cs.annual.netCost, cc.annual.netCost) },
  ];
  const monthlyNetRows: MetricRow[] = monthLabels.map((name, k) => ({
    key: `m${k}`,
    label: name,
    good: "lower",
    money: "net",
    render: eur,
    values: v3(np.monthly[k]?.netCost ?? 0, cs.monthly[k]?.netCost ?? 0, cc.monthly[k]?.netCost ?? 0),
  }));

  const data = viz.monthly.map((m) => ({
    name: monthLabels[m.month - 1],
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
      {hasConsumption && (
        <>
          <section className="chart-card">
            <MetricsTable
              title={hasBattery ? t("metrics.energyCostsBattery") : t("metrics.energyCostsPv")}
              columns={costCols}
              rows={costRows}
            />
          </section>

          <section className="chart-card">
            <MetricsTable title={t("monthly.netCostPerMonth")} columns={costCols} rows={monthlyNetRows} />
          </section>
        </>
      )}

      <section className="chart-card">
        <div className="section-head">
          <h3>
            {t("monthly.productionTitle")}
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
            <Bar dataKey="pratica" name={t("chart.production")} stackId="p" fill="#16a34a" hide={prodToggle.isHidden("pratica")} />
            <Bar dataKey="clipping" name={t("chart.clipping")} stackId="p" fill="#f59e0b" hide={prodToggle.isHidden("clipping")} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {!hasConsumption && <ConsumptionLockedBox />}

      {hasConsumption && (
        <section className="chart-card">
          <div className="section-head">
            <h3>
              {t("monthly.selfConsumptionGridTitle")}
              <InfoTip k="autoconsumo" />
            </h3>
            {hasBattery && (
              <span className="seg">
                {SCENARIOS.map((s) => (
                  <button key={s.key} className={scenario === s.key ? "active" : ""} onClick={() => setScenario(s.key)}>
                    {t(s.labelKey)}
                  </button>
                ))}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
              <Legend onClick={netToggle.onClick} wrapperStyle={{ cursor: "pointer" }} />
              {NET_BARS[effScenario].map((b) => (
                <Bar
                  key={b.key}
                  dataKey={b.key}
                  name={
                    b.scenarioKey === undefined
                      ? t(b.nameKey)
                      : t("monthly.seriesScenario", { metric: t(b.nameKey), scenario: t(b.scenarioKey) })
                  }
                  fill={b.fill}
                  hide={netToggle.isHidden(b.key)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
