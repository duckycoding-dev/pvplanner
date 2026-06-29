import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Viz } from "../types.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import { fmt, pct } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";
import { noPvCost, scenarioCost } from "../lib/viewCosts.ts";
import { type Incentive, incentiveTotalEur, systemPaybackYears } from "../lib/economics.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { InfoTip } from "./InfoTip.tsx";

const eur = (v: number): string => `${fmt(v, 2)} €`;
const COST_COLS = [
  { key: "senza", label: "senza batteria" },
  { key: "con", label: "con batteria" },
];

function KpiCard({
  label,
  senza,
  con,
  highlight,
  info,
}: {
  label: string;
  senza: string;
  con: string;
  highlight?: string;
  info?: string;
}) {
  return (
    <div className="card kpi">
      <h3>
        {label}
        {info !== undefined && <InfoTip k={info} />}
      </h3>
      <div className="row">
        <span className="k">senza</span>
        <span>{senza}</span>
      </div>
      <div className="row">
        <span className="k">con</span>
        <span>{con}</span>
      </div>
      {highlight !== undefined && <div className="highlight">{highlight}</div>}
    </div>
  );
}

export function AnnualOverview({ viz, tariff, incentive }: { viz: Viz; tariff: Tariff; incentive: Incentive }) {
  const { onClick, isHidden } = useLegendToggle();
  const p = viz.annual.production;
  const nb = viz.annual.noBattery;
  const wb = viz.annual.withBattery;
  const d = viz.annual.delta;
  const cs = scenarioCost(viz, "senza", tariff);
  const cc = scenarioCost(viz, "con", tariff);
  const capex = viz.meta.installationCostEur;
  const payback = systemPaybackYears(capex, cc.annual.netCost, noPvCost(viz, tariff).annual.netCost, incentive);
  const paybackText = payback === null ? "oltre 40 anni" : `${payback.toFixed(1)} anni`;
  const costRows: MetricRow[] = [
    { key: "buy", label: "Spesa acquisto", info: "costo", good: "lower", money: "pay", render: eur, values: [cs.annual.buyCost, cc.annual.buyCost] },
    { key: "sell", label: "Ricavo vendita", info: "ricavo", good: "higher", money: "earn", render: eur, values: [cs.annual.sellRevenue, cc.annual.sellRevenue] },
    { key: "net", label: "Costo netto/anno", info: "nettoCosto", good: "lower", money: "net", render: eur, values: [cs.annual.netCost, cc.annual.netCost] },
  ];

  const barData = [
    { metric: "autoconsumo", senza: nb.selfConsumedKwh, con: wb.selfConsumedKwh },
    { metric: "import", senza: nb.importKwh, con: wb.importKwh },
    { metric: "export", senza: nb.exportKwh, con: wb.exportKwh },
  ];

  return (
    <div>
      <section className="cards">
        <div className="card">
          <h3>
            Produzione {viz.meta.year}
            <InfoTip k="produzione" />
          </h3>
          <p className="big">{fmt(p.practicalKwh)} kWh</p>
          <p className="muted">
            teorica {fmt(p.theoreticalKwh)} · clipping {fmt(p.clippingLossKwh)} ({pct(p.clippingPct / 100)}),{" "}
            {p.clippedHours} h<InfoTip k="clipping" /> · picco {p.peakKw.toFixed(1)} kW<InfoTip k="picco" />
          </p>
          <p className="muted">
            media 2005–2023: {fmt(p.multiyearKwh)} kWh<InfoTip k="multiyear" />
          </p>
        </div>
      </section>

      <section className="cards">
        <KpiCard
          label="Tasso autoconsumo"
          info="tassoAutoconsumo"
          senza={pct(nb.selfConsumptionRate)}
          con={pct(wb.selfConsumptionRate)}
        />
        <KpiCard
          label="Autosufficienza"
          info="autosufficienza"
          senza={pct(nb.selfSufficiency)}
          con={pct(wb.selfSufficiency)}
          highlight={`+${d.selfSufficiencyPoints.toFixed(1)} punti`}
        />
        <KpiCard
          label="Import da rete"
          info="import"
          senza={`${fmt(nb.importKwh)} kWh`}
          con={`${fmt(wb.importKwh)} kWh`}
          highlight={`−${fmt(d.importReductionKwh)} kWh`}
        />
        <KpiCard
          label="Export in rete"
          info="export"
          senza={`${fmt(nb.exportKwh)} kWh`}
          con={`${fmt(wb.exportKwh)} kWh`}
        />
        <KpiCard label="Cicli batteria/anno" info="cicli" senza="—" con={fmt(wb.battery.equivalentCycles)} />
        <KpiCard
          label="Perdita round-trip"
          info="roundTripLoss"
          senza="—"
          con={`${fmt(wb.battery.roundTripLossKwh)} kWh`}
        />
      </section>

      <section className="chart-card">
        <MetricsTable title="Costi energia (Δ = effetto batteria)" columns={COST_COLS} rows={costRows} />
      </section>

      <section className="cards">
        <div className="card">
          <h3>
            Tempo di rientro<InfoTip k="payback" />
          </h3>
          <p className="big">{paybackText}</p>
          <p className="muted">
            CAPEX {fmt(capex)} € · incentivo {fmt(incentiveTotalEur(incentive, capex))} € · vs «senza FV»
          </p>
        </div>
      </section>

      <section className="chart-card">
        <h3>Energia: senza vs con batteria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" />
            <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
            <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />
            <Bar dataKey="senza" name="senza batteria" fill="#94a3b8" hide={isHidden("senza")} />
            <Bar dataKey="con" name="con batteria" fill="#3b82f6" hide={isHidden("con")} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
