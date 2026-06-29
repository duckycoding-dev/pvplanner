import { useMemo } from "react";
import type { Viz } from "../types.ts";
import type { CostResult, Tariff } from "../../../src/core/economics/tariff.ts";
import type { SystemResult } from "../../../src/core/comparison/computeSystem.ts";
import {
  batteryUsableKwh,
  equalsSystems,
  noPvConfig,
  type SystemConfigB,
  totalPeakKwp,
} from "../lib/systemConfig.ts";
import { runSystem } from "../lib/runSystem.ts";
import { systemCost } from "../lib/viewCosts.ts";
import { type Incentive, systemPaybackYears } from "../lib/economics.ts";
import { fmt, pct } from "../lib/format.ts";
import { type Good, type Money } from "../lib/metricsTable.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { CompareDayChart } from "./CompareDayChart.tsx";
import { CompareAnnualBars, CompareMonthlyBars } from "./CompareBars.tsx";
import { type CashSystem, CashflowSection } from "./CashflowSection.tsx";

const kwh = (v: number): string => `${fmt(v)} kWh`;
const eur = (v: number): string => `${fmt(v, 2)} €`;
const cyc = (v: number): string => (v > 0 ? fmt(v) : "—");

interface Case {
  r: SystemResult;
  c: CostResult;
}

interface RowDef {
  key: string;
  label: string;
  info?: string;
  good: Good;
  money?: Money;
  render: (v: number) => string;
  get: (s: Case) => number;
}

const DEFS: RowDef[] = [
  { key: "prod", label: "Produzione pratica", info: "produzione", good: "higher", render: kwh, get: (s) => s.r.production.annual.practicalKwh },
  { key: "clip", label: "Clipping", info: "clipping", good: "lower", render: kwh, get: (s) => s.r.production.annual.clippingLossKwh },
  { key: "self", label: "Autoconsumo", info: "autoconsumo", good: "higher", render: kwh, get: (s) => s.r.metrics.selfConsumedKwh },
  { key: "rate", label: "Tasso autoconsumo", info: "tassoAutoconsumo", good: "higher", render: pct, get: (s) => s.r.metrics.selfConsumptionRate },
  { key: "suff", label: "Autosufficienza", info: "autosufficienza", good: "higher", render: pct, get: (s) => s.r.metrics.selfSufficiency },
  { key: "imp", label: "Import da rete", info: "import", good: "lower", render: kwh, get: (s) => s.r.metrics.importKwh },
  { key: "exp", label: "Export in rete", info: "export", good: "higher", render: kwh, get: (s) => s.r.metrics.exportKwh },
  { key: "cyc", label: "Cicli batteria/anno", info: "cicli", good: "none", render: cyc, get: (s) => s.r.metrics.battery?.equivalentCycles ?? 0 },
  { key: "loss", label: "Perdita round-trip", info: "roundTripLoss", good: "lower", render: kwh, get: (s) => s.r.metrics.battery?.roundTripLossKwh ?? 0 },
  { key: "buy", label: "Spesa acquisto", info: "costo", good: "lower", money: "pay", render: eur, get: (s) => s.c.annual.buyCost },
  { key: "sell", label: "Ricavo vendita", info: "ricavo", good: "higher", money: "earn", render: eur, get: (s) => s.c.annual.sellRevenue },
  { key: "net", label: "Costo netto/anno", info: "nettoCosto", good: "lower", money: "net", render: eur, get: (s) => s.c.annual.netCost },
];

