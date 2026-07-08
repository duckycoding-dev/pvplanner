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
import { combineSeries, quickPickDays } from "../lib/quickPickDays.ts";
import { dayIndexToDateInput, fmt, formatDayLabel } from "../lib/format.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";
import { MetricsTable, type MetricRow } from "./MetricsTable.tsx";
import { useT } from "../i18n/useT.tsx";

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
  acCapA,
  acCapB,
}: {
  a: SystemResult;
  b: SystemResult;
  viz: Viz;
  labelA: string;
  labelB: string;
  usableA: number;
  usableB: number;
  acCapA: number;
  acCapB: number;
}) {
  const { t } = useT();
  const { onClick, isHidden } = useLegendToggle();
  const soc = useLegendToggle();
  const total = Math.floor(viz.hourly.loadKwh.length / 24);
  // Picks dalle serie per-sistema (A+B): la baseline può non clippare mai
  // mentre i sistemi configurati sì (fix: puntava sempre al 1° gennaio).
  const picks = useMemo(
    () =>
      quickPickDays({
        productionPracticalKwh: combineSeries(a.production.hourly.practicalKwh, b.production.hourly.practicalKwh),
        clippingKwh: combineSeries(a.production.hourly.clippingLossKwh, b.production.hourly.clippingLossKwh),
      }),
    [a, b],
  );
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
  const labelCapA = sameCap ? t("compare.maxKwh", { kwh: fmt(usableA, 1) }) : t("compare.maxLabel", { label: labelA });

  const sameAcCap = acCapA === acCapB;
  const acLabelA = sameAcCap
    ? t("power.acCeiling", { kw: acCapA })
    : t("compare.acCeilingLabel", { label: labelA, kw: acCapA });

  const dailyCols = [
    { key: "a", label: labelA },
    { key: "b", label: labelB },
  ];
  const dailyRows: MetricRow[] = [
    { key: "prod", label: t("metrics.productionActual"), info: "produzione", good: "higher", render: kwh2, values: [ta.prod, tb.prod] },
    { key: "clip", label: t("metrics.clipping"), info: "clipping", good: "lower", render: kwh2, values: [ta.clip, tb.clip] },
    { key: "self", label: t("metrics.selfConsumption"), info: "autoconsumo", good: "higher", render: kwh2, values: [ta.self, tb.self] },
    { key: "imp", label: t("metrics.importGrid"), info: "import", good: "lower", render: kwh2, values: [ta.imp, tb.imp] },
    { key: "exp", label: t("metrics.exportGrid"), info: "export", good: "higher", render: kwh2, values: [ta.exp, tb.exp] },
    { key: "dis", label: t("metrics.batteryDischarge"), good: "none", render: kwh2, values: [ta.dis, tb.dis] },
    { key: "loss", label: t("metrics.roundTripLoss"), info: "roundTripLoss", good: "lower", render: kwh2, values: [ta.cha - ta.dis, tb.cha - tb.dis] },
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
          <button
            disabled={picks.maxClipping === null}
            onClick={() => {
              if (picks.maxClipping !== null) setDayIndex(picks.maxClipping);
            }}
          >
            {t("daily.pickMaxClipping")}
          </button>
          <button onClick={() => setDayIndex(picks.maxProduction)}>{t("daily.pickMaxProduction")}</button>
          <button onClick={() => setDayIndex(picks.minProduction)}>{t("daily.pickMinProduction")}</button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={pts} margin={{ top: 10, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
          <YAxis yAxisId="temp" orientation="right" tickFormatter={(v) => String(Math.round(Number(v)))} label={{ value: "°C", angle: 90, position: "insideRight" }} />
          <Tooltip formatter={(v) => Number(v).toFixed(2)} labelFormatter={(h) => t("chart.hour", { h: String(h) })} />
          <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />

          {/* coverage drawn first as filled areas so production/load lines sit on top */}
          <Area type="monotone" dataKey="selfA" name={t("compare.coveredLabel", { label: labelA })} stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.5} isAnimationActive={false} hide={isHidden("selfA")} />
          <Area type="monotone" dataKey="selfB" name={t("compare.coveredLabel", { label: labelB })} stroke="#3b82f6" strokeDasharray="5 3" fill="#bfdbfe" fillOpacity={0.3} isAnimationActive={false} hide={isHidden("selfB")} />
          <Line type="monotone" dataKey="load" name={t("chart.consumption")} stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} hide={isHidden("load")} />
          <Line type="monotone" dataKey="prodA" name={t("compare.productionLabel", { label: labelA })} stroke="#16a34a" strokeWidth={2} dot={false} isAnimationActive={false} hide={isHidden("prodA")} />
          <Line type="monotone" dataKey="prodB" name={t("compare.productionLabel", { label: labelB })} stroke="#16a34a" strokeDasharray="5 3" dot={false} isAnimationActive={false} hide={isHidden("prodB")} />
          {/* tetto AC: su bucket orari kW ≡ kWh (stessa convenzione di PowerChart) */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temp"
            name={t("chart.temperature")}
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
            hide={isHidden("temp")}
          />
          <ReferenceLine
            y={acCapA}
            stroke="#6b7280"
            strokeDasharray="6 3"
            label={{ value: acLabelA, position: "right", fontSize: 11, fill: "#6b7280" }}
          />
          {!sameAcCap && (
            <ReferenceLine
              y={acCapB}
              stroke="#9ca3af"
              strokeDasharray="2 2"
              label={{ value: t("compare.acCeilingLabel", { label: labelB, kw: acCapB }), position: "right", fontSize: 11, fill: "#9ca3af" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <h4 className="subchart-title">{t("compare.socTitle")}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={pts} margin={{ top: 6, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis
            domain={[0, capMax > 0 ? Math.ceil(capMax) : "auto"]}
            label={{ value: "kWh", angle: -90, position: "insideLeft" }}
          />
          <Tooltip formatter={(v) => Number(v).toFixed(2)} labelFormatter={(h) => t("chart.hour", { h: String(h) })} />
          <Legend onClick={soc.onClick} wrapperStyle={{ cursor: "pointer" }} />
          <Line type="monotone" dataKey="socA" name={t("compare.socLabel", { label: labelA })} stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} hide={soc.isHidden("socA")} />
          <Line type="monotone" dataKey="socB" name={t("compare.socLabel", { label: labelB })} stroke="#f59e0b" strokeDasharray="5 3" dot={false} isAnimationActive={false} hide={soc.isHidden("socB")} />
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
              label={{ value: t("compare.maxLabel", { label: labelB }), position: "insideBottomRight", fontSize: 11, fill: "#92400e" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <h4 className="subchart-title">{t("compare.dayBalanceTitle")}</h4>
      <MetricsTable columns={dailyCols} rows={dailyRows} />
    </div>
  );
}
