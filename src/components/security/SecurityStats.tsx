"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: number | string;
  icon: "shield" | "alert" | "warning" | "activity";
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: "blue" | "red" | "amber" | "green";
  onClick?: () => void;
}

interface SecurityStatsProps {
  stats: StatItem[];
  loading?: boolean;
}

const ICON_MAP = {
  shield: Shield,
  alert: ShieldAlert,
  warning: AlertTriangle,
  activity: Activity,
};

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-950/60",
    iconBg: "bg-blue-500/20",
    icon: "text-blue-400",
    border: "border-blue-500/20",
    value: "text-blue-100",
    trend: "text-blue-400",
  },
  red: {
    bg: "bg-red-950/40",
    iconBg: "bg-red-500/20",
    icon: "text-red-400",
    border: "border-red-500/20",
    value: "text-red-100",
    trend: "text-red-400",
  },
  amber: {
    bg: "bg-amber-950/40",
    iconBg: "bg-amber-500/20",
    icon: "text-amber-400",
    border: "border-amber-500/20",
    value: "text-amber-100",
    trend: "text-amber-400",
  },
  green: {
    bg: "bg-emerald-950/40",
    iconBg: "bg-emerald-500/20",
    icon: "text-emerald-400",
    border: "border-emerald-500/20",
    value: "text-emerald-100",
    trend: "text-emerald-400",
  },
};

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
      // Reset counter when target prop becomes 0 — intentional sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(0);
      return;
    }

    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{typeof target === "number" ? count.toLocaleString() : target}</>;
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-700/50" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-700/50" />
          <div className="h-7 w-16 animate-pulse rounded bg-slate-700/50" />
        </div>
      </div>
    </div>
  );
}

export default function SecurityStats({ stats, loading }: SecurityStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const colors = COLOR_MAP[stat.color];
        const Icon = ICON_MAP[stat.icon];

        return (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-200",
              colors.bg,
              colors.border,
              stat.onClick
                ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
                : "cursor-default"
            )}
          >
            {/* Subtle glow effect */}
            <div
              className={cn(
                "absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl",
                stat.color === "blue" && "bg-blue-400",
                stat.color === "red" && "bg-red-400",
                stat.color === "amber" && "bg-amber-400",
                stat.color === "green" && "bg-emerald-400"
              )}
            />

            <div className="relative flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  colors.iconBg
                )}
              >
                <Icon className={cn("h-6 w-6", colors.icon)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>
                <p className={cn("mt-0.5 text-2xl font-bold", colors.value)}>
                  {typeof stat.value === "number" ? (
                    <AnimatedCounter target={stat.value} />
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
            </div>

            {stat.trend && stat.trendValue && (
              <div className="mt-3 flex items-center gap-1.5 border-t border-white/5 pt-3">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-red-400" />
                ) : stat.trend === "down" ? (
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                ) : null}
                <span
                  className={cn(
                    "text-xs font-medium",
                    stat.trend === "up" ? "text-red-400" : "text-emerald-400"
                  )}
                >
                  {stat.trendValue}
                </span>
                <span className="text-xs text-slate-500">vs last period</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
