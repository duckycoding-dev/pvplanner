import { useMemo } from "react";
import type { Viz } from "../types.ts";
import type { Tariff } from "../../../src/core/economics/tariff.ts";
import { type SystemConfigB, batteryUsableKwh, cloneFromBaseline, totalPeakKwp } from "../lib/systemConfig.ts";
import { runSystem } from "../lib/runSystem.ts";
import { systemCost } from "../lib/viewCosts.ts";
import { KpiTable } from "./KpiTable.tsx";
import { CompareDayChart } from "./CompareDayChart.tsx";
import { CompareAnnualBars, CompareMonthlyBars } from "./CompareBars.tsx";

export function ComparePage({ viz, systemB, tariff }: { viz: Viz; systemB: SystemConfigB; tariff: Tariff }) {
  const systemA = useMemo(() => cloneFromBaseline(viz), [viz]);
  const a = useMemo(() => runSystem(systemA, viz), [systemA, viz]);
  const b = useMemo(() => runSystem(systemB, viz), [systemB, viz]);
  const costA = useMemo(() => systemCost(viz, a, tariff), [viz, a, tariff]);
  const costB = useMemo(() => systemCost(viz, b, tariff), [viz, b, tariff]);

  const labelA = "A (baseline)";
  const labelB = systemB.label.length > 0 ? systemB.label : "B";

  return (
    <div className="compare-page">
      <p className="note">
        <b>{labelA}</b>: {totalPeakKwp(systemA).toFixed(2)} kWp · batteria utile {batteryUsableKwh(systemA).toFixed(2)} kWh
        {"  —  "}
        <b>{labelB}</b>: {totalPeakKwp(systemB).toFixed(2)} kWp · batteria utile {batteryUsableKwh(systemB).toFixed(2)} kWh.
        {"  "}Consumi condivisi. Modifica B nella scheda «Configurazione».
      </p>

      <section className="chart-card">
        <h3>Indicatori annui</h3>
        <KpiTable a={a} b={b} labelA={labelA} labelB={labelB} costA={costA} costB={costB} />
      </section>

      <CompareDayChart a={a} b={b} viz={viz} labelA={labelA} labelB={labelB} />
      <CompareMonthlyBars a={a} b={b} labelA={labelA} labelB={labelB} />
      <CompareAnnualBars a={a} b={b} labelA={labelA} labelB={labelB} />
    </div>
  );
}
