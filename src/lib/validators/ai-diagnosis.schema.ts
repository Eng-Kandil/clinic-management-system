import { z } from "zod";

// ─── Symptom Check Schema ────────────────────────────────────────────────────

export const symptomCheckSchema = z.object({
  symptoms: z
    .array(z.string().min(1, "Symptom cannot be empty").trim())
    .min(1, "At least one symptom is required")
    .max(20, "Maximum 20 symptoms allowed"),
  additionalInfo: z
    .string()
    .max(2000, "Additional info must be under 2000 characters")
    .optional(),
  patientAge: z
    .number()
    .int("Age must be a whole number")
    .min(0, "Age cannot be negative")
    .max(150, "Invalid age")
    .optional(),
  patientGender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .optional(),
});

export type SymptomCheckInput = z.infer<typeof symptomCheckSchema>;

// ─── Review Diagnosis Schema ─────────────────────────────────────────────────

export const reviewDiagnosisSchema = z.object({
  diagnosisId: z.string().min(1, "Diagnosis ID is required"),
  status: z.enum(["reviewed", "dismissed"]),
  doctorNotes: z
    .string()
    .max(5000, "Doctor notes must be under 5000 characters")
    .optional(),
});

export type ReviewDiagnosisInput = z.infer<typeof reviewDiagnosisSchema>;

// ─── History Query Schema ────────────────────────────────────────────────────

export const diagnosisHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z
    .enum(["pending", "completed", "reviewed", "dismissed"])
    .optional(),
  urgencyLevel: z
    .enum(["low", "medium", "high", "emergency"])
    .optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type DiagnosisHistoryQuery = z.infer<typeof diagnosisHistoryQuerySchema>;
