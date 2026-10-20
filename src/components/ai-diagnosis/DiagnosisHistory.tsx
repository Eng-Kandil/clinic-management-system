"use client";

import { useState } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Zap,
  Filter,
  Calendar,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Condition {
  name: string;
  probability: number;
  description: string;
}

interface DiagnosisRecord {
  _id: string;
  symptoms: string[];
  additionalInfo?: string;
  result: {
    conditions: Condition[];
    recommendations: string[];
    urgencyLevel: "low" | "medium" | "high" | "emergency";
    disclaimer: string;
  };
  status: "pending" | "completed" | "reviewed" | "dismissed";
  doctorNotes?: string;
  createdAt: string;
}

interface DiagnosisHistoryProps {
  diagnoses: DiagnosisRecord[];
  isLoading: boolean;
  onFilterChange?: (filters: HistoryFilters) => void;
}

export interface HistoryFilters {
  status?: string;
  urgencyLevel?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Urgency helpers ──────────────────────────────────────────────────────────

const URGENCY_META = {
  low: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    badgeVariant: "success" as const,
  },
  medium: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badgeVariant: "warning" as const,
  },
  high: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badgeVariant: "warning" as const,
  },
  emergency: {
    icon: Zap,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badgeVariant: "danger" as const,
  },
};

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }
> = {
  pending: { label: "Pending", variant: "default" },
  completed: { label: "Completed", variant: "info" },
  reviewed: { label: "Reviewed", variant: "success" },
  dismissed: { label: "Dismissed", variant: "danger" },
};

// ── Skeleton for loading ─────────────────────────────────────────────────────

function HistoryCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
          </div>
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
            <div className="h-6 w-14 animate-pulse rounded-full bg-slate-200" />
            <div className="h-6 w-18 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="h-8 w-8 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DiagnosisHistory({
  diagnoses,
  isLoading,
  onFilterChange,
}: DiagnosisHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({});

  const handleFilterChange = (key: keyof HistoryFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange?.({});
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <HistoryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Filter bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {diagnoses.length} diagnosis record{diagnoses.length !== 1 && "s"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(hasActiveFilters && "border-blue-300 text-blue-600")}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="">All</option>
                <option value="completed">Completed</option>
                <option value="reviewed">Reviewed</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Urgency
              </label>
              <select
                value={filters.urgencyLevel || ""}
                onChange={(e) =>
                  handleFilterChange("urgencyLevel", e.target.value)
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) =>
                  handleFilterChange("dateFrom", e.target.value)
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-red-500 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {diagnoses.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Activity className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No diagnosis records yet
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">
            Run your first AI diagnosis to start building your health history.
          </p>
        </div>
      )}

      {/* ── Diagnosis cards ───────────────────────────────────────── */}
      {diagnoses.map((d) => {
        const isExpanded = expandedId === d._id;
        const urgencyMeta = URGENCY_META[d.result.urgencyLevel];
        const statusMeta = STATUS_META[d.status] || STATUS_META.completed!;
        const UrgencyIcon = urgencyMeta.icon;
        const topCondition = d.result.conditions[0];
        const date = new Date(d.createdAt);

        return (
          <div
            key={d._id}
            className={cn(
              "rounded-xl border bg-white shadow-sm transition-all",
              isExpanded ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"
            )}
          >
            {/* Card header */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : d._id)}
              className="flex w-full items-start gap-4 p-5 text-left"
            >
              {/* Urgency icon */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  urgencyMeta.bg
                )}
              >
                <UrgencyIcon className={cn("h-5 w-5", urgencyMeta.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={urgencyMeta.badgeVariant}>
                    {d.result.urgencyLevel.charAt(0).toUpperCase() +
                      d.result.urgencyLevel.slice(1)}
                  </Badge>
                  <Badge variant={statusMeta.variant}>
                    {statusMeta.label}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Top condition */}
                {topCondition && (
                  <p className="mt-2 text-sm font-medium text-slate-900 truncate">
                    {topCondition.name}{" "}
                    <span className="font-normal text-slate-500">
                      — {Math.round(topCondition.probability * 100)}% match
                    </span>
                  </p>
                )}

                {/* Symptom chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.symptoms.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {s}
                    </span>
                  ))}
                  {d.symptoms.length > 4 && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      +{d.symptoms.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Expand icon */}
              <div className="shrink-0 text-slate-400">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* All conditions */}
                <div className="mb-4">
                  <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Possible Conditions
                  </h5>
                  <div className="space-y-2">
                    {d.result.conditions.map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-800">
                              {c.name}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 tabular-nums">
                              {Math.round(c.probability * 100)}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                c.probability >= 0.6
                                  ? "bg-orange-500"
                                  : c.probability >= 0.35
                                  ? "bg-amber-400"
                                  : "bg-slate-300"
                              )}
                              style={{
                                width: `${Math.round(c.probability * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {c.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mb-4">
                  <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recommendations
                  </h5>
                  <ol className="space-y-1.5">
                    {d.result.recommendations.map((r, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-slate-600"
                      >
                        <span className="shrink-0 font-semibold text-blue-600">
                          {i + 1}.
                        </span>
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Doctor notes */}
                {d.doctorNotes && (
                  <div className="mb-4 rounded-lg bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-800">
                      Doctor Notes
                    </p>
                    <p className="mt-1 text-sm text-blue-700">
                      {d.doctorNotes}
                    </p>
                  </div>
                )}

                {/* Additional info */}
                {d.additionalInfo && (
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Additional Information Provided
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {d.additionalInfo}
                    </p>
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
