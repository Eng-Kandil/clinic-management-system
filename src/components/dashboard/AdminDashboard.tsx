"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  Server,
  Activity,
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { RecentActivity, type ActivityItem } from "./RecentActivity";
import { LineChart } from "../charts/LineChart";
import { BarChart } from "../charts/BarChart";
import { AreaChart } from "../charts/AreaChart";
import { PieChart } from "../charts/PieChart";
import { formatCurrency } from "@/lib/utils/helpers";

// ---------------------------------------------------------------------------
// Types (match /api/admin/analytics)
// ---------------------------------------------------------------------------

interface Analytics {
  overview: {
    totalUsers: number;
    usersByRole: {
      admin: number;
      doctor: number;
      patient: number;
      security_officer: number;
    };
    totalAppointments: number;
    todayAppointments: number;
    totalRevenue: number;
    totalInvoices: number;
    outstandingRevenue: number;
    totalAIDiagnoses: number;
    totalConsultations: number;
  };
  patientRegistrationByMonth: { month: string; patients: number }[];
  appointments: {
    byStatus: { name: string; value: number }[];
    trend: { date: string; count: number }[];
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
    byMonth: { month: string; revenue: number; count: number }[];
    byPaymentMethod: { method: string; amount: number; count: number }[];
  };
}

interface AuditLogEntry {
  _id: string;
  action: string;
  resource?: string;
  details?: string;
  severity?: "info" | "warning" | "critical";
  createdAt: string;
  userId?: { name?: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function humanizeAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function monthLabel(ym: string): string {
  // "2026-06" → "Jun"
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" });
}

function dayLabel(ymd: string): string {
  // "2026-06-15" → "Jun 15"
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminDashboardProps {
  userName: string;
}

export function AdminDashboard({ userName }: AdminDashboardProps) {
  const firstName = userName.split(" ")[0];

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [aRes, logRes] = await Promise.all([
          fetch("/api/admin/analytics?days=7", { cache: "no-store" }),
          fetch("/api/audit-log?limit=8", { cache: "no-store" }),
        ]);

        if (!cancelled && aRes.ok) {
          const json = await aRes.json();
          if (json?.success && json.data) setAnalytics(json.data as Analytics);
        }

        if (!cancelled && logRes.ok) {
          const json = await logRes.json();
          const logs: AuditLogEntry[] = json?.data ?? [];
          setActivity(
            logs.map((l) => ({
              id: l._id,
              action: humanizeAction(l.action),
              user: l.userId?.name ?? "System",
              timestamp: l.createdAt,
              details: l.details,
              severity: l.severity ?? "info",
            }))
          );
        }
      } catch {
        // Leave empty state on failure
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const o = analytics?.overview;
  const revenueChange = analytics?.revenue.changePercent ?? 0;

  const appointmentsTrend = (analytics?.appointments.trend ?? []).map((d) => ({
    date: dayLabel(d.date),
    appointments: d.count,
  }));
  const revenueTrend = (analytics?.revenue.byMonth ?? []).map((d) => ({
    month: monthLabel(d.month),
    revenue: d.revenue,
  }));
  const registrationTrend = (analytics?.patientRegistrationByMonth ?? []).map(
    (d) => ({ month: monthLabel(d.month), patients: d.patients })
  );
  const appointmentStatusDist = analytics?.appointments.byStatus ?? [];

  const noData = (msg: string) => (loaded ? msg : "Loading…");

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome back, {firstName}. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Patients"
          value={o?.usersByRole.patient ?? 0}
          icon={Users}
          description={
            o && o.usersByRole.patient > 0
              ? "Registered patients"
              : noData("No records yet")
          }
        />
        <StatsCard
          title="Total Doctors"
          value={o?.usersByRole.doctor ?? 0}
          icon={UserCheck}
          description={
            o && o.usersByRole.doctor > 0
              ? "Active doctors"
              : noData("No records yet")
          }
        />
        <StatsCard
          title="Today's Appointments"
          value={o?.todayAppointments ?? 0}
          icon={Calendar}
          description={
            o && o.todayAppointments > 0
              ? "Scheduled today"
              : noData("No records yet")
          }
        />
        <StatsCard
          title="Monthly Revenue"
          value={formatCurrency(analytics?.revenue.thisMonth ?? 0, {
            decimals: 0,
          })}
          icon={DollarSign}
          trend={
            revenueChange !== 0
              ? { value: Math.abs(revenueChange), isPositive: revenueChange > 0 }
              : undefined
          }
          description={
            analytics && analytics.revenue.thisMonth > 0
              ? "vs. last month"
              : noData("No billing records")
          }
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          data={appointmentsTrend}
          xKey="date"
          yKey="appointments"
          title="Appointments This Week"
          color="#2563eb"
        />
        <BarChart
          data={revenueTrend}
          xKey="month"
          yKey="revenue"
          title="Revenue Trend"
          color="#2563eb"
        />
        <AreaChart
          data={registrationTrend}
          xKey="month"
          yKey="patients"
          title="Patient Registration Trend"
          color="#10b981"
        />
        <PieChart
          data={appointmentStatusDist}
          title="Appointment Status Distribution"
          colors={["#10b981", "#2563eb", "#ef4444", "#f59e0b", "#8b5cf6", "#64748b"]}
        />
      </div>

      {/* Activity + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity items={activity} />
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">
              System Health
            </h3>
          </div>
          <div className="space-y-4">
            <HealthIndicator
              label="Database"
              status={loaded ? "healthy" : "warning"}
              detail={loaded ? "Connected" : "Checking…"}
            />
            <HealthIndicator
              label="Total Users"
              status="healthy"
              detail={`${o?.totalUsers ?? 0} accounts`}
            />
            <HealthIndicator
              label="Appointments"
              status="healthy"
              detail={`${o?.totalAppointments ?? 0} total`}
            />
            <HealthIndicator
              label="Consultations"
              status="healthy"
              detail={`${o?.totalConsultations ?? 0} total`}
            />
            <HealthIndicator
              label="AI Diagnoses"
              status="healthy"
              detail={`${o?.totalAIDiagnoses ?? 0} total`}
            />
            <HealthIndicator
              label="Outstanding Revenue"
              status={
                o && o.outstandingRevenue > 0 ? "warning" : "healthy"
              }
              detail={formatCurrency(o?.outstandingRevenue ?? 0, {
                decimals: 0,
              })}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">
                Live data · refreshed on load
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health indicator sub-component
// ---------------------------------------------------------------------------

function HealthIndicator({
  label,
  status,
  detail,
}: {
  label: string;
  status: "healthy" | "warning" | "critical";
  detail: string;
}) {
  const dot: Record<string, string> = {
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dot[status]}`} />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-xs text-slate-500">{detail}</span>
    </div>
  );
}
