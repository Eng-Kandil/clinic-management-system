import { z } from "zod";

// ─── Vitals ──────────────────────────────────────────────────────────────────

export const vitalsSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.number().min(0).max(300).optional(),
  temperature: z.number().min(25).max(45).optional(),
  weight: z.number().min(0).max(500).optional(),
  height: z.number().min(0).max(300).optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  respiratoryRate: z.number().min(0).max(100).optional(),
});

export type VitalsInput = z.infer<typeof vitalsSchema>;

// ─── Lab Result ──────────────────────────────────────────────────────────────

export const LabResultSchema = z.object({
  test: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  normalRange: z.string().optional(),
  date: z.string().optional(),
});

export type LabResultInput = z.infer<typeof LabResultSchema>;

// ─── Attachment Reference ─────────────────────────────────────────────────────

export const AttachmentRefSchema = z.object({
  fileUploadId: z.string(),
  name: z.string(),
  mime: z.string().optional(),
});

export type AttachmentRefInput = z.infer<typeof AttachmentRefSchema>;

// ─── Create Medical Record ───────────────────────────────────────────────────

export const createMedicalRecordSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  appointmentId: z.string().optional(),
  visitDate: z.string().datetime("Invalid visit date format"),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  symptoms: z.array(z.string()).min(1, "At least one symptom is required"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  vitals: vitalsSchema.optional(),
  treatmentPlan: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  labResults: z.array(LabResultSchema).optional(),
  attachments: z.array(AttachmentRefSchema).optional(),
});

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;

// ─── Update Medical Record ───────────────────────────────────────────────────

export const updateMedicalRecordSchema = createMedicalRecordSchema
  .omit({ patientId: true })
  .partial();

export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>;