export function ComparePage({
  viz,
  systemA,
  systemB,
  tariff,
  incentive,
}: {
  viz: Viz;
  systemA: SystemConfigB;
  systemB: SystemConfigB;
  tariff: Tariff;
  incentive: Incentive;
}) {
  const bDiffers = useMemo(() => !equalsSystems(systemA, systemB), [systemA, systemB]);

  const noPv = useMemo<Case>(() => {
    const r = runSystem(noPvConfig(viz), viz);
    return { r, c: systemCost(viz, r, tariff) };
  }, [viz, tariff]);
  const caseA = useMemo<Case>(() => {
    const r = runSystem(systemA, viz);
    return { r, c: systemCost(viz, r, tariff) };
  }, [systemA, viz, tariff]);
  const caseB = useMemo<Case>(() => {
    const r = runSystem(systemB, viz);
    return { r, c: systemCost(viz, r, tariff) };
  }, [systemB, viz, tariff]);

  // Table: "senza FV" reference + A, plus B when it differs from A. Charts compare A vs B only.
  const labelA = systemA.label.length > 0 ? systemA.label : "A";
  const labelB = systemB.label.length > 0 ? systemB.label : "B";
  const cases: Case[] = bDiffers ? [noPv, caseA, caseB] : [noPv, caseA];
  const columns = bDiffers
    ? [{ key: "novf", label: "senza FV" }, { key: "a", label: labelA }, { key: "b", label: labelB }]
    : [{ key: "novf", label: "senza FV" }, { key: "a", label: labelA }];
  const rows: MetricRow[] = DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    ...(d.info === undefined ? {} : { info: d.info }),
    good: d.good,
    ...(d.money === undefined ? {} : { money: d.money }),
    render: d.render,
    values: cases.map(d.get),
  }));

  // Payback row: vs "senza FV"; the reference column itself has no CAPEX → "—".
  const capexByCase = (bDiffers ? [0, systemA.installationCostEur, systemB.installationCostEur] : [0, systemA.installationCostEur]);
  const noPvNet = noPv.c.annual.netCost;

  // Selectable systems for the cashflow section (A, B, senza FV).
  const cashSystems: CashSystem[] = [
    { id: "a", label: labelA, capex: systemA.installationCostEur, buy: caseA.c.annual.buyCost, sell: caseA.c.annual.sellRevenue, net: caseA.c.annual.netCost },
    { id: "b", label: labelB, capex: systemB.installationCostEur, buy: caseB.c.annual.buyCost, sell: caseB.c.annual.sellRevenue, net: caseB.c.annual.netCost },
    { id: "novf", label: "senza FV", capex: 0, buy: noPv.c.annual.buyCost, sell: noPv.c.annual.sellRevenue, net: noPvNet },
  ];

  rows.push({
    key: "pay",
    label: "Tempo di rientro",
    info: "payback",
    good: "lower",
    render: (v) => (Number.isFinite(v) ? `${v.toFixed(1)} anni` : "—"),
    values: cases.map((s, i) => {
      const capex = capexByCase[i] ?? 0;
      if (capex <= 0) return Infinity;
      const p = systemPaybackYears(capex, s.c.annual.netCost, noPvNet, incentive);
      return p === null ? Infinity : p;
    }),
  });

  return (
    <div className="compare-page">
      <p className="note">
        Tabella: <b>senza FV</b> (riferimento) · <b>{labelA}</b>
        {bDiffers ? <> · <b>{labelB}</b></> : null}. Grafici: A vs B.{" "}
        {bDiffers ? "" : "Modifica il Sistema B nel menu per confrontarlo con A."} {labelA}:{" "}
        {totalPeakKwp(systemA).toFixed(2)} kWp · batteria {batteryUsableKwh(systemA).toFixed(2)} kWh — {labelB}:{" "}
        {totalPeakKwp(systemB).toFixed(2)} kWp · batteria {batteryUsableKwh(systemB).toFixed(2)} kWh.
      </p>

      <section className="chart-card">
        <MetricsTable title="Indicatori annui" columns={columns} rows={rows} />
      </section>

      <CompareDayChart
        a={caseA.r}
        b={caseB.r}
        viz={viz}
        labelA={labelA}
        labelB={labelB}
        usableA={batteryUsableKwh(systemA)}
        usableB={batteryUsableKwh(systemB)}
      />
      <CompareMonthlyBars a={caseA.r} b={caseB.r} labelA={labelA} labelB={labelB} />
      <CompareAnnualBars a={caseA.r} b={caseB.r} labelA={labelA} labelB={labelB} />

      <CashflowSection
        systems={cashSystems}
        noPv={{ net: noPv.c.annual.netCost, buy: noPv.c.annual.buyCost, sell: noPv.c.annual.sellRevenue }}
        incentive={incentive}
        defaultSecond={bDiffers ? "b" : "novf"}
      />
    </div>
  );
}
