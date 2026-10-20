"use client";

import {
  Pill,
  Clock,
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  Pause,
  Play,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TreatmentEntry } from "@/types";

// ── Circular progress ring ───────────────────────────────────
function CircularProgress({
  value,
  size = 64,
  strokeWidth = 5,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color =
    value >= 80
      ? "text-green-500"
      : value >= 60
        ? "text-amber-500"
        : "text-red-500";

  const bgColor =
    value >= 80
      ? "text-green-100"
      : value >= 60
        ? "text-amber-100"
        : "text-red-100";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle
          className={bgColor}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <circle
          className={color}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700"
      >
        {value}%
      </span>
    </div>
  );
}

// ── Status badge variant mapping ─────────────────────────────
function getStatusVariant(
  status: string
): "success" | "warning" | "danger" | "info" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "completed":
      return "info";
    case "discontinued":
      return "danger";
    default:
      return "default";
  }
}

// ── Time helpers ─────────────────────────────────────────────
function getNextDoseText(scheduledTime: string): string {
  const now = new Date();
  const dose = new Date(scheduledTime);
  const diffMs = dose.getTime() - now.getTime();

  if (diffMs < 0) return "Overdue";

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `in ${diffMin}m`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `in ${diffHrs}h ${diffMin % 60}m`;

  const diffDays = Math.floor(diffHrs / 24);
  return `in ${diffDays}d`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Props ────────────────────────────────────────────────────
export interface TreatmentCardEntry extends TreatmentEntry {
  adherenceRate?: number;
  prescriptionStatus?: "active" | "completed" | "cancelled";
}

interface TreatmentCardProps {
  entry: TreatmentCardEntry;
  /** The next pending dose for this medication (if any) */
  nextDose?: TreatmentCardEntry;
  /** Aggregated adherence rate for this medication */
  adherenceRate: number;
  /** Total doses for context (e.g. "12 of 30 taken") */
  totalDoses?: number;
  takenDoses?: number;
  /** Prescription-level status */
  prescriptionStatus?: string;
  onMarkTaken?: (entryId: string) => void;
  onMarkSkipped?: (entryId: string) => void;
  onReportSideEffect?: (entryId: string) => void;
  onBulkAction?: (
    entryId: string,
    action: "pause" | "resume" | "discontinue" | "complete"
  ) => void;
  loading?: boolean;
}

export default function TreatmentCard({
  entry,
  nextDose,
  adherenceRate,
  totalDoses,
  takenDoses,
  prescriptionStatus = "active",
  onMarkTaken,
  onMarkSkipped,
  onReportSideEffect,
  onBulkAction,
  loading = false,
}: TreatmentCardProps) {
  const isActive = prescriptionStatus === "active";

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      {/* Top color accent based on adherence */}
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          adherenceRate >= 80
            ? "bg-green-500"
            : adherenceRate >= 60
              ? "bg-amber-500"
              : "bg-red-500"
        }`}
      />

      <CardContent className="p-5 pt-6">
        {/* Header: Medication name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Pill className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 truncate">
                {entry.medicationName}
              </h3>
              <p className="text-xs text-slate-500">{entry.dosage}</p>
            </div>
          </div>

          <Badge variant={getStatusVariant(prescriptionStatus)}>
            {prescriptionStatus}
          </Badge>
        </div>

        {/* Stats row: Adherence ring + next dose */}
        <div className="mt-4 flex items-center gap-4">
          <CircularProgress value={adherenceRate} size={56} strokeWidth={4} />
          <div className="flex-1 space-y-1.5">
            {totalDoses !== undefined && takenDoses !== undefined && (
              <p className="text-xs text-slate-500">
                {takenDoses} of {totalDoses} doses taken
              </p>
            )}
            {nextDose && nextDose.status === "pending" ? (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-slate-600">
                  Next: {formatTime(nextDose.scheduledTime)}{" "}
                  <span className="text-blue-600 font-medium">
                    ({getNextDoseText(nextDose.scheduledTime)})
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                <span>No upcoming doses</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {isActive && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            {nextDose && nextDose.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onMarkTaken?.(nextDose.id)}
                  disabled={loading}
                  className="h-7 gap-1 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Take Dose
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMarkSkipped?.(nextDose.id)}
                  disabled={loading}
                  className="h-7 gap-1 text-xs"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReportSideEffect?.(entry.id)}
              disabled={loading}
              className="h-7 gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Side Effect
            </Button>

            {/* Bulk actions (doctor/admin) */}
            {onBulkAction && (
              <div className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onBulkAction(entry.id, "pause")}
                  disabled={loading}
                  className="h-7 w-7 p-0"
                  title="Pause treatment"
                >
                  <Pause className="h-3.5 w-3.5 text-amber-500" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onBulkAction(entry.id, "resume")}
                  disabled={loading}
                  className="h-7 w-7 p-0"
                  title="Resume treatment"
                >
                  <Play className="h-3.5 w-3.5 text-green-500" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onBulkAction(entry.id, "discontinue")}
                  disabled={loading}
                  className="h-7 w-7 p-0"
                  title="Discontinue treatment"
                >
                  <Ban className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { CircularProgress };
