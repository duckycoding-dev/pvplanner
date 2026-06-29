import { type ChangeEvent, useMemo, useState } from "react";
import type { Scenario, Viz } from "../types.ts";
import { priceForHour, type Tariff } from "../../../src/core/economics/tariff.ts";
import { type DayPoint, dayCount, sliceDay } from "../lib/sliceDay.ts";
import { quickPickDays } from "../lib/quickPickDays.ts";
import { dayIndexToDateInput, fmt, formatDayLabel } from "../lib/format.ts";
import { PowerChart } from "./PowerChart.tsx";
import { BatteryChart } from "./BatteryChart.tsx";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { InfoTip } from "./InfoTip.tsx";

const DAY_COLS = [
  { key: "senza", label: "senza batteria" },
  { key: "con", label: "con batteria" },
];

const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: "con", label: "con batteria" },
  { key: "senza", label: "senza batteria" },
  { key: "entrambi", label: "entrambi" },
];

const DAY_MS = 86_400_000;

export function DailyExplorer({ viz, tariff }: { viz: Viz; tariff: Tariff }) {
  const h = viz.hourly;
  const total = dayCount(h);
  const picks = useMemo(() => quickPickDays(h), [h]);
  const [dayIndex, setDayIndex] = useState<number>(picks.maxClipping);
  const [scenario, setScenario] = useState<Scenario>("con");

  const pts = useMemo(() => sliceDay(h, dayIndex), [h, dayIndex]);
  const firstTs = h.timestampsUtc[0] ?? 0;
  const ts = h.timestampsUtc[dayIndex * 24] ?? firstTs;
  const lastTs = h.timestampsUtc[(total - 1) * 24] ?? firstTs;

  const onDate = (e: ChangeEvent<HTMLInputElement>) => {
    const ms = Date.parse(`${e.target.value}T00:00:00Z`);
    if (!Number.isNaN(ms)) {
      const idx = Math.round((ms - firstTs) / DAY_MS);
      if (idx >= 0 && idx < total) setDayIndex(idx);
    }
  };

  const isNb = scenario === "senza";
  const sum = (f: (p: DayPoint) => number): number => pts.reduce((s, p) => s + f(p), 0);
  const prod = sum((p) => p.prodPractical);
  const cons = sum((p) => p.load);
  const clip = sum((p) => p.clipping);
  const selfSenza = sum((p) => p.nbSelf);
  const selfCon = sum((p) => p.wbSelf);
  const impSenza = sum((p) => p.nbImport);
  const impCon = sum((p) => p.wbImport);
  const expSenza = sum((p) => p.nbExport);
  const expCon = sum((p) => p.wbExport);
  const cycCon = sum((p) => p.discharge) / (viz.meta.batteryUsableKwh || 1);

  const dayStart = dayIndex * 24;
  let netSenza = 0;
  let netCon = 0;
  for (let i = 0; i < 24; i++) {
    const j = dayStart + i;
    const price = priceForHour(tariff, h.localHour[j] ?? 0, h.weekday[j] ?? 0);
    netSenza += (h.nb.importKwh[j] ?? 0) * price - (h.nb.exportKwh[j] ?? 0) * tariff.sellPrice;
    netCon += (h.wb.importKwh[j] ?? 0) * price - (h.wb.exportKwh[j] ?? 0) * tariff.sellPrice;
  }

  const kwh1 = (v: number): string => `${fmt(v, 1)} kWh`;
  const eur = (v: number): string => `${fmt(v, 2)} €`;
  const dayRows: MetricRow[] = [
    { key: "prod", label: "Produzione", info: "produzione", good: "higher", render: kwh1, values: [prod, prod] },
    { key: "cons", label: "Consumo", info: "consumo", good: "none", render: kwh1, values: [cons, cons] },
    { key: "self", label: "Autoconsumo", info: "autoconsumo", good: "higher", render: kwh1, values: [selfSenza, selfCon] },
    { key: "imp", label: "Import", info: "import", good: "lower", render: kwh1, values: [impSenza, impCon] },
    { key: "exp", label: "Export", info: "export", good: "higher", render: kwh1, values: [expSenza, expCon] },
    { key: "clip", label: "Clipping", info: "clipping", good: "lower", render: kwh1, values: [clip, clip] },
    { key: "cyc", label: "Cicli", info: "cicli", good: "none", render: (v) => (v > 0 ? v.toFixed(2) : "—"), values: [0, cycCon] },
    { key: "net", label: "Netto giorno", info: "nettoCosto", good: "lower", money: "net", render: eur, values: [netSenza, netCon] },
  ];

  return (
    <div>
      <div className="day-toolbar">
        <div className="day-nav">
          <button onClick={() => setDayIndex(Math.max(0, dayIndex - 1))}>‹</button>
          <input
            type="date"
            value={dayIndexToDateInput(ts)}
            min={dayIndexToDateInput(firstTs)}
            max={dayIndexToDateInput(lastTs)}
            onChange={onDate}
          />
          <button onClick={() => setDayIndex(Math.min(total - 1, dayIndex + 1))}>›</button>
          <strong className="day-label">{formatDayLabel(ts)}</strong>
        </div>
        <div className="picks">
          <button onClick={() => setDayIndex(picks.maxClipping)}>max clipping</button>
          <button onClick={() => setDayIndex(picks.maxProduction)}>max produzione</button>
          <button onClick={() => setDayIndex(picks.minProduction)}>min produzione</button>
        </div>
        <div className="scenario">
          {SCENARIOS.map((s) => (
            <button key={s.key} className={scenario === s.key ? "active" : ""} onClick={() => setScenario(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <section className="chart-card">
        <MetricsTable title="Riepilogo giorno (Δ = effetto batteria)" columns={DAY_COLS} rows={dayRows} />
      </section>

      <div className="chart-card">
        <div className="section-head">
          <h3>
            Potenza oraria (kW)
            <InfoTip k="coperto" />
          </h3>
        </div>
        <PowerChart data={pts} scenario={scenario} acCapKw={viz.meta.acCapKw} />
      </div>

      {!isNb ? (
        <div className="chart-card">
          <div className="section-head">
            <h3>
              Stato di carica batteria (kWh)
              <InfoTip k="soc" />
            </h3>
          </div>
          <BatteryChart data={pts} usableKwh={viz.meta.batteryUsableKwh} />
        </div>
      ) : (
        <p className="note">Scenario «senza batteria»: nessun accumulo.</p>
      )}
    </div>
  );
}
