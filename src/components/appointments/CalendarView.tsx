"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarAppointment {
  _id: string;
  dateTime: string;
  status: string;
  type: string;
  reason: string;
  doctorId?: { user?: { name: string } };
  patientId?: { user?: { name: string } };
}

interface CalendarViewProps {
  appointments: CalendarAppointment[];
  onSelectDate: (date: Date) => void;
  onSelectAppointment?: (appointment: CalendarAppointment) => void;
  selectedDate?: Date | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusDotColors: Record<string, string> = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  "in-progress": "bg-amber-500",
  completed: "bg-slate-400",
  cancelled: "bg-red-500",
  "no-show": "bg-red-300",
};

export default function CalendarView({
  appointments,
  onSelectDate,
  onSelectAppointment,
  selectedDate,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  // Build day cells
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Map appointments by date
  const appointmentsByDate = new Map<string, CalendarAppointment[]>();
  for (const appt of appointments) {
    const dateKey = format(new Date(appt.dateTime), "yyyy-MM-dd");
    const existing = appointmentsByDate.get(dateKey) || [];
    existing.push(appt);
    appointmentsByDate.set(dateKey, existing);
  }

  const selectedDayStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedDayAppointments = selectedDayStr
    ? appointmentsByDate.get(selectedDayStr) || []
    : [];

  return (
    <div className="space-y-4">
      {/* Calendar Grid */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Month Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-slate-900">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="px-2 py-2 text-center text-xs font-medium text-slate-500"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dateKey = format(d, "yyyy-MM-dd");
            const dayAppointments = appointmentsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(d, currentMonth);
            const isToday = isSameDay(d, new Date());
            const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;

            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectDate(d)}
                className={cn(
                  "relative min-h-[72px] border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-blue-50",
                  !isCurrentMonth && "bg-slate-50/50",
                  isSelected && "bg-blue-50 ring-1 ring-inset ring-blue-200"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday && "bg-blue-600 text-white font-semibold",
                    !isToday && isCurrentMonth && "text-slate-700",
                    !isToday && !isCurrentMonth && "text-slate-300"
                  )}
                >
                  {d.getDate()}
                </span>

                {/* Appointment dots */}
                {dayAppointments.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dayAppointments.slice(0, 3).map((appt) => (
                      <div
                        key={appt._id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          statusDotColors[appt.status] || "bg-slate-400"
                        )}
                      />
                    ))}
                    {dayAppointments.length > 3 && (
                      <span className="text-[10px] text-slate-400">
                        +{dayAppointments.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Appointments */}
      {selectedDate && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Appointments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h3>
          {selectedDayAppointments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center">
              <p className="text-sm text-slate-400">No appointments on this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayAppointments.map((appt) => (
                <div
                  key={appt._id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-blue-200 cursor-pointer transition-colors"
                  onClick={() => onSelectAppointment?.(appt)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          statusDotColors[appt.status] || "bg-slate-400"
                        )}
                      />
                      <span className="text-sm font-medium text-slate-900">
                        {format(new Date(appt.dateTime), "h:mm a")}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{appt.type}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{appt.reason}</p>
                    {appt.doctorId?.user?.name && (
                      <p className="text-xs text-slate-400">Dr. {appt.doctorId.user.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
