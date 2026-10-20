"use client";

import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Info,
  ScrollText,
  Lock,
  CheckCircle,
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { RecentActivity, type ActivityItem } from "./RecentActivity";
import { QuickActions, type QuickAction } from "./QuickActions";
import { LineChart } from "../charts/LineChart";

// ---------------------------------------------------------------------------
// Static actions + empty default lists
// ---------------------------------------------------------------------------

const quickActions: QuickAction[] = [
  {
    label: "View Full Audit Log",
    icon: ScrollText,
    href: "/dashboard/security/audit-log",
    color: "bg-blue-600",
  },
  {
    label: "Check Hash Integrity",
    icon: CheckCircle,
    href: "/dashboard/security/integrity",
    color: "bg-emerald-600",
  },
  {
    label: "Failed Logins",
    icon: Lock,
    href: "/dashboard/security/failed-logins",
    color: "bg-red-600",
  },
  {
    label: "Security Policies",
    icon: Shield,
    href: "/dashboard/security/policies",
    color: "bg-slate-700",
  },
];

const securityAlerts: ActivityItem[] = [];

interface FailedLoginEntry {
  id: string;
  email: string;
  ip: string;
  attempts: number;
  lastAttempt: string;
  blocked: boolean;
}

const failedLogins: FailedLoginEntry[] = [];
const auditActivityData: { hour: string; events: number }[] = [];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SecurityDashboardProps {
  userName: string;
}

export function SecurityDashboard({ userName }: SecurityDashboardProps) {
  const firstName = userName.split(" ")[0];
  const criticalCount = securityAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = securityAlerts.filter((a) => a.severity === "warning").length;
  const infoCount = securityAlerts.filter((a) => a.severity === "info").length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Security Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Welcome, {firstName}. Monitoring system security and audit trails.
        </p>
      </div>

      {/* Alert Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatsCard
          title="Critical Alerts"
          value={criticalCount}
          icon={ShieldAlert}
          className="border-red-200"
          description="Requires immediate attention"
        />
        <StatsCard
          title="Warnings"
          value={warningCount}
          icon={AlertTriangle}
          className="border-amber-200"
          description="Review recommended"
        />
        <StatsCard
          title="Informational"
          value={infoCount}
          icon={Info}
          className="border-blue-200"
          description="System notifications"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Alerts + Audit Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity
          items={securityAlerts}
          title="Recent Security Alerts"
        />
        <LineChart
          data={auditActivityData}
          xKey="hour"
          yKey="events"
          title="Audit Log Activity (Last 24h)"
          color="#2563eb"
        />
      </div>

      {/* Failed Login Attempts */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">
            Failed Login Attempts (Last 24h)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-500">
                  Email
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">
                  IP Address
                </th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">
                  Attempts
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">
                  Last Attempt
                </th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {failedLogins.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 px-4 text-center text-sm text-slate-500"
                  >
                    No failed login attempts
                  </td>
                </tr>
              ) : (
                failedLogins.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {entry.email}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                      {entry.ip}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          entry.attempts >= 5
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {entry.attempts}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {entry.lastAttempt}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          entry.blocked
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {entry.blocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
