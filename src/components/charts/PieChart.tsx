"use client";

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface PieChartDataItem {
  name: string;
  value: number;
}

interface PieChartProps {
  data: PieChartDataItem[];
  title?: string;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function PieChart({
  data,
  title,
  colors = DEFAULT_COLORS,
  className,
}: PieChartProps) {
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
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="circle"
              iconSize={8}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
