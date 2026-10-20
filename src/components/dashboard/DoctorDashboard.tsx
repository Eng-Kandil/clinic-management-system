"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  MessageSquare,
  DollarSign,
  Clock,
  UserPlus,
  FileText,
  Video,
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { QuickActions, type QuickAction } from "./QuickActions";
import { formatCurrency } from "@/lib/utils/helpers";
import { formatClinicTime } from "@/lib/utils/datetime";

// ---------------------------------------------------------------------------
// Quick actions (static)
// ---------------------------------------------------------------------------

const quickActions: QuickAction[] = [
  { label: "Start Consultation", icon: Video, href: "/dashboard/consultations", color: "bg-blue-600" },
  { label: "View Patients", icon: Users, href: "/dashboard/patients", color: "bg-emerald-600" },
  { label: "View EMR", icon: FileText, href: "/dashboard/patients", color: "bg-purple-600" },
  { label: "New Appointment", icon: UserPlus, href: "/dashboard/appointments/new", color: "bg-amber-600" },
];

// ---------------------------------------------------------------------------
// Types (match /api/dashboard/doctor)
// ---------------------------------------------------------------------------

interface ScheduleEntry {
  id: string;
  patient: string;
  dateTime: string;
  type: string;
  status: "completed" | "in-progress" | "scheduled";
  reason: string;
}
interface RecentPatient {
  id: string;
  name: string;
  lastVisit: string;
  condition: string;
}
interface ConsultationRequest {
  id: string;
  patient: string;
  requestedAt: string;
  type: string;
}
interface DoctorStats {
  todayAppointmentsCount: number;
  pendingConsultationsCount: number;
  totalPatients: number;
  monthRevenue: number;
  todaySchedule: ScheduleEntry[];
  pendingConsultations: ConsultationRequest[];
  recentPatients: RecentPatient[];
}

const EMPTY: DoctorStats = {
  todayAppointmentsCount: 0,
  pendingConsultationsCount: 0,
  totalPatients: 0,
  monthRevenue: 0,
  todaySchedule: [],
  pendingConsultations: [],
  recentPatients: [],
};

const scheduleStatusStyles: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  "in-progress": "bg-blue-50 text-blue-700",
  scheduled: "bg-slate-50 text-slate-600",
};
const scheduleTimelineColor: Record<string, string> = {
  completed: "bg-emerald-500",
  "in-progress": "bg-blue-500 animate-pulse",
  scheduled: "bg-slate-300",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function shortDate(iso: string): string {
  return formatClinicTime(iso, { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DoctorDashboardProps {
  userName: string;
}

export function DoctorDashboard({ userName }: DoctorDashboardProps) {
  const firstName = userName.split(" ")[0];
  const [stats, setStats] = useState<DoctorStats>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/doctor", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success && json.data) setStats({ ...EMPTY, ...json.data });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const { todaySchedule, recentPatients, pendingConsultations } = stats;
  const welcome = !loaded
    ? "Loading your day…"
    : stats.todayAppointmentsCount > 0
    ? `You have ${stats.todayAppointmentsCount} appointment${stats.todayAppointmentsCount === 1 ? "" : "s"} scheduled for today.`
    : "You have no appointments scheduled for today.";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Good morning, Dr. {firstName}</h1>
        <p className="text-slate-500 mt-1">{welcome}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Today's Appointments"
          value={stats.todayAppointmentsCount}
          icon={Calendar}
          description={stats.todayAppointmentsCount > 0 ? "Scheduled for today" : "No records yet"}
        />
        <StatsCard
          title="Pending Consultations"
          value={stats.pendingConsultationsCount}
          icon={MessageSquare}
          description={stats.pendingConsultationsCount > 0 ? "Awaiting you" : "No requests yet"}
        />
        <StatsCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          description={stats.totalPatients > 0 ? "Seen by you" : "No records yet"}
        />
        <StatsCard
          title="This Month's Revenue"
          value={formatCurrency(stats.monthRevenue, { decimals: 0 })}
          icon={DollarSign}
          description={stats.monthRevenue > 0 ? "Completed visits" : "No billing records"}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Schedule + Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">Today&apos;s Schedule</h3>
          </div>
          <div className="space-y-1">
            {todaySchedule.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No appointments for today</p>
            ) : (
              todaySchedule.map((slot) => (
                <div key={slot.id} className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${scheduleTimelineColor[slot.status]}`} />
                  <div className="w-20 sm:w-24 flex-shrink-0">
                    <p className="text-sm font-medium text-slate-700">
                      {formatClinicTime(slot.dateTime, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{slot.patient}</p>
                    <p className="text-xs text-slate-500 truncate">{slot.reason || slot.type}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize whitespace-nowrap ${scheduleStatusStyles[slot.status]}`}>
                    {slot.status.replace("-", " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">Recent Patients</h3>
          </div>
          <div className="space-y-3">
            {recentPatients.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No recent patients</p>
            ) : (
              recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initials(patient.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{patient.name}</p>
                    <p className="text-xs text-slate-500 truncate">{patient.condition}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{shortDate(patient.lastVisit)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending Consultations */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">Pending Consultation Requests</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingConsultations.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center col-span-full">No pending consultation requests</p>
          ) : (
            pendingConsultations.map((consult) => (
              <a
                key={consult.id}
                href={`/dashboard/consultations/${consult.id}`}
                className="p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all block"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-slate-900">{consult.patient}</p>
                  <span className="text-xs font-medium text-blue-600 px-2 py-0.5 rounded bg-blue-50 capitalize">
                    {consult.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{relativeTime(consult.requestedAt)}</span>
                  <span className="text-xs font-medium text-blue-600">Open →</span>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
