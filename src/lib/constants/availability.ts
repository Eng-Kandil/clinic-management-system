import type { IAvailableSlot } from "@/lib/db/models/Doctor";

// ---------------------------------------------------------------------------
// Shared availability defaults — used when auto-creating a doctor profile and
// to pre-fill the availability editor for doctors who haven't set a schedule.
// dayOfWeek: 0 = Sunday … 6 = Saturday. Times are "HH:mm" (24h, clinic local).
// ---------------------------------------------------------------------------

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Default working schedule: Monday–Friday, 09:00–17:00. */
export const DEFAULT_AVAILABLE_SLOTS: IAvailableSlot[] = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
];
