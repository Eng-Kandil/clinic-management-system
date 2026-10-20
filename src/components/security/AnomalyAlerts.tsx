"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Wifi,
  Key,
  UserX,
  Zap,
  Download,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Anomaly {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  ipAddress: string;
  recommendation: string;
  dismissed: boolean;
}

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
  loading?: boolean;
  onInvestigate?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const SEVERITY_CONFIG = {
  critical: {
    badge: "danger" as const,
    icon: ShieldX,
    border: "border-l-red-500",
    bg: "bg-red-500/5",
  },
  high: {
    badge: "warning" as const,
    icon: ShieldAlert,
    border: "border-l-orange-500",
    bg: "bg-orange-500/5",
  },
  medium: {
    badge: "default" as const,
    icon: AlertTriangle,
    border: "border-l-amber-500",
    bg: "bg-amber-500/5",
  },
  low: {
    badge: "info" as const,
    icon: Eye,
    border: "border-l-blue-500",
    bg: "bg-blue-500/5",
  },
};

const TYPE_ICONS: Record<string, typeof ShieldAlert> = {
  brute_force: Key,
  unusual_access: Eye,
  new_ip: Wifi,
  privilege_escalation: UserX,
  data_exfiltration: Download,
  off_hours_access: Clock,
  rapid_requests: Zap,
};

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AnomalyAlertSkeleton() {
  return (
    <div className="border-l-4 border-l-slate-700 rounded-r-lg bg-slate-800/30 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-700/50" />
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-700/50" />
            <div className="h-3 w-64 animate-pulse rounded bg-slate-700/50" />
          </div>
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-700/50" />
      </div>
    </div>
  );
}

export default function AnomalyAlerts({
  anomalies,
  loading,
  onInvestigate,
  onDismiss,
}: AnomalyAlertsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAnomalies = anomalies.filter((a) => !dismissed.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    onDismiss?.(id);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-200">Anomaly Alerts</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AnomalyAlertSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-400" />
          <h3 className="text-lg font-semibold text-slate-200">
            Anomaly Alerts
          </h3>
          {visibleAnomalies.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 px-1.5 text-xs font-bold text-red-400">
              {visibleAnomalies.length}
            </span>
          )}
        </div>
      </div>

      {visibleAnomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <Eye className="h-7 w-7 text-emerald-400" />
          </div>
          <h4 className="mt-4 text-sm font-semibold text-slate-300">
            No Active Anomalies
          </h4>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            All detected anomalies have been dismissed or resolved. The system is monitoring for new threats.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {visibleAnomalies.map((anomaly) => {
            const config = SEVERITY_CONFIG[anomaly.severity];
            const TypeIcon = TYPE_ICONS[anomaly.type] || AlertTriangle;
            const isExpanded = expandedId === anomaly.id;

            return (
              <div
                key={anomaly.id}
                className={cn(
                  "rounded-r-lg border-l-4 transition-colors",
                  config.border,
                  config.bg
                )}
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800/80">
                        <TypeIcon className="h-4.5 w-4.5 text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-slate-200">
                            {anomaly.title}
                          </h4>
                          <Badge
                            variant={config.badge}
                            className="text-[10px] uppercase"
                          >
                            {anomaly.severity}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                          <span>{timeAgo(anomaly.timestamp)}</span>
                          <span className="text-slate-600">|</span>
                          <span>IP: {anomaly.ipAddress}</span>
                          {anomaly.userName && (
                            <>
                              <span className="text-slate-600">|</span>
                              <span>{anomaly.userName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : anomaly.id)
                      }
                      className="mt-0.5 flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-700/30 px-4 pb-4 pt-3">
                    <p className="text-sm leading-relaxed text-slate-300">
                      {anomaly.description}
                    </p>

                    <div className="mt-3 rounded-lg bg-slate-800/60 p-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Recommendation
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {anomaly.recommendation}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => onInvestigate?.(anomaly.id)}
                        className="bg-blue-600 text-xs hover:bg-blue-700"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Investigate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(anomaly.id)}
                        className="text-xs text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
