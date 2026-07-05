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
            <span className="k">senza</span>
            <span>{senza}</span>
          </div>
          <div className="row">
            <span className="k">con</span>
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
}: {
  viz: Viz;
  tariff: Tariff;
  incentive: Incentive;
  hasBattery: boolean;
}) {
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
  const paybackText = payback === null ? "oltre 40 anni" : `${payback.toFixed(1)} anni`;

  // First column is always "senza FV" (reference); Δ = last two columns:
  // battery effect (con vs senza) when there is a battery, else FV vs senza FV.
  const costCols = hasBattery
    ? [{ key: "novf", label: "senza FV" }, { key: "senza", label: "senza batteria" }, { key: "con", label: "con batteria" }]
    : [{ key: "novf", label: "senza FV" }, { key: "fv", label: "FV" }];
  const v3 = (noPvV: number, senzaV: number, conV: number): number[] =>
    hasBattery ? [noPvV, senzaV, conV] : [noPvV, senzaV];
  const costRows: MetricRow[] = [
    { key: "buy", label: "Spesa acquisto", info: "costo", good: "lower", money: "pay", render: eur, values: v3(np.annual.buyCost, cs.annual.buyCost, cc.annual.buyCost) },
    { key: "sell", label: "Ricavo vendita", info: "ricavo", good: "higher", money: "earn", render: eur, values: v3(np.annual.sellRevenue, cs.annual.sellRevenue, cc.annual.sellRevenue) },
    { key: "net", label: "Costo netto/anno", info: "nettoCosto", good: "lower", money: "net", render: eur, values: v3(np.annual.netCost, cs.annual.netCost, cc.annual.netCost) },
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
          con={hasBattery ? pct(wb.selfConsumptionRate) : undefined}
        />
        <KpiCard
          label="Autosufficienza"
          info="autosufficienza"
          senza={pct(nb.selfSufficiency)}
          con={hasBattery ? pct(wb.selfSufficiency) : undefined}
          highlight={`+${d.selfSufficiencyPoints.toFixed(1)} punti`}
        />
        <KpiCard
          label="Import da rete"
          info="import"
          senza={`${fmt(nb.importKwh)} kWh`}
          con={hasBattery ? `${fmt(wb.importKwh)} kWh` : undefined}
          highlight={`−${fmt(d.importReductionKwh)} kWh`}
        />
        <KpiCard
          label="Export in rete"
          info="export"
          senza={`${fmt(nb.exportKwh)} kWh`}
          con={hasBattery ? `${fmt(wb.exportKwh)} kWh` : undefined}
        />
        {hasBattery && (
          <KpiCard label="Cicli batteria/anno" info="cicli" senza="—" con={fmt(wb.battery.equivalentCycles)} />
        )}
        {hasBattery && (
          <KpiCard
            label="Perdita round-trip"
            info="roundTripLoss"
            senza="—"
            con={`${fmt(wb.battery.roundTripLossKwh)} kWh`}
          />
        )}
        {hasBattery && wb.battery.recoveredClipKwh > 0 && (
          <KpiCard
            label="Clipping recuperato"
            info="clippingRecuperato"
            senza="—"
            con={`${fmt(wb.battery.recoveredClipKwh)} kWh`}
          />
        )}
      </section>

      <section className="chart-card">
        <MetricsTable
          title={hasBattery ? "Costi energia (Δ = effetto batteria)" : "Costi energia (Δ = FV vs senza FV)"}
          columns={costCols}
          rows={costRows}
        />
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
        <h3>{hasBattery ? "Energia: senza vs con batteria" : "Energia (FV)"}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" />
            <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
            <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />
            <Bar dataKey="senza" name={hasBattery ? "senza batteria" : "FV"} fill="#94a3b8" hide={isHidden("senza")} />
            {hasBattery && <Bar dataKey="con" name="con batteria" fill="#3b82f6" hide={isHidden("con")} />}
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
