import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CanonicalConsumption } from "../../../../src/core/consumption/canonical.ts";
import type { Viz } from "../../types.ts";
import { fmt, MONTH_LABELS } from "../../lib/format.ts";
import { InfoTip } from "../InfoTip.tsx";

/**
 * Anteprima dei consumi in forma canonica: barre del totale mensile + giornata tipo
 * come media oraria annua, separata feriale/weekend (così il fattore weekend e le
 * sagome si vedono senza mescolarsi). Riusa i pattern grafici Recharts esistenti.
 */
export function ConsumptionPreview({ result, viz }: { result: CanonicalConsumption; viz: Viz }) {
  const { monthly, dayCurve } = useMemo(() => {
    const months = viz.hourly.months;
    const localHour = viz.hourly.localHour;
    const weekday = viz.hourly.weekday; // 0=lun .. 6=dom (giorno locale)
    const load = result.hourlyKwh;
    const mSum = new Array<number>(12).fill(0);
    const wdSum = new Array<number>(24).fill(0);
    const wdCount = new Array<number>(24).fill(0);
    const weSum = new Array<number>(24).fill(0);
    const weCount = new Array<number>(24).fill(0);
    for (let i = 0; i < load.length; i++) {
      const m = months[i];
      if (m !== undefined) mSum[m - 1]! += load[i]!;
      const h = localHour[i];
      if (h !== undefined) {
        if ((weekday[i] ?? 0) >= 5) {
          weSum[h]! += load[i]!;
          weCount[h]! += 1;
        } else {
          wdSum[h]! += load[i]!;
          wdCount[h]! += 1;
        }
      }
    }
    return {
      monthly: mSum.map((kwh, k) => ({ name: MONTH_LABELS[k], kwh })),
      dayCurve: Array.from({ length: 24 }, (_, h) => ({
        hour: `${String(h).padStart(2, "0")}`,
        feriale: wdCount[h]! > 0 ? wdSum[h]! / wdCount[h]! : 0,
        weekend: weCount[h]! > 0 ? weSum[h]! / weCount[h]! : 0,
      })),
    };
  }, [result, viz]);

  return (
    <div className="consumption-preview">
      <p className="note">
        Consumo annuo stimato: <strong>{fmt(result.meta.annualKwh)} kWh</strong>
        {result.meta.source === "csv" ? ` · copertura ${result.meta.coveragePct}%` : ""}
      </p>

      <div className="subchart-title">Consumo per mese (kWh)</div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={monthly}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
          <Bar dataKey="kwh" name="consumo" fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>

      <div className="subchart-title">
        Giornata tipo — media oraria annua (kWh)
        <InfoTip
          entry={{
            term: "Giornata tipo",
            desc: "Per ogni ora del giorno (0–23), la media di quell'ora su tutti i giorni dell'anno: non è un giorno preciso ma il profilo medio. Feriali e weekend sono separati, così il fattore weekend e le sagome si leggono direttamente.",
          }}
        />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={dayCurve}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip formatter={(v: number) => `${fmt(v, 2)} kWh`} />
          <Legend />
          <Line type="monotone" dataKey="feriale" name="feriale" stroke="#6366f1" dot={false} />
          <Line type="monotone" dataKey="weekend" name="weekend" stroke="#f59e0b" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
