import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Viz } from "../types.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import { fmt, pct } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";
import { noPvCost, scenarioCost } from "../lib/viewCosts.ts";
import { type Incentive, incentiveTotalEur, systemPaybackYears } from "../lib/economics.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { InfoTip } from "./InfoTip.tsx";
import { ConsumptionLockedBox } from "./ConsumptionLockedBox.tsx";
import { useT } from "../i18n/useT.tsx";

const eur = (v: number): string => `${fmt(v, 2)} €`;

function KpiCard({
  label,
  senza,
  con,
  highlight,
  info,
}: {
  label: string;
  senza: string;
  con?: string;
  highlight?: string;
  info?: string;
}) {
  const { t } = useT();
  const single = con === undefined;
  return (
    <div className="card kpi">
      <h3>
        {label}
        {info !== undefined && <InfoTip k={info} />}
      </h3>
      {single ? (
        <div className="row">
          <span>{senza}</span>
        </div>
      ) : (
        <>
          <div className="row">
            <span className="k">{t("scenario.without")}</span>
            <span>{senza}</span>
          </div>
          <div className="row">
            <span className="k">{t("scenario.with")}</span>
            <span>{con}</span>
          </div>
        </>
      )}
      {highlight !== undefined && !single && <div className="highlight">{highlight}</div>}
    </div>
  );
}

export function AnnualOverview({
  viz,
  tariff,
  incentive,
  hasBattery,
  hasConsumption,
}: {
  viz: Viz;
  tariff: Tariff;
  incentive: Incentive;
  hasBattery: boolean;
  hasConsumption: boolean;
}) {
  const { t } = useT();
  const { onClick, isHidden } = useLegendToggle();
  const p = viz.annual.production;
  const nb = viz.annual.noBattery;
  const wb = viz.annual.withBattery;
  const d = viz.annual.delta;
  const np = noPvCost(viz, tariff);
  const cs = scenarioCost(viz, "senza", tariff);
  const cc = scenarioCost(viz, "con", tariff);
  const capex = viz.meta.installationCostEur;
  const payback = systemPaybackYears(capex, cc.annual.netCost, np.annual.netCost, incentive);
  const paybackText = payback === null ? t("annual.paybackOver") : t("common.years", { n: payback.toFixed(1) });

  // First column is always "senza FV" (reference); Δ = last two columns:
  // battery effect (con vs senza) when there is a battery, else FV vs senza FV.
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

  const barData = [
    { metric: t("chart.selfConsumption"), senza: nb.selfConsumedKwh, con: wb.selfConsumedKwh },
    { metric: t("chart.import"), senza: nb.importKwh, con: wb.importKwh },
    { metric: t("chart.export"), senza: nb.exportKwh, con: wb.exportKwh },
  ];

  return (
    <div>
      <section className="cards">
        <div className="card">
          <h3>
            {t("annual.productionYear", { year: viz.meta.year })}
            <InfoTip k="produzione" />
          </h3>
          <p className="big">{fmt(p.practicalKwh)} kWh</p>
          <p className="muted">
            {t("annual.prodDetail", {
              theo: fmt(p.theoreticalKwh),
              clip: fmt(p.clippingLossKwh),
              clipPct: pct(p.clippingPct / 100),
              hours: p.clippedHours,
            })}
            <InfoTip k="clipping" />
            {t("annual.prodPeak", { peak: p.peakKw.toFixed(1) })}
            <InfoTip k="picco" />
          </p>
          <p className="muted">
            {t("annual.multiyearAvg", { kwh: fmt(p.multiyearKwh) })}
            <InfoTip k="multiyear" />
          </p>
        </div>
      </section>

      {!hasConsumption && <ConsumptionLockedBox />}

      {hasConsumption && (
        <>
      <section className="cards">
        <KpiCard
          label={t("metrics.selfConsumptionRate")}
          info="tassoAutoconsumo"
          senza={pct(nb.selfConsumptionRate)}
          con={hasBattery ? pct(wb.selfConsumptionRate) : undefined}
        />
        <KpiCard
          label={t("metrics.selfSufficiency")}
          info="autosufficienza"
          senza={pct(nb.selfSufficiency)}
          con={hasBattery ? pct(wb.selfSufficiency) : undefined}
          highlight={t("annual.pointsPlus", { points: d.selfSufficiencyPoints.toFixed(1) })}
        />
        <KpiCard
          label={t("metrics.importGrid")}
          info="import"
          senza={`${fmt(nb.importKwh)} kWh`}
          con={hasBattery ? `${fmt(wb.importKwh)} kWh` : undefined}
          highlight={`−${fmt(d.importReductionKwh)} kWh`}
        />
        <KpiCard
          label={t("metrics.exportGrid")}
          info="export"
          senza={`${fmt(nb.exportKwh)} kWh`}
          con={hasBattery ? `${fmt(wb.exportKwh)} kWh` : undefined}
        />
        {hasBattery && (
          <KpiCard label={t("metrics.cyclesYear")} info="cicli" senza="—" con={fmt(wb.battery.equivalentCycles)} />
        )}
        {hasBattery && (
          <KpiCard
            label={t("metrics.roundTripLoss")}
            info="roundTripLoss"
            senza="—"
            con={`${fmt(wb.battery.roundTripLossKwh)} kWh`}
          />
        )}
        {hasBattery && wb.battery.recoveredClipKwh > 0 && (
          <KpiCard
            label={t("metrics.clippingRecovered")}
            info="clippingRecuperato"
            senza="—"
            con={`${fmt(wb.battery.recoveredClipKwh)} kWh`}
          />
        )}
      </section>

      <section className="chart-card">
        <MetricsTable
          title={hasBattery ? t("metrics.energyCostsBattery") : t("metrics.energyCostsPv")}
          columns={costCols}
          rows={costRows}
        />
      </section>

      <section className="cards">
        <div className="card">
          <h3>
            {t("metrics.payback")}<InfoTip k="payback" />
          </h3>
          <p className="big">{paybackText}</p>
          <p className="muted">
            {t("annual.paybackDetail", { capex: fmt(capex), incentive: fmt(incentiveTotalEur(incentive, capex)) })}
          </p>
        </div>
      </section>

      <section className="chart-card">
        <h3>{hasBattery ? t("annual.energyChartBattery") : t("annual.energyChartPv")}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" />
            <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
            <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />
            <Bar dataKey="senza" name={hasBattery ? t("scenario.noBattery") : t("scenario.pv")} fill="#94a3b8" hide={isHidden("senza")} />
            {hasBattery && <Bar dataKey="con" name={t("scenario.withBattery")} fill="#3b82f6" hide={isHidden("con")} />}
          </BarChart>
        </ResponsiveContainer>
      </section>
        </>
      )}
    </div>
  );
}
