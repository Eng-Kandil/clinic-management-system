"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlotInfo {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  selectedDate: Date | null;
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
  /** Reserved for future hints; current implementation relies on availableSlots. */
  bookedSlots?: string[];
  /** Actual available slots returned from the doctor slots API. */
  availableSlots?: SlotInfo[];
  loading?: boolean;
}

function formatTimeSlot(time: string): string {
  const [hours = "0", minutes = "00"] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default function TimeSlotPicker({
  selectedDate,
  selectedSlot,
  onSelectSlot,
  availableSlots,
  loading = false,
}: TimeSlotPickerProps) {
  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-center">
        <Clock className="h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-400">
          Select a date to see available time slots
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Render only the slots the API returned. No client-side fallback list — if
  // the API has nothing for this date, surface an explicit empty state so the
  // patient picks another day instead of trying to book a fictitious slot.
  const slotsToRender: { time: string; disabled: boolean }[] = (
    availableSlots ?? []
  ).map((s) => ({
    time: s.startTime,
    disabled: !s.available,
  }));

  if (slotsToRender.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-center">
        <Clock className="h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-400">
          No slots available — please pick another date.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        Available Time Slots for{" "}
        {selectedDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {slotsToRender.map(({ time, disabled }) => {
          const isSelected = selectedSlot === time;

          return (
            <button
              key={time}
              type="button"
              disabled={disabled}
              onClick={() => onSelectSlot(time)}
              className={cn(
                "flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                disabled
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                  : isSelected
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              )}
            >
              {formatTimeSlot(time)}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border border-slate-200 bg-white" />
          <span className="text-xs text-slate-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-blue-600" />
          <span className="text-xs text-slate-500">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-slate-100" />
          <span className="text-xs text-slate-500">Booked</span>
        </div>
      </div>
    </div>
  );
}
