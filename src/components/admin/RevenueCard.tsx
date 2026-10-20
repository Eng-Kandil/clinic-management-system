"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { formatCurrency } from "@/lib/utils/helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevenueCardProps {
  thisMonth: number;
  lastMonth: number;
  changePercent: number;
  byMonth: Array<{ month: string; revenue: number }>;
  byPaymentMethod: Array<{ method: string; amount: number; count: number }>;
  outstanding: number;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Payment method label map
// ---------------------------------------------------------------------------

const METHOD_LABELS: Record<string, string> = {
  mock_credit_card: "Credit Card",
  mock_debit_card: "Debit Card",
  mock_insurance: "Insurance",
  mock_cash: "Cash",
};

const METHOD_COLORS: Record<string, string> = {
  mock_credit_card: "bg-blue-100 text-blue-700",
  mock_debit_card: "bg-purple-100 text-purple-700",
  mock_insurance: "bg-green-100 text-green-700",
  mock_cash: "bg-amber-100 text-amber-700",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RevenueCard({
  thisMonth,
  lastMonth,
  changePercent,
  byMonth,
  byPaymentMethod,
  outstanding,
  loading = false,
}: RevenueCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="mt-4 h-32 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = changePercent >= 0;
  const totalMethodAmount = byPaymentMethod.reduce((sum, m) => sum + m.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          <CardTitle>Revenue Overview</CardTitle>
        </div>
        <CardDescription>Monthly revenue and payment breakdown</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main revenue figure */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">This Month</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {formatCurrency(thisMonth, { decimals: 0 })}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  isPositive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {isPositive ? "+" : ""}
                {changePercent}%
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          </div>

          {/* Mini sparkline */}
          <div className="h-16 w-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byMonth}>
                <defs>
                  <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isPositive ? "#10b981" : "#ef4444"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={isPositive ? "#10b981" : "#ef4444"}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={isPositive ? "#10b981" : "#ef4444"}
                  strokeWidth={2}
                  fill="url(#sparkGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outstanding */}
        <div className="rounded-lg bg-amber-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-700">Outstanding Balance</span>
            <span className="text-sm font-semibold text-amber-900">
              {formatCurrency(outstanding, { decimals: 0 })}
            </span>
          </div>
        </div>

        {/* Last month comparison */}
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Last Month</span>
            <span className="text-sm font-semibold text-slate-800">
              {formatCurrency(lastMonth, { decimals: 0 })}
            </span>
          </div>
        </div>

        {/* Payment method breakdown */}
        {byPaymentMethod.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                By Payment Method
              </p>
            </div>
            <div className="space-y-2">
              {byPaymentMethod.map((m) => {
                const pct =
                  totalMethodAmount > 0
                    ? Math.round((m.amount / totalMethodAmount) * 100)
                    : 0;
                return (
                  <div key={m.method}>
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          METHOD_COLORS[m.method] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {METHOD_LABELS[m.method] ?? m.method}
                      </span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(m.amount, { decimals: 0 })}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
