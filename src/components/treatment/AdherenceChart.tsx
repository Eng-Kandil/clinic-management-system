"use client";

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, Flame, Target, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyBreakdown {
  date: string;
  taken: number;
  missed: number;
  skipped: number;
  total: number;
  rate: number;
}

interface AdherenceChartProps {
  dailyBreakdown: DailyBreakdown[];
  overallRate: number;
  currentStreak: number;
  longestStreak: number;
  totalTaken: number;
  totalMissed: number;
  className?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
      </div>
    </div>
  );
}

export default function AdherenceChart({
  dailyBreakdown,
  overallRate,
  currentStreak,
  longestStreak,
  totalTaken,
  totalMissed,
  className = "",
}: AdherenceChartProps) {
  // Format dates for display
  const chartData = dailyBreakdown.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stats cards row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Overall Rate"
          value={`${overallRate}%`}
          subtext={
            overallRate >= 80
              ? "Excellent"
              : overallRate >= 60
                ? "Needs improvement"
                : "Critical"
          }
          color={
            overallRate >= 80
              ? "bg-green-50 text-green-600"
              : overallRate >= 60
                ? "bg-amber-50 text-amber-600"
                : "bg-red-50 text-red-600"
          }
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={currentStreak}
          subtext="consecutive doses"
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          icon={Target}
          label="Longest Streak"
          value={longestStreak}
          subtext="all time best"
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={XCircle}
          label="Doses Missed"
          value={totalMissed}
          subtext={`${totalTaken} taken`}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Adherence rate line chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Adherence Rate Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((value: number) => [`${value}%`, "Adherence"]) as any}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: "#2563eb", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Taken vs Missed bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Daily Taken vs Missed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Bar
                      dataKey="taken"
                      name="Taken"
                      fill="#22c55e"
                      radius={[3, 3, 0, 0]}
                      stackId="stack"
                    />
                    <Bar
                      dataKey="missed"
                      name="Missed"
                      fill="#ef4444"
                      radius={[3, 3, 0, 0]}
                      stackId="stack"
                    />
                    <Bar
                      dataKey="skipped"
                      name="Skipped"
                      fill="#94a3b8"
                      radius={[3, 3, 0, 0]}
                      stackId="stack"
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
