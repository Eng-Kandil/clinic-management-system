"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  description?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-slate-200 p-6",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {(trend || description) && (
        <div className="mt-3 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded",
                trend.isPositive
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-red-700 bg-red-50"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-500">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
