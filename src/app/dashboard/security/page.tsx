"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  Lock,
  Download,
  RefreshCw,
  Activity,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaChart } from "@/components/charts/AreaChart";
import { PieChart } from "@/components/charts/PieChart";
import SecurityStats from "@/components/security/SecurityStats";
import ThreatLevel from "@/components/security/ThreatLevel";
import AnomalyAlerts from "@/components/security/AnomalyAlerts";
import SecurityTimeline from "@/components/security/SecurityTimeline";
import ChainVerification from "@/components/security/ChainVerification";

// ── Types ────────────────────────────────────────────────────
interface SecurityStatsData {
  overview: {
    totalLogs: number;
    severityBreakdown: Record<string, number>;
    recentCritical: number;
    activeSessions: number;
    threatLevel: "low" | "medium" | "high" | "critical";
    threatFactors: string[];
  };
  failedLogins: { last24h: number; last7d: number; last30d: number };
  actionBreakdown: { name: string; value: number }[];
  logsOverTime: {
    _id: string;
    total: number;
    critical: number;
    warning: number;
    info: number;
  }[];
  recentCriticalEvents: Array<{
    _id: string;
    action: string;
    resource: string;
    details: string;
    severity: "info" | "warning" | "critical";
    userId?: { _id: string; name: string; email: string } | null;
    ipAddress?: string;
    createdAt: string;
  }>;
  chainIntegrity: {
    valid: boolean;
    totalChecked: number;
    brokenAt?: number;
  } | null;
  systemHealth: Record<string, string>;
}

interface AnomalyData {
  anomalies: Array<{
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
  }>;
  summary: Record<string, number>;
}

// ── Helpers ──────────────────────────────────────────────────

const EVENTS_PIE_COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];

// ── Page Component ───────────────────────────────────────────

export default function SecurityDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SecurityStatsData | null>(null);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [anomalyLoading, setAnomalyLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/security/stats");
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch {
      // stats are best-effort
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await fetch("/api/security/anomalies");
      const json = await res.json();
      if (json.success) setAnomalyData(json.data);
    } catch {
      // anomalies are best-effort
    } finally {
      setAnomalyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchAnomalies();
  }, [fetchStats, fetchAnomalies]);

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    setAnomalyLoading(true);
    fetchStats();
    fetchAnomalies();
  };

  // Prepare chart data
  const timelineData =
    stats?.logsOverTime.map((d) => ({
      date: d._id,
      total: d.total,
      critical: d.critical,
      warning: d.warning,
    })) ?? [];

  const pieData = stats?.actionBreakdown.slice(0, 6) ?? [];

  // Stats cards
  const statCards = stats
    ? [
        {
          label: "Total Events",
          value: stats.overview.totalLogs,
          icon: "shield" as const,
          color: "blue" as const,
          trend: stats.overview.totalLogs > 0 ? ("up" as const) : ("down" as const),
          trendValue:
            stats.overview.totalLogs > 0
              ? `${stats.overview.totalLogs} logged`
              : "No events",
        },
        {
          label: "Critical Alerts",
          value: stats.overview.recentCritical,
          icon: "alert" as const,
          color: "red" as const,
          trend: stats.overview.recentCritical > 0 ? ("up" as const) : ("down" as const),
          trendValue:
            stats.overview.recentCritical > 0
              ? `${stats.overview.recentCritical} in 24h`
              : "None in 24h",
        },
        {
          label: "Failed Logins",
          value: stats.failedLogins.last24h,
          icon: "warning" as const,
          color: "amber" as const,
          trend: stats.failedLogins.last24h > 5 ? ("up" as const) : ("down" as const),
          trendValue: `${stats.failedLogins.last7d} in 7d`,
        },
        {
          label: "Chain Integrity",
          value: stats.chainIntegrity
            ? stats.chainIntegrity.valid
              ? "Valid"
              : "Broken"
            : "Unverified",
          icon: "activity" as const,
          color: "green" as const,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Security Dashboard
              </h1>
              <p className="text-sm text-slate-500">
                Monitor threats, anomalies, and audit integrity
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/security/audit-log")}
          >
            <FileSearch className="mr-1.5 h-3.5 w-3.5" />
            Audit Logs
          </Button>
          <Button size="sm" className="bg-slate-800 text-slate-200 hover:bg-slate-700">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export Report
          </Button>
        </div>
      </div>

      {/* ── Dark-themed security panel ─────────────────────── */}
      <div className="rounded-2xl bg-slate-900 p-6 shadow-xl ring-1 ring-slate-800">
        {/* Stats Row */}
        <SecurityStats stats={statCards} loading={loading} />

        {/* Threat Level + Anomalies Row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ThreatLevel
            level={stats?.overview.threatLevel ?? "low"}
            factors={stats?.overview.threatFactors ?? []}
            loading={loading}
          />
          <AnomalyAlerts
            anomalies={anomalyData?.anomalies ?? []}
            loading={anomalyLoading}
            onInvestigate={(id) =>
              router.push(`/dashboard/security/audit-log?search=${id}`)
            }
          />
        </div>

        {/* Charts Row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Events over time — 2/3 width */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="h-80 animate-pulse rounded-xl bg-slate-800/50" />
            ) : (
              <AreaChart
                data={timelineData}
                xKey="date"
                yKey="total"
                title="Security Events Over Time"
                color="#3b82f6"
                className="border-slate-700/50 bg-slate-800/30 shadow-none [&_h3]:text-slate-200 [&_.recharts-cartesian-grid_line]:stroke-slate-700/30 [&_.recharts-text]:fill-slate-400"
              />
            )}
          </div>

          {/* Events by type pie — 1/3 width */}
          <div>
            {loading ? (
              <div className="h-80 animate-pulse rounded-xl bg-slate-800/50" />
            ) : (
              <PieChart
                data={pieData}
                title="Events by Type"
                colors={EVENTS_PIE_COLORS}
                className="border-slate-700/50 bg-slate-800/30 shadow-none [&_h3]:text-slate-200 [&_.recharts-text]:fill-slate-400"
              />
            )}
          </div>
        </div>

        {/* Timeline + Chain Verification */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SecurityTimeline
            events={stats?.recentCriticalEvents ?? []}
            loading={loading}
          />
          <ChainVerification />
        </div>

        {/* Quick Actions */}
        <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-400">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
              onClick={() => router.push("/dashboard/security/audit-log")}
            >
              <FileSearch className="mr-1.5 h-3.5 w-3.5" />
              View Full Audit Log
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Verify Chain
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Logs (CSV)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-900/40 hover:text-red-300"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Lock Account
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              System Health
            </Button>
          </div>
        </div>

        {/* System Health Footer */}
        {stats?.systemHealth && (
          <div className="mt-4 flex flex-wrap items-center gap-4 px-1">
            {Object.entries(stats.systemHealth).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${
                    value === "healthy"
                      ? "bg-emerald-400"
                      : value === "degraded"
                      ? "bg-amber-400"
                      : "bg-red-400"
                  }`}
                />
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
