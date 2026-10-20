"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  Calendar,
  DollarSign,
  Brain,
  RefreshCw,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  UserGrowthChart,
  AppointmentStatusChart,
  AppointmentTrendChart,
  RevenueTrendChart,
  AIDiagnosisChart,
  ConsultationStatsCard,
  BloodBridgeCard,
  type AnalyticsData,
} from "@/components/admin/AnalyticsCharts";
import TopDoctorsTable from "@/components/admin/TopDoctorsTable";
import RevenueCard from "@/components/admin/RevenueCard";
import { formatCurrency } from "@/lib/utils/helpers";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/analytics?days=${days}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch analytics");
      }

      setAnalytics(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchAnalytics();
    }
  }, [status, session, fetchAnalytics]);

  // Loading / unauthorized
  if (status === "loading") return <PageSkeleton />;
  if (status !== "authenticated" || session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Comprehensive overview of clinic performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex rounded-lg border border-slate-200 bg-white">
            {[
              { label: "7D", value: 7 },
              { label: "30D", value: 30 },
              { label: "90D", value: 90 },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === opt.value
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                } ${
                  opt.value === 7
                    ? "rounded-l-lg"
                    : opt.value === 90
                      ? "rounded-r-lg"
                      : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            className="ml-2 font-medium underline"
            onClick={fetchAnalytics}
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={loading ? "..." : (analytics?.overview.totalUsers.toLocaleString() ?? "0")}
          icon={Users}
          description={
            loading
              ? ""
              : `${analytics?.overview.usersByRole.doctor ?? 0} doctors, ${analytics?.overview.usersByRole.patient ?? 0} patients`
          }
        />
        <StatsCard
          title="Total Appointments"
          value={loading ? "..." : (analytics?.overview.totalAppointments.toLocaleString() ?? "0")}
          icon={Calendar}
          description={
            loading
              ? ""
              : `${analytics?.overview.todayAppointments ?? 0} today`
          }
        />
        <StatsCard
          title="Revenue"
          value={loading ? "..." : formatCurrency(analytics?.overview.totalRevenue ?? 0, { decimals: 0 })}
          icon={DollarSign}
          trend={
            analytics
              ? {
                  value: Math.abs(analytics.revenue.changePercent),
                  isPositive: analytics.revenue.changePercent >= 0,
                }
              : undefined
          }
          description={loading ? "" : "vs last month"}
        />
        <StatsCard
          title="AI Diagnoses"
          value={loading ? "..." : (analytics?.overview.totalAIDiagnoses.toLocaleString() ?? "0")}
          icon={Brain}
          description={
            loading
              ? ""
              : `${analytics?.overview.totalConsultations ?? 0} consultations`
          }
        />
      </div>

      {/* Charts Row 1: User Growth + Revenue Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UserGrowthChart
            data={analytics?.userGrowth ?? []}
            loading={loading}
          />
        </div>
        <RevenueCard
          thisMonth={analytics?.revenue.thisMonth ?? 0}
          lastMonth={analytics?.revenue.lastMonth ?? 0}
          changePercent={analytics?.revenue.changePercent ?? 0}
          byMonth={analytics?.revenue.byMonth ?? []}
          byPaymentMethod={analytics?.revenue.byPaymentMethod ?? []}
          outstanding={analytics?.overview.outstandingRevenue ?? 0}
          loading={loading}
        />
      </div>

      {/* Charts Row 2: Appointments Status + Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AppointmentStatusChart
          data={analytics?.appointments.byStatus ?? []}
          loading={loading}
        />
        <AppointmentTrendChart
          data={analytics?.appointments.trend ?? []}
          loading={loading}
        />
      </div>

      {/* Charts Row 3: Revenue Trend + AI Diagnosis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueTrendChart
          data={analytics?.revenue.byMonth ?? []}
          loading={loading}
        />
        <AIDiagnosisChart
          data={analytics?.aiDiagnosis.byUrgency ?? []}
          loading={loading}
        />
      </div>

      {/* Top Doctors Table */}
      <TopDoctorsTable
        doctors={analytics?.topDoctors ?? []}
        loading={loading}
      />

      {/* Bottom Row: Consultations + Blood Bridge */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConsultationStatsCard
          data={
            analytics?.consultations ?? {
              total: 0,
              byType: [],
              averageDuration: 0,
              totalDuration: 0,
            }
          }
          loading={loading}
        />
        <BloodBridgeCard
          data={
            analytics?.bloodBridge ?? {
              totalDonors: 0,
              availableDonors: 0,
              donorsByBloodType: [],
              totalRequests: 0,
              requestsByStatus: [],
              requestsByUrgency: [],
            }
          }
          loading={loading}
        />
      </div>
    </div>
  );
}
