"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  Pill,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScheduleEntry {
  _id: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  status: "pending" | "taken" | "missed" | "skipped";
  takenAt?: string;
}

interface MedicationScheduleProps {
  entries: ScheduleEntry[];
  /** Start of the week (default: current week starting Monday) */
  weekStart?: Date;
  className?: string;
}

function getStatusIcon(status: ScheduleEntry["status"], small = false) {
  const size = small ? "h-3 w-3" : "h-3.5 w-3.5";
  switch (status) {
    case "taken":
      return <CheckCircle2 className={`${size} text-green-500`} />;
    case "missed":
      return <XCircle className={`${size} text-red-500`} />;
    case "skipped":
      return <SkipForward className={`${size} text-slate-400`} />;
    case "pending":
      return <Clock className={`${size} text-blue-500`} />;
  }
}

function getStatusBg(status: ScheduleEntry["status"]): string {
  switch (status) {
    case "taken":
      return "bg-green-50 border-green-200 text-green-800";
    case "missed":
      return "bg-red-50 border-red-200 text-red-800";
    case "skipped":
      return "bg-slate-50 border-slate-200 text-slate-600";
    case "pending":
      return "bg-blue-50 border-blue-200 text-blue-800";
  }
}

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Time slots for the schedule grid
const TIME_SLOTS = [
  { label: "Morning", range: [5, 12] as const },
  { label: "Afternoon", range: [12, 17] as const },
  { label: "Evening", range: [17, 21] as const },
  { label: "Night", range: [21, 29] as const }, // 29 = 5am next day
];

export default function MedicationSchedule({
  entries,
  weekStart,
  className = "",
}: MedicationScheduleProps) {
  const monday = weekStart ?? getMonday(new Date());
  const weekDays = useMemo(() => getWeekDays(monday), [monday]);
  const today = new Date();

  // Group entries by day and time slot
  const grid = useMemo(() => {
    const result: Record<
      string,
      Record<string, ScheduleEntry[]>
    > = {};

    for (const day of weekDays) {
      const dayKey = day.toISOString().split("T")[0]!;
      result[dayKey] = {};
      for (const slot of TIME_SLOTS) {
        result[dayKey]![slot.label] = [];
      }
    }

    for (const entry of entries) {
      const entryDate = new Date(entry.scheduledTime);
      const dayKey = entryDate.toISOString().split("T")[0]!;
      if (!result[dayKey]) continue;

      const hour = entryDate.getHours();
      for (const slot of TIME_SLOTS) {
        const [start, end] = slot.range;
        if (hour >= start && hour < (end > 24 ? end - 24 : end)) {
          result[dayKey]![slot.label]!.push(entry);
          break;
        }
      }
    }

    return result;
  }, [entries, weekDays]);

  const dayLabels = weekDays.map((d) => ({
    short: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "short" }),
    isToday: isSameDay(d, today),
    key: d.toISOString().split("T")[0]!,
  }));

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Pill className="h-4 w-4 text-blue-500" />
          Weekly Medication Schedule
          <span className="ml-auto text-xs font-normal text-slate-400">
            {weekDays[0]!.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {weekDays[6]!.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Pill className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              No medications scheduled this week
            </p>
          </div>
        ) : (
          <div className="min-w-[640px]">
            {/* Header row: days */}
            <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-px bg-slate-200 rounded-t-lg overflow-hidden">
              <div className="bg-slate-50 p-2" />
              {dayLabels.map((day) => (
                <div
                  key={day.key}
                  className={`p-2 text-center ${
                    day.isToday
                      ? "bg-blue-50"
                      : "bg-slate-50"
                  }`}
                >
                  <p
                    className={`text-xs font-medium ${
                      day.isToday ? "text-blue-600" : "text-slate-600"
                    }`}
                  >
                    {day.short}
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      day.isToday ? "text-blue-700" : "text-slate-900"
                    }`}
                  >
                    {day.date}
                  </p>
                </div>
              ))}
            </div>

            {/* Time slot rows */}
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.label}
                className="grid grid-cols-[100px_repeat(7,1fr)] gap-px bg-slate-200"
              >
                <div className="bg-white p-2 flex items-center">
                  <span className="text-xs font-medium text-slate-500">
                    {slot.label}
                  </span>
                </div>
                {dayLabels.map((day) => {
                  const cellEntries = grid[day.key]?.[slot.label] || [];
                  return (
                    <div
                      key={`${day.key}-${slot.label}`}
                      className={`min-h-[60px] p-1.5 ${
                        day.isToday ? "bg-blue-50/30" : "bg-white"
                      }`}
                    >
                      {cellEntries.length === 0 ? (
                        <div className="h-full" />
                      ) : (
                        <div className="space-y-1">
                          {cellEntries.map((entry) => (
                            <div
                              key={entry._id}
                              className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs ${getStatusBg(entry.status)}`}
                              title={`${entry.medicationName} ${entry.dosage} - ${formatTime(entry.scheduledTime)}`}
                            >
                              {getStatusIcon(entry.status, true)}
                              <span className="truncate font-medium">
                                {entry.medicationName}
                              </span>
                              <span className="ml-auto text-[10px] opacity-70 shrink-0">
                                {formatTime(entry.scheduledTime)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-3 px-1">
              {[
                { label: "Taken", color: "bg-green-500" },
                { label: "Missed", color: "bg-red-500" },
                { label: "Skipped", color: "bg-slate-300" },
                { label: "Pending", color: "bg-blue-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                  />
                  <span className="text-xs text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
