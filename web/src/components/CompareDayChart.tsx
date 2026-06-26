import { type ChangeEvent, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Viz } from "../types.ts";
import type { SystemResult } from "../../../src/core/comparison/computeSystem.ts";
import { sliceCompareDay } from "../lib/sliceCompareDay.ts";
import { quickPickDays } from "../lib/quickPickDays.ts";
import { dayIndexToDateInput, formatDayLabel } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";

const DAY_MS = 86_400_000;

export function CompareDayChart({
  a,
  b,
  viz,
  labelA,
  labelB,
}: {
  a: SystemResult;
  b: SystemResult;
  viz: Viz;
  labelA: string;
  labelB: string;
}) {
  const { onClick, isHidden } = useLegendToggle();
  const total = Math.floor(viz.hourly.loadKwh.length / 24);
  const picks = useMemo(() => quickPickDays(viz.hourly), [viz]);
  const [dayIndex, setDayIndex] = useState<number>(picks.maxProduction);

  const pts = useMemo(() => sliceCompareDay(a, b, viz, dayIndex), [a, b, viz, dayIndex]);
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
          <Tooltip formatter={(v: number) => v.toFixed(2)} labelFormatter={(h) => `ore ${h}`} />
          <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />

          <Line type="monotone" dataKey="load" name="consumo" stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} hide={isHidden("load")} />
          <Line type="monotone" dataKey="prodA" name={`produzione ${labelA}`} stroke="#16a34a" strokeWidth={2} dot={false} isAnimationActive={false} hide={isHidden("prodA")} />
          <Line type="monotone" dataKey="prodB" name={`produzione ${labelB}`} stroke="#16a34a" strokeDasharray="5 3" dot={false} isAnimationActive={false} hide={isHidden("prodB")} />
          <Line type="monotone" dataKey="selfA" name={`coperto ${labelA}`} stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} hide={isHidden("selfA")} />
          <Line type="monotone" dataKey="selfB" name={`coperto ${labelB}`} stroke="#3b82f6" strokeDasharray="5 3" dot={false} isAnimationActive={false} hide={isHidden("selfB")} />
          <Line type="monotone" dataKey="socA" name={`SoC ${labelA}`} stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} hide={isHidden("socA")} />
          <Line type="monotone" dataKey="socB" name={`SoC ${labelB}`} stroke="#f59e0b" strokeDasharray="5 3" dot={false} isAnimationActive={false} hide={isHidden("socB")} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
