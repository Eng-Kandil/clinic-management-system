"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Brain,
  Pill,
  MessageSquare,
  Clock,
  FileText,
  CreditCard,
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { QuickActions, type QuickAction } from "./QuickActions";

// ---------------------------------------------------------------------------
// Static actions + empty default lists
// ---------------------------------------------------------------------------

const quickActions: QuickAction[] = [
  {
    label: "Book Appointment",
    icon: Calendar,
    href: "/dashboard/appointments/new",
    color: "bg-blue-600",
  },
  {
    label: "AI Diagnosis",
    icon: Brain,
    href: "/dashboard/ai-diagnosis",
    color: "bg-purple-600",
  },
  {
    label: "My Medications",
    icon: Pill,
    href: "/dashboard/treatment-tracking",
    color: "bg-emerald-600",
  },
  {
    label: "Consultations",
    icon: MessageSquare,
    href: "/dashboard/consultations",
    color: "bg-amber-600",
  },
];

interface DashboardAppointment {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
}

interface DashboardMedication {
  id: string;
  name: string;
  frequency: string;
  prescribed: string;
  refillDate: string;
}

interface DashboardRecord {
  id: string;
  type: string;
  doctor: string;
  date: string;
  summary: string;
}

const upcomingAppointments: DashboardAppointment[] = [];
const recentRecords: DashboardRecord[] = [];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusStyles: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  cancelled: "bg-red-50 text-red-700",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PatientDashboardProps {
  userName: string;
}

interface SubscriptionData {
  plan: string | null;
  endDate: string | null;
  aiDiagnosesUsed: number;
  aiDiagnosesLimit: number | null; // null means unlimited
}

const defaultSubscription: SubscriptionData = {
  plan: null,
  endDate: null,
  aiDiagnosesUsed: 0,
  aiDiagnosesLimit: null,
};

export function PatientDashboard({ userName }: PatientDashboardProps) {
  const firstName = userName.split(" ")[0];

  const [subscription, setSubscription] =
    useState<SubscriptionData>(defaultSubscription);
  const [currentMedications, setCurrentMedications] = useState<
    DashboardMedication[]
  >([]);

  // Load the patient's active prescriptions and flatten them into the
  // "Current Medications" card. The GET endpoint scopes results to the caller.
  useEffect(() => {
    fetch("/api/prescriptions?status=active&limit=20")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.success) return;
        const list = (json.data || []) as Array<{
          _id: string;
          doctorId?: { user?: { name?: string } };
          medications: Array<{
            name: string;
            dosage: string;
            frequency: string;
            endDate?: string;
          }>;
        }>;
        const flat: DashboardMedication[] = [];
        for (const rx of list) {
          const docName = rx.doctorId?.user?.name
            ? `Dr. ${rx.doctorId.user.name}`
            : "your doctor";
          for (const m of rx.medications) {
            flat.push({
              id: `${rx._id}-${flat.length}`,
              name: m.name,
              frequency: `${m.dosage} · ${m.frequency}`,
              prescribed: docName,
              refillDate: m.endDate
                ? new Date(m.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—",
            });
          }
        }
        setCurrentMedications(flat);
      })
      .catch(() => {
        // Non-critical — leave the card empty on failure.
      });
  }, []);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch subscription");
        return res.json();
      })
      .then((json) => {
        // The API wraps the payload in { success, data: { subscription, plans } }
        const sub = json?.data?.subscription;
        if (sub) {
          setSubscription({
            plan: sub.plan ?? null,
            endDate: sub.endDate ?? null,
            aiDiagnosesUsed: sub.aiDiagnosesUsed ?? 0,
            aiDiagnosesLimit: sub.aiDiagnosesLimit ?? null,
          });
        } else {
          setSubscription(defaultSubscription);
        }
      })
      .catch(() => {
        // Gracefully fall back to Free plan on any error
        setSubscription(defaultSubscription);
      });
  }, []);

  const planName = subscription.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : "No Active Plan";

  const renewalText = subscription.endDate
    ? `Renews on ${new Date(subscription.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "N/A";

  const diagnosesDisplay =
    subscription.plan === null
      ? "N/A"
      : subscription.aiDiagnosesLimit === null
      ? `${subscription.aiDiagnosesUsed} / ∞`
      : `${subscription.aiDiagnosesUsed} / ${subscription.aiDiagnosesLimit}`;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-slate-500 mt-1">
          Here&apos;s an overview of your health at a glance.
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Grid: Appointments + Medications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">
              Upcoming Appointments
            </h3>
          </div>
          <div className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                No upcoming appointments
              </p>
            ) : (
              upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {apt.doctor}
                    </p>
                    <p className="text-xs text-slate-500">{apt.specialty}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {apt.date} at {apt.time}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusStyles[apt.status]}`}
                  >
                    {apt.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Current Medications */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">
              Current Medications
            </h3>
          </div>
          <div className="space-y-3">
            {currentMedications.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                No active medications
              </p>
            ) : (
              currentMedications.map((med) => (
                <div
                  key={med.id}
                  className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {med.name}
                      </p>
                      <p className="text-xs text-slate-500">{med.frequency}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Prescribed by {med.prescribed}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      Until {med.refillDate}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Medical Records + Subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Records */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">
              Recent Medical Records
            </h3>
          </div>
          <div className="space-y-3">
            {recentRecords.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                No medical records yet
              </p>
            ) : (
              recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {record.type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {record.date}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1.5">
                        {record.summary}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {record.doctor}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">
              Subscription
            </h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <p className="text-sm font-medium opacity-90">Current Plan</p>
              <p className="text-xl font-bold mt-1">{planName}</p>
              <p className="text-xs opacity-75 mt-2">
                {renewalText}
              </p>
            </div>
            <StatsCard
              title="AI Diagnoses Used"
              value={diagnosesDisplay}
              icon={Brain}
              description="This month"
            />
            <div className="text-xs text-slate-500">
              <p>
                {subscription.plan
                  ? "Plan features are available in the subscription page."
                  : "No subscription features yet."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
