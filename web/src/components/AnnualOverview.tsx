import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Viz } from "../types.ts";
import { fmt, pct } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";

function KpiCard({ label, senza, con, highlight }: { label: string; senza: string; con: string; highlight?: string }) {
  return (
    <div className="card kpi">
      <h3>{label}</h3>
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

export function AnnualOverview({ viz }: { viz: Viz }) {
  const { onClick, isHidden } = useLegendToggle();
  const p = viz.annual.production;
  const nb = viz.annual.noBattery;
  const wb = viz.annual.withBattery;
  const d = viz.annual.delta;

  const barData = [
    { metric: "autoconsumo", senza: nb.selfConsumedKwh, con: wb.selfConsumedKwh },
    { metric: "import", senza: nb.importKwh, con: wb.importKwh },
    { metric: "export", senza: nb.exportKwh, con: wb.exportKwh },
  ];

  return (
    <div>
      <section className="cards">
        <div className="card">
          <h3>Produzione {viz.meta.year}</h3>
          <p className="big">{fmt(p.practicalKwh)} kWh</p>
          <p className="muted">
            teorica {fmt(p.theoreticalKwh)} · clipping {fmt(p.clippingLossKwh)} ({pct(p.clippingPct / 100)}),{" "}
            {p.clippedHours} h · picco {p.peakKw.toFixed(1)} kW
          </p>
          <p className="muted">media 2005–2023: {fmt(p.multiyearKwh)} kWh</p>
        </div>
      </section>

      <section className="cards">
        <KpiCard label="Tasso autoconsumo" senza={pct(nb.selfConsumptionRate)} con={pct(wb.selfConsumptionRate)} />
        <KpiCard
          label="Autosufficienza"
          senza={pct(nb.selfSufficiency)}
          con={pct(wb.selfSufficiency)}
          highlight={`+${d.selfSufficiencyPoints.toFixed(1)} punti`}
        />
        <KpiCard
          label="Import da rete"
          senza={`${fmt(nb.importKwh)} kWh`}
          con={`${fmt(wb.importKwh)} kWh`}
          highlight={`−${fmt(d.importReductionKwh)} kWh`}
        />
        <KpiCard label="Export in rete" senza={`${fmt(nb.exportKwh)} kWh`} con={`${fmt(wb.exportKwh)} kWh`} />
        <KpiCard label="Cicli batteria/anno" senza="—" con={fmt(wb.battery.equivalentCycles)} />
        <KpiCard label="Perdita round-trip" senza="—" con={`${fmt(wb.battery.roundTripLossKwh)} kWh`} />
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
