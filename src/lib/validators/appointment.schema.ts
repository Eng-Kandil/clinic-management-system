import { z } from "zod";

// ─── Create Appointment ─────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  doctorId: z.string().min(1, "Doctor is required"),
  dateTime: z.string().datetime("Invalid date/time format"),
  endTime: z.string().datetime("Invalid end time format"),
  type: z.enum(["in-person", "remote"]),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason must be at most 500 characters"),
  notes: z.string().max(1000, "Notes must be at most 1000 characters").optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// ─── Update Appointment ─────────────────────────────────────────────────────

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: z
    .enum([
      "scheduled",
      "confirmed",
      "in-progress",
      "completed",
      "cancelled",
      "no-show",
    ])
    .optional(),
  cancelReason: z.string().optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// ─── Reschedule Appointment ─────────────────────────────────────────────────

export const rescheduleAppointmentSchema = z.object({
  dateTime: z.string().datetime("Invalid date/time format"),
  endTime: z.string().datetime("Invalid end time format"),
  reason: z.string().min(1, "Reschedule reason is required"),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
