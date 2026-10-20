"use client";

import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
} from "lucide-react";

interface ThreatLevelProps {
  level: "low" | "medium" | "high" | "critical";
  factors: string[];
  loading?: boolean;
}

const LEVEL_CONFIG = {
  low: {
    label: "Low",
    description: "System is operating normally with no significant threats.",
    Icon: ShieldCheck,
    barColor: "bg-emerald-500",
    barWidth: "w-1/4",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    iconBg: "bg-emerald-500/20",
    glowColor: "shadow-emerald-500/20",
    dotColor: "bg-emerald-400",
    pulse: false,
  },
  medium: {
    label: "Medium",
    description: "Some unusual activity detected. Monitor closely.",
    Icon: AlertTriangle,
    barColor: "bg-amber-500",
    barWidth: "w-2/4",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    iconBg: "bg-amber-500/20",
    glowColor: "shadow-amber-500/20",
    dotColor: "bg-amber-400",
    pulse: false,
  },
  high: {
    label: "High",
    description: "Significant threats detected. Immediate review recommended.",
    Icon: ShieldAlert,
    barColor: "bg-orange-500",
    barWidth: "w-3/4",
    textColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    iconBg: "bg-orange-500/20",
    glowColor: "shadow-orange-500/20",
    dotColor: "bg-orange-400",
    pulse: true,
  },
  critical: {
    label: "Critical",
    description: "Critical security threats require immediate action.",
    Icon: ShieldX,
    barColor: "bg-red-500",
    barWidth: "w-full",
    textColor: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    iconBg: "bg-red-500/20",
    glowColor: "shadow-red-500/20",
    dotColor: "bg-red-500",
    pulse: true,
  },
};

export default function ThreatLevel({ level, factors, loading }: ThreatLevelProps) {
  const config = LEVEL_CONFIG[level];
  const Icon = config.Icon;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-700/50" />
        <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-slate-700/50" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-700/50" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-700/50" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 transition-all",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Pulsing background glow for high/critical */}
      {config.pulse && (
        <div
          className={cn(
            "absolute inset-0 animate-pulse opacity-5",
            level === "critical" ? "bg-red-500" : "bg-orange-500"
          )}
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                config.iconBg
              )}
            >
              <Icon className={cn("h-5 w-5", config.textColor)} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400">
                Current Threat Level
              </h3>
              <p className={cn("text-xl font-bold", config.textColor)}>
                {config.label}
              </p>
            </div>
          </div>

          {/* Pulsing dot */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={cn("h-3 w-3 rounded-full", config.dotColor)} />
              {config.pulse && (
                <div
                  className={cn(
                    "absolute inset-0 h-3 w-3 animate-ping rounded-full opacity-75",
                    config.dotColor
                  )}
                />
              )}
            </div>
          </div>
        </div>

        {/* Threat bar */}
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                config.barColor,
                config.barWidth
              )}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-widest text-slate-500">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Critical</span>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm text-slate-400">{config.description}</p>

        {/* Contributing factors */}
        {factors.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Contributing Factors
            </p>
            {factors.map((factor, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                    config.dotColor
                  )}
                />
                <span className="text-sm text-slate-300">{factor}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
