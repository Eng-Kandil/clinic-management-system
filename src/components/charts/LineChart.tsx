"use client";

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  className?: string;
}

export function LineChart({
  data,
  xKey,
  yKey,
  title,
  color = "#2563eb",
  className,
}: LineChartProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-slate-200 p-6",
        className
      )}
    >
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      )}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
