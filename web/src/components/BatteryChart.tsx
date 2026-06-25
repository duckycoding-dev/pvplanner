import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint } from "../lib/sliceDay.ts";
import { useLegendToggle } from "../lib/useLegendToggle.ts";

interface Props {
  data: DayPoint[];
  usableKwh: number;
}

export function BatteryChart({ data, usableKwh }: Props) {
  const { onClick, isHidden } = useLegendToggle();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" tickFormatter={(h: number) => String(h)} />
        <YAxis domain={[0, Math.ceil(usableKwh)]} label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
        <Tooltip formatter={(v: number) => v.toFixed(2)} labelFormatter={(h) => `ore ${h}`} />
        <Legend onClick={onClick} wrapperStyle={{ cursor: "pointer" }} />
        <Bar dataKey="soc" name="SoC batteria" fill="#f59e0b" isAnimationActive={false} hide={isHidden("soc")} />
        <ReferenceLine
          y={usableKwh}
          stroke="#b45309"
          strokeDasharray="6 3"
          label={{ value: `capacità ${usableKwh} kWh`, position: "right", fontSize: 11, fill: "#b45309" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
