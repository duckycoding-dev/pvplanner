import { type ChangeEvent, useMemo, useState } from "react";
import type { Scenario, Viz } from "../types.ts";
import { priceForHour, type Tariff } from "../../../src/core/economics/tariff.ts";
import { type DayPoint, dayCount, sliceDay } from "../lib/sliceDay.ts";
import { quickPickDays } from "../lib/quickPickDays.ts";
import { dayIndexToDateInput, fmt, formatDayLabel } from "../lib/format.ts";
import { PowerChart } from "./PowerChart.tsx";
import { BatteryChart } from "./BatteryChart.tsx";
import { InfoTip } from "./InfoTip.tsx";

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

  const sum = (f: (p: DayPoint) => number): number => pts.reduce((s, p) => s + f(p), 0);
  const prod = sum((p) => p.prodPractical);
  const cons = sum((p) => p.load);
  const clip = sum((p) => p.clipping);
  const isNb = scenario === "senza";
  const self = isNb ? sum((p) => p.nbSelf) : sum((p) => p.wbSelf);
  const imp = isNb ? sum((p) => p.nbImport) : sum((p) => p.wbImport);
  const exp = isNb ? sum((p) => p.nbExport) : sum((p) => p.wbExport);
  const cycles = sum((p) => p.discharge) / (viz.meta.batteryUsableKwh || 1);

  const dayStart = dayIndex * 24;
  let dayNet = 0;
  for (let i = 0; i < 24; i++) {
    const j = dayStart + i;
    const price = priceForHour(tariff, h.localHour[j] ?? 0, h.weekday[j] ?? 0);
    const dImp = isNb ? h.nb.importKwh[j] ?? 0 : h.wb.importKwh[j] ?? 0;
    const dExp = isNb ? h.nb.exportKwh[j] ?? 0 : h.wb.exportKwh[j] ?? 0;
    dayNet += dImp * price - dExp * tariff.sellPrice;
  }

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

      <div className="day-summary">
        <span>produzione<InfoTip k="produzione" /> <b>{fmt(prod, 1)}</b></span>
        <span>consumo<InfoTip k="consumo" /> <b>{fmt(cons, 1)}</b></span>
        <span>autoconsumo<InfoTip k="autoconsumo" /> <b>{fmt(self, 1)}</b></span>
        <span>import<InfoTip k="import" /> <b>{fmt(imp, 1)}</b></span>
        <span>export<InfoTip k="export" /> <b>{fmt(exp, 1)}</b></span>
        <span>clipping<InfoTip k="clipping" /> <b>{fmt(clip, 1)}</b></span>
        {!isNb && (
          <span>
            cicli<InfoTip k="cicli" /> <b>{cycles.toFixed(2)}</b>
          </span>
        )}
        <span>
          netto<InfoTip k="nettoCosto" /> <b>{fmt(dayNet, 2)} €</b>
        </span>
        <span className="unit">kWh · €</span>
      </div>

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
