"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { PieChart } from "@/components/charts/PieChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  DollarSign,
  Brain,
  MessageSquare,
  Droplets,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsData {
  overview: {
    totalUsers: number;
    usersByRole: Record<string, number>;
    totalAppointments: number;
    todayAppointments: number;
    totalRevenue: number;
    totalInvoices: number;
    outstandingRevenue: number;
    totalAIDiagnoses: number;
    totalConsultations: number;
  };
  userGrowth: Array<{ date: string; count: number }>;
  appointments: {
    byStatus: Array<{ name: string; value: number }>;
    trend: Array<{ date: string; count: number }>;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
    byMonth: Array<{ month: string; revenue: number; count: number }>;
    byPaymentMethod: Array<{ method: string; amount: number; count: number }>;
  };
  aiDiagnosis: {
    total: number;
    byUrgency: Array<{ name: string; value: number }>;
  };
  consultations: {
    total: number;
    byType: Array<{ name: string; value: number }>;
    averageDuration: number;
    totalDuration: number;
  };
  bloodBridge: {
    totalDonors: number;
    availableDonors: number;
    donorsByBloodType: Array<{ name: string; value: number }>;
    totalRequests: number;
    requestsByStatus: Array<{ name: string; value: number }>;
    requestsByUrgency: Array<{ name: string; value: number }>;
  };
  topDoctors: Array<{
    _id: string;
    name: string;
    avatar?: string;
    specialization: string;
    department: string;
    consultationFee: number;
    experience: number;
    totalAppointments: number;
    completedAppointments: number;
    estimatedRevenue: number;
  }>;
}

// ---------------------------------------------------------------------------
// Chart Loading Skeleton
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// User Growth Chart
// ---------------------------------------------------------------------------

export function UserGrowthChart({
  data,
  loading,
}: {
  data: AnalyticsData["userGrowth"];
  loading: boolean;
}) {
  if (loading) return <ChartSkeleton />;

  // Format dates for display
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          <CardTitle>User Growth</CardTitle>
        </div>
        <CardDescription>New user registrations over time</CardDescription>
      </CardHeader>
      <CardContent>
        <AreaChart
          data={formatted}
          xKey="label"
          yKey="count"
          color="#2563eb"
          className="border-0 shadow-none p-0"
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Appointments Status Pie Chart
// ---------------------------------------------------------------------------

export function AppointmentStatusChart({
  data,
  loading,
}: {
  data: Array<{ name: string; value: number }>;
  loading: boolean;
}) {
  if (loading) return <ChartSkeleton />;

  const statusColors: Record<string, string> = {
    completed: "#10b981",
    scheduled: "#2563eb",
    confirmed: "#06b6d4",
    "in-progress": "#f59e0b",
    cancelled: "#ef4444",
    "no-show": "#8b5cf6",
  };

  const colors = data.map((d) => statusColors[d.name] ?? "#94a3b8");

  // Capitalize names for display
  const formatted = data.map((d) => ({
    ...d,
    name: d.name.charAt(0).toUpperCase() + d.name.slice(1).replace("-", " "),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-500" />
          <CardTitle>Appointments by Status</CardTitle>
        </div>
        <CardDescription>Distribution of appointment statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <PieChart
          data={formatted}
          colors={colors}
          className="border-0 shadow-none p-0"
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Appointments Trend Bar Chart
// ---------------------------------------------------------------------------

export function AppointmentTrendChart({
  data,
  loading,
}: {
  data: Array<{ date: string; count: number }>;
  loading: boolean;
}) {
  if (loading) return <ChartSkeleton />;

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          <CardTitle>Appointment Trend</CardTitle>
        </div>
        <CardDescription>Appointments over time</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart
          data={formatted}
          xKey="label"
          yKey="count"
          color="#2563eb"
          className="border-0 shadow-none p-0"
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Revenue Trend Line Chart
// ---------------------------------------------------------------------------

export function RevenueTrendChart({
  data,
  loading,
}: {
  data: Array<{ month: string; revenue: number }>;
  loading: boolean;
}) {
  if (loading) return <ChartSkeleton />;

  // Format month labels
  const formatted = data.map((d) => {
    const [year = "0", month = "1"] = d.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      ...d,
      label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          <CardTitle>Revenue Trend</CardTitle>
        </div>
        <CardDescription>Monthly paid revenue (last 6 months)</CardDescription>
      </CardHeader>
      <CardContent>
        <LineChart
          data={formatted}
          xKey="label"
          yKey="revenue"
          color="#10b981"
          className="border-0 shadow-none p-0"
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AI Diagnosis Urgency Chart
// ---------------------------------------------------------------------------

export function AIDiagnosisChart({
  data,
  loading,
}: {
  data: Array<{ name: string; value: number }>;
  loading: boolean;
}) {
  if (loading) return <ChartSkeleton />;

  const urgencyColors: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    emergency: "#dc2626",
  };

  const colors = data.map((d) => urgencyColors[d.name] ?? "#94a3b8");

  const formatted = data.map((d) => ({
    ...d,
    name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-500" />
          <CardTitle>AI Diagnosis by Urgency</CardTitle>
        </div>
        <CardDescription>Distribution of AI-assessed urgency levels</CardDescription>
      </CardHeader>
      <CardContent>
        <PieChart
          data={formatted}
          colors={colors}
          className="border-0 shadow-none p-0"
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Consultation Stats Card
// ---------------------------------------------------------------------------

export function ConsultationStatsCard({
  data,
  loading,
}: {
  data: AnalyticsData["consultations"];
  loading: boolean;
}) {
  if (loading) return <ChartSkeleton />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-cyan-500" />
          <CardTitle>Consultations</CardTitle>
        </div>
        <CardDescription>Overview of consultation activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-cyan-50 p-4">
            <p className="text-sm text-cyan-700">Total</p>
            <p className="mt-1 text-2xl font-bold text-cyan-900">
              {data.total.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Avg Duration</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {data.averageDuration} min
            </p>
          </div>
          {data.byType.map((t) => (
            <div key={t.name} className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm capitalize text-slate-600">{t.name}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {t.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Blood Bridge Summary Card
// ---------------------------------------------------------------------------

export function BloodBridgeCard({
  data,
  loading,
}: {
  data: AnalyticsData["bloodBridge"];
  loading: boolean;
}) {
  if (loading) return <ChartSkeleton />;

  const fulfilled =
    data.requestsByStatus.find((s) => s.name === "fulfilled")?.value ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-red-500" />
          <CardTitle>Blood Bridge</CardTitle>
        </div>
        <CardDescription>Donor and request overview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-700">Total Donors</p>
            <p className="mt-1 text-2xl font-bold text-red-900">
              {data.totalDonors.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-700">Available</p>
            <p className="mt-1 text-2xl font-bold text-green-900">
              {data.availableDonors.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4">
            <p className="text-sm text-orange-700">Total Requests</p>
            <p className="mt-1 text-2xl font-bold text-orange-900">
              {data.totalRequests.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Fulfilled</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {fulfilled.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Blood type distribution */}
        {data.donorsByBloodType.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Donors by Blood Type
            </p>
            <div className="flex flex-wrap gap-2">
              {data.donorsByBloodType.map((bt) => (
                <span
                  key={bt.name}
                  className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800"
                >
                  {bt.name}: {bt.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
