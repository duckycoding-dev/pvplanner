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
import { ConsumptionLockedBox } from "./ConsumptionLockedBox.tsx";
import { useT } from "../i18n/useT.tsx";

const SCENARIOS: { key: Scenario; labelKey: string }[] = [
  { key: "con", labelKey: "scenario.withBattery" },
  { key: "senza", labelKey: "scenario.noBattery" },
  { key: "entrambi", labelKey: "scenario.both" },
];

const DAY_MS = 86_400_000;

export function DailyExplorer({
  viz,
  tariff,
  hasBattery,
  hasConsumption,
}: {
  viz: Viz;
  tariff: Tariff;
  hasBattery: boolean;
  hasConsumption: boolean;
}) {
  const { t } = useT();
  const h = viz.hourly;
  const total = dayCount(h);
  const picks = useMemo(() => quickPickDays(h), [h]);
  const [dayIndex, setDayIndex] = useState<number>(picks.maxClipping ?? picks.maxProduction);
  const [scenario, setScenario] = useState<Scenario>("con");
  // Senza consumi le viste con/senza batteria non hanno significato: forziamo "senza".
  const effScenario: Scenario = hasBattery && hasConsumption ? scenario : "senza";

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

  const isNb = effScenario === "senza";
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
  const chaCon = sum((p) => p.charge);
  const disCon = sum((p) => p.discharge);
  const lossCon = chaCon - disCon;
  const cycCon = disCon / (viz.meta.batteryUsableKwh || 1);

  const dayStart = dayIndex * 24;
  let netNoPv = 0;
  let netSenza = 0;
  let netCon = 0;
  for (let i = 0; i < 24; i++) {
    const j = dayStart + i;
    const price = priceForHour(tariff, h.localHour[j] ?? 0, h.weekday[j] ?? 0);
    netNoPv += (h.loadKwh[j] ?? 0) * price; // no PV: whole load imported, nothing exported
    netSenza += (h.nb.importKwh[j] ?? 0) * price - (h.nb.exportKwh[j] ?? 0) * tariff.sellPrice;
    netCon += (h.wb.importKwh[j] ?? 0) * price - (h.wb.exportKwh[j] ?? 0) * tariff.sellPrice;
  }

  const kwh1 = (v: number): string => `${fmt(v, 1)} kWh`;
  const eur = (v: number): string => `${fmt(v, 2)} €`;
  // First column "senza FV" (reference); Δ = last two columns.
  const cols = hasBattery
    ? [{ key: "novf", label: t("scenario.noPv") }, { key: "senza", label: t("scenario.noBattery") }, { key: "con", label: t("scenario.withBattery") }]
    : [{ key: "novf", label: t("scenario.noPv") }, { key: "fv", label: t("scenario.pv") }];
  const v3 = (noPvV: number, senzaV: number, conV: number): number[] =>
    hasBattery ? [noPvV, senzaV, conV] : [noPvV, senzaV];
  const dayRows: MetricRow[] = [
    { key: "prod", label: t("metrics.production"), info: "produzione", good: "higher", render: kwh1, values: v3(0, prod, prod) },
    { key: "cons", label: t("metrics.consumption"), info: "consumo", good: "none", render: kwh1, values: v3(cons, cons, cons) },
    { key: "self", label: t("metrics.selfConsumption"), info: "autoconsumo", good: "higher", render: kwh1, values: v3(0, selfSenza, selfCon) },
    { key: "imp", label: t("metrics.import"), info: "import", good: "lower", render: kwh1, values: v3(cons, impSenza, impCon) },
    { key: "exp", label: t("metrics.export"), info: "export", good: "higher", render: kwh1, values: v3(0, expSenza, expCon) },
    { key: "clip", label: t("metrics.clipping"), info: "clipping", good: "lower", render: kwh1, values: v3(0, clip, clip) },
    ...(hasBattery
      ? [
          { key: "cyc", label: t("metrics.cycles"), info: "cicli", good: "none" as const, render: (v: number) => (v > 0 ? v.toFixed(2) : "—"), values: [0, 0, cycCon] },
          { key: "loss", label: t("metrics.roundTripLoss"), info: "roundTripLoss", good: "lower" as const, render: kwh1, values: [0, 0, lossCon] },
        ]
      : []),
    { key: "net", label: t("metrics.netDay"), info: "nettoCosto", good: "lower", money: "net", render: eur, values: v3(netNoPv, netSenza, netCon) },
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
        {hasBattery && hasConsumption && (
          <div className="scenario">
            {SCENARIOS.map((s) => (
              <button key={s.key} className={scenario === s.key ? "active" : ""} onClick={() => setScenario(s.key)}>
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasConsumption && (
        <section className="chart-card">
          <MetricsTable
            title={hasBattery ? t("daily.summaryBattery") : t("daily.summaryPv")}
            columns={cols}
            rows={dayRows}
          />
        </section>
      )}

      <div className="chart-card">
        <div className="section-head">
          <h3>
            {t("daily.powerTitle")}
            <InfoTip k="coperto" />
          </h3>
        </div>
        <PowerChart data={pts} scenario={hasConsumption ? scenario : "senza"} acCapKw={viz.meta.acCapKw} />
      </div>

      {!hasConsumption ? (
        <ConsumptionLockedBox />
      ) : !hasBattery ? (
        <p className="note">{t("daily.noBatterySystemA")}</p>
      ) : !isNb ? (
        <div className="chart-card">
          <div className="section-head">
            <h3>
              {t("daily.socTitle")}
              <InfoTip k="soc" />
            </h3>
          </div>
          <BatteryChart data={pts} usableKwh={viz.meta.batteryUsableKwh} />
        </div>
      ) : (
        <p className="note">{t("daily.noBatteryScenario")}</p>
      )}
    </div>
  );
}
