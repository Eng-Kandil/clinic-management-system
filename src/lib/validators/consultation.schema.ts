import { z } from "zod";

// ─── Create Consultation (Voice / Chat) ──────────────────────────────────────

export const createConsultationSchema = z.object({
  appointmentId: z.string().min(1).optional(),
  // Optional: patients create for themselves (derived from the session); only
  // doctors/admins must specify which patient.
  patientId: z.string().min(1).optional(),
  doctorId: z.string().min(1, "Doctor ID is required"),
  type: z.enum(["chat", "voice", "video"]),
  scheduledAt: z.string().datetime("Invalid scheduled date/time").optional(),
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

// ─── Update Consultation ─────────────────────────────────────────────────────

export const updateConsultationSchema = z.object({
  status: z
    .enum(["scheduled", "in-progress", "completed", "cancelled"])
    .optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  recordingUrl: z.string().url().optional(),
});

export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;

// ─── Chat Message ────────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID is required"),
  senderId: z.string().min(1, "Sender ID is required"),
  content: z.string().min(1, "Message content is required").max(5000),
  type: z.enum(["text", "image", "file"]).default("text"),
  fileUrl: z.string().url().optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
