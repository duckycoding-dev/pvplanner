import { type ChangeEvent, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Viz } from "../types.ts";
import type { SystemResult } from "../../../src/core/comparison/computeSystem.ts";
import { sliceCompareDay } from "../lib/sliceCompareDay.ts";
import { quickPickDays } from "../lib/quickPickDays.ts";
import { dayIndexToDateInput, fmt, formatDayLabel } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";

const DAY_MS = 86_400_000;

interface DayTotals {
  prod: number;
  clip: number;
  self: number;
  imp: number;
  exp: number;
  cha: number;
  dis: number;
}

function sumDay(arr: readonly number[], start: number): number {
  let s = 0;
  for (let i = start; i < start + 24; i++) s += arr[i] ?? 0;
  return s;
}

function dayTotals(r: SystemResult, start: number): DayTotals {
  return {
    prod: sumDay(r.production.hourly.practicalKwh, start),
    clip: sumDay(r.production.hourly.clippingLossKwh, start),
    self: sumDay(r.hourly.selfConsumedKwh, start),
    imp: sumDay(r.hourly.importKwh, start),
    exp: sumDay(r.hourly.exportKwh, start),
    cha: sumDay(r.hourly.chargeKwh, start),
    dis: sumDay(r.hourly.dischargeKwh, start),
  };
}

const kwh2 = (v: number): string => `${fmt(v, 2)} kWh`;

export function CompareDayChart({
  a,
  b,
  viz,
  labelA,
  labelB,
  usableA,
  usableB,
}: {
  a: SystemResult;
  b: SystemResult;
  viz: Viz;
  labelA: string;
  labelB: string;
  usableA: number;
  usableB: number;
}) {
  const { onClick, isHidden } = useLegendToggle();
  const soc = useLegendToggle();
  const total = Math.floor(viz.hourly.loadKwh.length / 24);
  const picks = useMemo(() => quickPickDays(viz.hourly), [viz]);
  const [dayIndex, setDayIndex] = useState<number>(picks.maxProduction);

  const pts = useMemo(() => sliceCompareDay(a, b, viz, dayIndex), [a, b, viz, dayIndex]);
  const ta = useMemo(() => dayTotals(a, dayIndex * 24), [a, dayIndex]);
  const tb = useMemo(() => dayTotals(b, dayIndex * 24), [b, dayIndex]);
  const firstTs = viz.hourly.timestampsUtc[0] ?? 0;
  const ts = viz.hourly.timestampsUtc[dayIndex * 24] ?? firstTs;
  const lastTs = viz.hourly.timestampsUtc[(total - 1) * 24] ?? firstTs;

  const onDate = (e: ChangeEvent<HTMLInputElement>): void => {
    const ms = Date.parse(`${e.target.value}T00:00:00Z`);
    if (!Number.isNaN(ms)) {
      const idx = Math.round((ms - firstTs) / DAY_MS);
      if (idx >= 0 && idx < total) setDayIndex(idx);
    }
  };

  const capMax = Math.max(usableA, usableB);
  const sameCap = usableA === usableB;
  const labelCapA = sameCap ? `max ${fmt(usableA, 1)} kWh` : `max ${labelA}`;

  const dailyCols = [
    { key: "a", label: labelA },
    { key: "b", label: labelB },
  ];
  const dailyRows: MetricRow[] = [
    { key: "prod", label: "Produzione pratica", info: "produzione", good: "higher", render: kwh2, values: [ta.prod, tb.prod] },
    { key: "clip", label: "Clipping", info: "clipping", good: "lower", render: kwh2, values: [ta.clip, tb.clip] },
    { key: "self", label: "Autoconsumo", info: "autoconsumo", good: "higher", render: kwh2, values: [ta.self, tb.self] },
    { key: "imp", label: "Import da rete", info: "import", good: "lower", render: kwh2, values: [ta.imp, tb.imp] },
    { key: "exp", label: "Export in rete", info: "export", good: "higher", render: kwh2, values: [ta.exp, tb.exp] },
    { key: "dis", label: "Scarica batteria", good: "none", render: kwh2, values: [ta.dis, tb.dis] },
    { key: "loss", label: "Perdita round-trip", info: "roundTripLoss", good: "lower", render: kwh2, values: [ta.cha - ta.dis, tb.cha - tb.dis] },
  ];

  return (
    <div className="chart-card">
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
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={pts} margin={{ top: 10, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(v) => Number(v).toFixed(2)} labelFormatter={(h) => `ore ${h}`} />
          <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />

          {/* coverage drawn first as filled areas so production/load lines sit on top */}
          <Area type="monotone" dataKey="selfA" name={`coperto ${labelA}`} stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.5} isAnimationActive={false} hide={isHidden("selfA")} />
          <Area type="monotone" dataKey="selfB" name={`coperto ${labelB}`} stroke="#3b82f6" strokeDasharray="5 3" fill="#bfdbfe" fillOpacity={0.3} isAnimationActive={false} hide={isHidden("selfB")} />
          <Line type="monotone" dataKey="load" name="consumo" stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} hide={isHidden("load")} />
          <Line type="monotone" dataKey="prodA" name={`produzione ${labelA}`} stroke="#16a34a" strokeWidth={2} dot={false} isAnimationActive={false} hide={isHidden("prodA")} />
          <Line type="monotone" dataKey="prodB" name={`produzione ${labelB}`} stroke="#16a34a" strokeDasharray="5 3" dot={false} isAnimationActive={false} hide={isHidden("prodB")} />
        </ComposedChart>
      </ResponsiveContainer>

      <h4 className="subchart-title">Stato di carica batteria (SoC)</h4>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={pts} margin={{ top: 6, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis
            domain={[0, capMax > 0 ? Math.ceil(capMax) : "auto"]}
            label={{ value: "kWh", angle: -90, position: "insideLeft" }}
          />
          <Tooltip formatter={(v) => Number(v).toFixed(2)} labelFormatter={(h) => `ore ${h}`} />
          <Legend onClick={soc.onClick} wrapperStyle={{ cursor: "pointer" }} />
          <Line type="monotone" dataKey="socA" name={`SoC ${labelA}`} stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} hide={soc.isHidden("socA")} />
          <Line type="monotone" dataKey="socB" name={`SoC ${labelB}`} stroke="#f59e0b" strokeDasharray="5 3" dot={false} isAnimationActive={false} hide={soc.isHidden("socB")} />
          {usableA > 0 && (
            <ReferenceLine
              y={usableA}
              stroke="#b45309"
              strokeDasharray="6 3"
              label={{ value: labelCapA, position: "insideTopLeft", fontSize: 11, fill: "#b45309" }}
            />
          )}
          {usableB > 0 && !sameCap && (
            <ReferenceLine
              y={usableB}
              stroke="#92400e"
              strokeDasharray="2 2"
              label={{ value: `max ${labelB}`, position: "insideBottomRight", fontSize: 11, fill: "#92400e" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <h4 className="subchart-title">Bilancio energetico del giorno</h4>
      <MetricsTable columns={dailyCols} rows={dailyRows} />
    </div>
  );
}
