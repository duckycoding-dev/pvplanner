import { useMemo } from "react";
import type { Viz } from "../types.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import {
  batteryUsableKwh,
  cloneFromBaseline,
  equalsBaseline,
  noPvConfig,
  type SystemConfigB,
  totalPeakKwp,
} from "../lib/systemConfig.ts";
import { runSystem } from "../lib/runSystem.ts";
import { systemCost } from "../lib/viewCosts.ts";
import { fmt, pct } from "../lib/format.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { CompareDayChart } from "./CompareDayChart.tsx";
import { CompareAnnualBars, CompareMonthlyBars } from "./CompareBars.tsx";

const kwh = (v: number): string => `${fmt(v)} kWh`;
const eur = (v: number): string => `${fmt(v, 2)} €`;
const cyc = (v: number): string => (v > 0 ? fmt(v) : "—");

export function ComparePage({ viz, systemB, tariff }: { viz: Viz; systemB: SystemConfigB; tariff: Tariff }) {
  const systemA = useMemo(() => cloneFromBaseline(viz), [viz]);
  // Two columns: A vs B once B has been edited; otherwise "senza FV" vs A.
  const bDiffers = useMemo(() => !equalsBaseline(systemB, viz), [systemB, viz]);
  const cfg1 = useMemo(() => (bDiffers ? systemA : noPvConfig(viz)), [bDiffers, systemA, viz]);
  const cfg2 = useMemo(() => (bDiffers ? systemB : systemA), [bDiffers, systemB, systemA]);
  const label1 = bDiffers ? "A (baseline)" : "senza FV";
  const label2 = bDiffers ? (systemB.label.length > 0 ? systemB.label : "B") : "A (baseline)";

  const r1 = useMemo(() => runSystem(cfg1, viz), [cfg1, viz]);
  const r2 = useMemo(() => runSystem(cfg2, viz), [cfg2, viz]);
  const c1 = useMemo(() => systemCost(viz, r1, tariff), [viz, r1, tariff]);
  const c2 = useMemo(() => systemCost(viz, r2, tariff), [viz, r2, tariff]);

  const rows: MetricRow[] = [
    { key: "prod", label: "Produzione pratica", info: "produzione", good: "higher", render: kwh, values: [r1.production.annual.practicalKwh, r2.production.annual.practicalKwh] },
    { key: "clip", label: "Clipping", info: "clipping", good: "lower", render: kwh, values: [r1.production.annual.clippingLossKwh, r2.production.annual.clippingLossKwh] },
    { key: "self", label: "Autoconsumo", info: "autoconsumo", good: "higher", render: kwh, values: [r1.metrics.selfConsumedKwh, r2.metrics.selfConsumedKwh] },
    { key: "rate", label: "Tasso autoconsumo", info: "tassoAutoconsumo", good: "higher", render: pct, values: [r1.metrics.selfConsumptionRate, r2.metrics.selfConsumptionRate] },
    { key: "suff", label: "Autosufficienza", info: "autosufficienza", good: "higher", render: pct, values: [r1.metrics.selfSufficiency, r2.metrics.selfSufficiency] },
    { key: "imp", label: "Import da rete", info: "import", good: "lower", render: kwh, values: [r1.metrics.importKwh, r2.metrics.importKwh] },
    { key: "exp", label: "Export in rete", info: "export", good: "higher", render: kwh, values: [r1.metrics.exportKwh, r2.metrics.exportKwh] },
    { key: "cyc", label: "Cicli batteria/anno", info: "cicli", good: "none", render: cyc, values: [r1.metrics.battery?.equivalentCycles ?? 0, r2.metrics.battery?.equivalentCycles ?? 0] },
    { key: "buy", label: "Spesa acquisto", info: "costo", good: "lower", money: "pay", render: eur, values: [c1.annual.buyCost, c2.annual.buyCost] },
    { key: "sell", label: "Ricavo vendita", info: "ricavo", good: "higher", money: "earn", render: eur, values: [c1.annual.sellRevenue, c2.annual.sellRevenue] },
    { key: "net", label: "Costo netto/anno", info: "nettoCosto", good: "lower", money: "net", render: eur, values: [c1.annual.netCost, c2.annual.netCost] },
  ];

  return (
    <div className="compare-page">
      <p className="note">
        <b>{label1}</b>: {totalPeakKwp(cfg1).toFixed(2)} kWp · batteria utile {batteryUsableKwh(cfg1).toFixed(2)} kWh
        {"  —  "}
        <b>{label2}</b>: {totalPeakKwp(cfg2).toFixed(2)} kWp · batteria utile {batteryUsableKwh(cfg2).toFixed(2)} kWh.
        {"  "}
        {bDiffers ? "Modifica B nella sidebar." : "Modifica il Sistema B nella sidebar per confrontarlo con A."}
      </p>

      <section className="chart-card">
        <MetricsTable
          title="Indicatori annui"
          columns={[{ key: "c1", label: label1 }, { key: "c2", label: label2 }]}
          rows={rows}
        />
      </section>

      <CompareDayChart a={r1} b={r2} viz={viz} labelA={label1} labelB={label2} />
      <CompareMonthlyBars a={r1} b={r2} labelA={label1} labelB={label2} />
      <CompareAnnualBars a={r1} b={r2} labelA={label1} labelB={label2} />
    </div>
  );
}
