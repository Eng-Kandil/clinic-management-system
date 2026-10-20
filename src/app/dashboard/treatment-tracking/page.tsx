"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pill,
  Activity,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { CardSkeleton, TableSkeleton } from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import TreatmentCard from "@/components/treatment/TreatmentCard";
import AdherenceChart from "@/components/treatment/AdherenceChart";
import DoseTimeline from "@/components/treatment/DoseTimeline";
import SideEffectForm from "@/components/treatment/SideEffectForm";
import MedicationSchedule from "@/components/treatment/MedicationSchedule";

// ── Types ────────────────────────────────────────────────────
interface TreatmentEntryRaw {
  _id: string;
  patientId: unknown;
  prescriptionId: unknown;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  takenAt?: string;
  status: "pending" | "taken" | "missed" | "skipped";
  notes?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AdherenceStats {
  overallRate: number;
  totalEntries: number;
  totalTaken: number;
  totalMissed: number;
  totalSkipped: number;
  totalPending: number;
  currentStreak: number;
  longestStreak: number;
  byMedication: Record<
    string,
    {
      total: number;
      taken: number;
      missed: number;
      skipped: number;
      rate: number;
    }
  >;
  dailyBreakdown: Array<{
    date: string;
    taken: number;
    missed: number;
    skipped: number;
    total: number;
    rate: number;
  }>;
}

// Grouped medication data
interface MedicationGroup {
  medicationName: string;
  dosage: string;
  entries: TreatmentEntryRaw[];
  nextDose?: TreatmentEntryRaw;
  adherenceRate: number;
  totalDoses: number;
  takenDoses: number;
  prescriptionStatus: string;
}

// ── Filter options ───────────────────────────────────────────
const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Taken", value: "taken" },
  { label: "Missed", value: "missed" },
  { label: "Skipped", value: "skipped" },
];

