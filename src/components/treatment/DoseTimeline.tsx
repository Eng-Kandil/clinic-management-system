"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  Pill,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DoseEntry {
  _id: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  status: "pending" | "taken" | "missed" | "skipped";
  takenAt?: string;
  notes?: string;
}

interface DoseTimelineProps {
  doses: DoseEntry[];
  onMarkStatus?: (
    entryId: string,
    status: "taken" | "missed" | "skipped"
  ) => void;
  loading?: boolean;
  className?: string;
}

function StatusIcon({ status }: { status: DoseEntry["status"] }) {
  switch (status) {
    case "taken":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "missed":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "skipped":
      return <SkipForward className="h-5 w-5 text-slate-400" />;
    case "pending":
      return <Clock className="h-5 w-5 text-blue-500" />;
  }
}

function getStatusBg(status: DoseEntry["status"]): string {
  switch (status) {
    case "taken":
      return "bg-green-50 border-green-200";
    case "missed":
      return "bg-red-50 border-red-200";
    case "skipped":
      return "bg-slate-50 border-slate-200";
    case "pending":
      return "bg-blue-50 border-blue-200";
  }
}

function getTimelineColor(status: DoseEntry["status"]): string {
  switch (status) {
    case "taken":
      return "bg-green-500";
    case "missed":
      return "bg-red-500";
    case "skipped":
      return "bg-slate-300";
    case "pending":
      return "bg-blue-500";
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

export default function DoseTimeline({
  doses,
  onMarkStatus,
  loading = false,
  className = "",
}: DoseTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort by scheduledTime
  const sorted = [...doses].sort(
    (a, b) =>
      new Date(a.scheduledTime).getTime() -
      new Date(b.scheduledTime).getTime()
  );

  // Find the next pending dose (for highlighting)
  const nextPending = sorted.find(
    (d) => d.status === "pending" && !isPast(d.scheduledTime)
  );

  if (sorted.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            No doses scheduled for today
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Check back when you have active prescriptions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Clock className="h-4 w-4 text-blue-500" />
          Today&apos;s Doses
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative space-y-0">
          {sorted.map((dose, index) => {
            const isNext = nextPending?._id === dose._id;
            const isExpanded = expandedId === dose._id;
            const isLast = index === sorted.length - 1;
            const canMarkStatus =
              dose.status === "pending" && onMarkStatus;

            return (
              <div key={dose._id} className="relative flex gap-3">
                {/* Timeline line */}
                {!isLast && (
                  <div
                    className={`absolute left-[11px] top-[28px] w-0.5 ${getTimelineColor(dose.status)}`}
                    style={{ height: "calc(100% - 4px)" }}
                  />
                )}

                {/* Timeline dot */}
                <div className="relative z-10 mt-1.5 flex shrink-0">
                  <div
                    className={`h-[22px] w-[22px] rounded-full border-2 border-white shadow-sm flex items-center justify-center ${getTimelineColor(dose.status)} ${
                      isNext ? "ring-2 ring-blue-300 ring-offset-1" : ""
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                </div>

                {/* Content */}
                <div
                  className={`mb-3 flex-1 rounded-lg border p-3 transition-all ${getStatusBg(dose.status)} ${
                    isNext
                      ? "ring-1 ring-blue-300 shadow-sm"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon status={dose.status} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Pill className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {dose.medicationName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {dose.dosage} &middot; {formatTime(dose.scheduledTime)}
                        </p>
                      </div>
                    </div>

                    {/* Status label or quick action */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {dose.status === "taken" && dose.takenAt && (
                        <span className="text-xs text-green-600">
                          Taken at {formatTime(dose.takenAt)}
                        </span>
                      )}
                      {dose.status === "missed" && (
                        <span className="text-xs text-red-600">Missed</span>
                      )}
                      {dose.status === "skipped" && (
                        <span className="text-xs text-slate-500">
                          Skipped
                        </span>
                      )}
                      {canMarkStatus && (
                        <Button
                          size="sm"
                          variant="success"
                          className="h-6 gap-1 px-2 text-xs"
                          disabled={loading}
                          onClick={() =>
                            onMarkStatus(dose._id, "taken")
                          }
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Take
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded actions */}
                  {canMarkStatus && (
                    <div className="mt-2">
                      <button
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : dose._id)
                        }
                      >
                        {isExpanded ? "Less options" : "More options"}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 gap-1 px-2 text-xs"
                            disabled={loading}
                            onClick={() =>
                              onMarkStatus(dose._id, "skipped")
                            }
                          >
                            <SkipForward className="h-3 w-3" />
                            Skip
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 gap-1 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={loading}
                            onClick={() =>
                              onMarkStatus(dose._id, "missed")
                            }
                          >
                            <XCircle className="h-3 w-3" />
                            Mark Missed
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {dose.notes && (
                    <p className="mt-1.5 text-xs text-slate-500 italic">
                      {dose.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
