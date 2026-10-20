"use client";

import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
  severity?: "info" | "warning" | "critical";
}

interface RecentActivityProps {
  items: ActivityItem[];
  title?: string;
  className?: string;
}

const severityStyles: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const severityDot: Record<string, string> = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

export function RecentActivity({
  items,
  title = "Recent Activity",
  className,
}: RecentActivityProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-slate-200 p-6",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          No recent activity
        </p>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto">
          {items.map((item) => {
            const severity = item.severity ?? "info";
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  severityStyles[severity]
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                    severityDot[severity]
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">
                    {item.action}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs opacity-75">{item.user}</span>
                    <span className="text-xs opacity-50">·</span>
                    <span className="text-xs opacity-75">{item.timestamp}</span>
                  </div>
                  {item.details && (
                    <p className="text-xs mt-1 opacity-75">{item.details}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
