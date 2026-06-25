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
import type { DayPoint } from "../lib/sliceDay.ts";
import type { Scenario } from "../types.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";

interface Props {
  data: DayPoint[];
  scenario: Scenario;
  acCapKw: number;
}

export function PowerChart({ data, scenario, acCapKw }: Props) {
  const { onClick, isHidden } = useLegendToggle();
  const showWb = scenario === "con" || scenario === "entrambi";
  const showNb = scenario === "senza" || scenario === "entrambi";

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" tickFormatter={(h: number) => String(h)} />
        <YAxis label={{ value: "kW", angle: -90, position: "insideLeft" }} />
        <Tooltip formatter={(v: number) => v.toFixed(2)} labelFormatter={(h) => `ore ${h}`} />
        <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />

        {/* Coverage: PV (+battery) to load — gap under the load line is grid import */}
        {showWb && (
          <Area
            type="monotone"
            dataKey="wbSelf"
            name="coperto PV+batteria"
            fill="#93c5fd"
            stroke="#3b82f6"
            fillOpacity={0.45}
            isAnimationActive={false}
            hide={isHidden("wbSelf")}
          />
        )}
        {showNb &&
          (scenario === "entrambi" ? (
            <Line
              type="monotone"
              dataKey="nbSelf"
              name="coperto solo PV"
              stroke="#1e40af"
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
              hide={isHidden("nbSelf")}
            />
          ) : (
            <Area
              type="monotone"
              dataKey="nbSelf"
              name="coperto solo PV"
              fill="#93c5fd"
              stroke="#3b82f6"
              fillOpacity={0.45}
              isAnimationActive={false}
              hide={isHidden("nbSelf")}
            />
          ))}

        <Line
          type="monotone"
          dataKey="prodPractical"
          name="produzione"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          hide={isHidden("prodPractical")}
        />
        <Line
          type="monotone"
          dataKey="prodTheoretical"
          name="produzione teorica"
          stroke="#16a34a"
          strokeDasharray="5 3"
          dot={false}
          isAnimationActive={false}
          hide={isHidden("prodTheoretical")}
        />
        <Line
          type="monotone"
          dataKey="load"
          name="consumo (sint.)"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          hide={isHidden("load")}
        />
        <ReferenceLine
          y={acCapKw}
          stroke="#6b7280"
          strokeDasharray="6 3"
          label={{ value: `tetto AC ${acCapKw} kW`, position: "right", fontSize: 11, fill: "#6b7280" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