// ── Page ─────────────────────────────────────────────────────
export default function TreatmentTrackingPage() {
  // ── State ──────────────────────────────────────────────────
  const [entries, setEntries] = useState<TreatmentEntryRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [medicationFilter, setMedicationFilter] = useState("");
  const [adherenceStats, setAdherenceStats] = useState<AdherenceStats | null>(
    null
  );
  const [statsLoading, setStatsLoading] = useState(true);

  // Side effect form state
  const [sideEffectOpen, setSideEffectOpen] = useState(false);
  const [sideEffectTarget, setSideEffectTarget] = useState<{
    entryId: string;
    medicationName: string;
  } | null>(null);
  const [sideEffectLoading, setSideEffectLoading] = useState(false);

  // ── Fetch treatment entries ────────────────────────────────
  const fetchEntries = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "200");
        if (statusFilter) params.set("status", statusFilter);
        if (medicationFilter) params.set("medication", medicationFilter);

        // Fetch entries for the last 7 days and next 7 days
        const from = new Date();
        from.setDate(from.getDate() - 7);
        const to = new Date();
        to.setDate(to.getDate() + 7);
        params.set("dateFrom", from.toISOString().split("T")[0]!);
        params.set("dateTo", to.toISOString().split("T")[0]!);

        const res = await fetch(
          `/api/treatment/schedule?${params.toString()}`
        );
        const json = await res.json();

        if (json.success) {
          setEntries(json.data || []);
          if (json.pagination) setPagination(json.pagination);
        } else {
          setEntries([]);
        }
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, medicationFilter]
  );

  // ── Fetch adherence stats ──────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/treatment/adherence?days=30");
      const json = await res.json();
      if (json.success) {
        setAdherenceStats(json.data);
      }
    } catch {
      // silently fail stats
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchEntries(1);
      fetchStats();
    }, 200);
    return () => clearTimeout(timeout);
  }, [fetchEntries, fetchStats]);

  // ── Group entries by medication ────────────────────────────
  const medicationGroups: MedicationGroup[] = (() => {
    const groups = new Map<string, TreatmentEntryRaw[]>();

    for (const entry of entries) {
      const key = `${entry.medicationName}::${entry.dosage}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    }

    return Array.from(groups.entries()).map(([, groupEntries]) => {
      const sorted = [...groupEntries].sort(
        (a, b) =>
          new Date(a.scheduledTime).getTime() -
          new Date(b.scheduledTime).getTime()
      );

      const now = Date.now();
      const nextDose = sorted.find(
        (e) =>
          e.status === "pending" &&
          new Date(e.scheduledTime).getTime() >= now
      );

      const resolved = sorted.filter((e) => e.status !== "pending");
      const taken = resolved.filter((e) => e.status === "taken");
      const adherenceRate =
        resolved.length > 0
          ? Math.round((taken.length / resolved.length) * 100)
          : 100;

      const hasPending = sorted.some((e) => e.status === "pending");

      return {
        medicationName: sorted[0]!.medicationName,
        dosage: sorted[0]!.dosage,
        entries: sorted,
        nextDose,
        adherenceRate,
        totalDoses: sorted.length,
        takenDoses: taken.length,
        prescriptionStatus: hasPending ? "active" : "completed",
      };
    });
  })();

  // ── Today's doses ──────────────────────────────────────────
  const todayDoses = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return entries
      .filter((e) => {
        const time = new Date(e.scheduledTime).getTime();
        return time >= today.getTime() && time < tomorrow.getTime();
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledTime).getTime() -
          new Date(b.scheduledTime).getTime()
      );
  })();

  // ── Unique medication names for filter ─────────────────────
  const uniqueMedications = [
    { label: "All Medications", value: "" },
    ...Array.from(new Set(entries.map((e) => e.medicationName))).map(
      (name) => ({ label: name, value: name })
    ),
  ];

  // ── Actions ────────────────────────────────────────────────
  async function markDose(
    entryId: string,
    status: "taken" | "missed" | "skipped"
  ) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/treatment/adherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, status }),
      });
      const json = await res.json();
      if (json.success) {
        // Update local state
        setEntries((prev) =>
          prev.map((e) =>
            e._id === entryId
              ? {
                  ...e,
                  status,
                  takenAt:
                    status === "taken"
                      ? new Date().toISOString()
                      : undefined,
                }
              : e
          )
        );
        // Refresh stats
        fetchStats();
      }
    } catch {
      // handle error silently
    } finally {
      setActionLoading(false);
    }
  }

  function handleReportSideEffect(entryId: string) {
    const entry = entries.find((e) => e._id === entryId);
    if (entry) {
      setSideEffectTarget({
        entryId,
        medicationName: entry.medicationName,
      });
      setSideEffectOpen(true);
    }
  }

  async function handleSideEffectSubmit(data: {
    treatmentEntryId: string;
    description: string;
    severity: "mild" | "moderate" | "severe";
    date: string;
  }) {
    setSideEffectLoading(true);
    try {
      // Submit side effect via PATCH on the treatment entry notes
      const res = await fetch(`/api/treatment/${data.treatmentEntryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: `[Side Effect - ${data.severity}] ${data.description} (${data.date})`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSideEffectOpen(false);
        setSideEffectTarget(null);
        fetchEntries();
      }
    } catch {
      // handle error
    } finally {
      setSideEffectLoading(false);
    }
  }

  async function handleBulkAction(
    entryId: string,
    action: "pause" | "resume" | "discontinue" | "complete"
  ) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/treatment/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkAction: action }),
      });
      const json = await res.json();
      if (json.success) {
        fetchEntries();
        fetchStats();
      }
    } catch {
      // handle error
    } finally {
      setActionLoading(false);
    }
  }

  function clearFilters() {
    setStatusFilter("");
    setMedicationFilter("");
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Treatment Tracking
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track medications, monitor adherence, and manage your treatment
            schedule
          </p>
        </div>
        <Button variant="outline" onClick={() => { fetchEntries(); fetchStats(); }}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats Bar */}
      {!statsLoading && adherenceStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Activity className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Adherence Rate</p>
                <p
                  className={`text-lg font-bold ${
                    adherenceStats.overallRate >= 80
                      ? "text-green-600"
                      : adherenceStats.overallRate >= 60
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {adherenceStats.overallRate}%
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <ListChecks className="h-4.5 w-4.5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Doses Taken</p>
                <p className="text-lg font-bold text-slate-900">
                  {adherenceStats.totalTaken}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <Pill className="h-4.5 w-4.5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Active Medications</p>
                <p className="text-lg font-bold text-slate-900">
                  {medicationGroups.filter((g) => g.prescriptionStatus === "active").length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <Clock className="h-4.5 w-4.5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Today&apos;s Doses</p>
                <p className="text-lg font-bold text-slate-900">
                  {todayDoses.filter((d) => d.status === "pending").length}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    / {todayDoses.length}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state for stats */}
      {statsLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      )}

      {/* Tabs: Overview | Timeline | Analytics | Schedule */}
      <Tabs
        tabs={[
          {
            label: "Overview",
            value: "overview",
            content: (
              <div className="space-y-6 pt-2">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-40"
                  />
                  <Select
                    options={uniqueMedications}
                    value={medicationFilter}
                    onChange={(e) => setMedicationFilter(e.target.value)}
                    className="w-48"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                  >
                    <Filter className="mr-1.5 h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>

                {/* Active Treatment Cards */}
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : medicationGroups.length === 0 ? (
                  <EmptyState
                    icon={Pill}
                    title="No treatments found"
                    description="You don't have any active treatments. Treatments are created when a doctor writes a prescription."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {medicationGroups.map((group) => (
                      <TreatmentCard
                        key={`${group.medicationName}-${group.dosage}`}
                        entry={{
                          id: group.entries[0]!._id,
                          patientId:
                            typeof group.entries[0]!.patientId === "string"
                              ? group.entries[0]!.patientId
                              : String(group.entries[0]!.patientId),
                          prescriptionId:
                            typeof group.entries[0]!.prescriptionId === "string"
                              ? group.entries[0]!.prescriptionId
                              : String(group.entries[0]!.prescriptionId),
                          medicationName: group.medicationName,
                          dosage: group.dosage,
                          scheduledTime: group.entries[0]!.scheduledTime,
                          status: group.entries[0]!.status,
                        }}
                        nextDose={
                          group.nextDose
                            ? {
                                id: group.nextDose._id,
                                patientId: String(group.nextDose.patientId),
                                prescriptionId: String(
                                  group.nextDose.prescriptionId
                                ),
                                medicationName: group.nextDose.medicationName,
                                dosage: group.nextDose.dosage,
                                scheduledTime: group.nextDose.scheduledTime,
                                status: group.nextDose.status,
                              }
                            : undefined
                        }
                        adherenceRate={group.adherenceRate}
                        totalDoses={group.totalDoses}
                        takenDoses={group.takenDoses}
                        prescriptionStatus={group.prescriptionStatus}
                        onMarkTaken={(id) => markDose(id, "taken")}
                        onMarkSkipped={(id) => markDose(id, "skipped")}
                        onReportSideEffect={handleReportSideEffect}
                        onBulkAction={handleBulkAction}
                        loading={actionLoading}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {!loading && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-3">
                    <p className="text-sm text-slate-500">
                      Showing{" "}
                      {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} entries
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPrev}
                        onClick={() => fetchEntries(pagination.page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-slate-700">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNext}
                        onClick={() => fetchEntries(pagination.page + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            label: "Today's Timeline",
            value: "timeline",
            content: (
              <div className="pt-2">
                {loading ? (
                  <TableSkeleton rows={5} />
                ) : (
                  <DoseTimeline
                    doses={todayDoses}
                    onMarkStatus={(id, status) => markDose(id, status)}
                    loading={actionLoading}
                  />
                )}
              </div>
            ),
          },
          {
            label: "Analytics",
            value: "analytics",
            content: (
              <div className="pt-2">
                {statsLoading || !adherenceStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-[80px] animate-pulse rounded-xl border border-slate-200 bg-slate-100"
                        />
                      ))}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="h-[320px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                      <div className="h-[320px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <AdherenceChart
                      dailyBreakdown={adherenceStats.dailyBreakdown}
                      overallRate={adherenceStats.overallRate}
                      currentStreak={adherenceStats.currentStreak}
                      longestStreak={adherenceStats.longestStreak}
                      totalTaken={adherenceStats.totalTaken}
                      totalMissed={adherenceStats.totalMissed}
                    />

                    {/* Per-medication breakdown */}
                    {Object.keys(adherenceStats.byMedication).length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-4">
                          <h3 className="text-sm font-semibold text-slate-900">
                            Adherence by Medication
                          </h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {Object.entries(
                            adherenceStats.byMedication
                          ).map(([name, stats]) => (
                            <div
                              key={name}
                              className="flex items-center justify-between px-6 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                                  <Pill className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {stats.taken} taken &middot;{" "}
                                    {stats.missed} missed &middot;{" "}
                                    {stats.skipped} skipped
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      stats.rate >= 80
                                        ? "bg-green-500"
                                        : stats.rate >= 60
                                          ? "bg-amber-500"
                                          : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${stats.rate}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`text-sm font-semibold min-w-[40px] text-right ${
                                    stats.rate >= 80
                                      ? "text-green-600"
                                      : stats.rate >= 60
                                        ? "text-amber-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {stats.rate}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ),
          },
          {
            label: "Weekly Schedule",
            value: "schedule",
            content: (
              <div className="pt-2">
                {loading ? (
                  <TableSkeleton rows={4} />
                ) : (
                  <MedicationSchedule entries={entries} />
                )}
              </div>
            ),
          },
        ]}
        defaultValue="overview"
      />

      {/* Side Effect Dialog */}
      {sideEffectTarget && (
        <SideEffectForm
          open={sideEffectOpen}
          onOpenChange={(open) => {
            setSideEffectOpen(open);
            if (!open) setSideEffectTarget(null);
          }}
          medicationName={sideEffectTarget.medicationName}
          treatmentEntryId={sideEffectTarget.entryId}
          onSubmit={handleSideEffectSubmit}
          loading={sideEffectLoading}
        />
      )}
    </div>
  );
}
