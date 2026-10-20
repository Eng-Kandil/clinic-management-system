import { z } from "zod";

// ─── Medication Item ─────────────────────────────────────────────────────────

export const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
});

export type MedicationInput = z.infer<typeof medicationSchema>;

// ─── Create Prescription ─────────────────────────────────────────────────────

export const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  // Optional: a doctor can prescribe standalone (quick "add medication") or tie
  // the prescription to an existing medical record.
  medicalRecordId: z.string().min(1).optional(),
  medications: z
    .array(medicationSchema)
    .min(1, "At least one medication is required"),
  notes: z.string().optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

// ─── Update Prescription ─────────────────────────────────────────────────────

export const updatePrescriptionSchema = z.object({
  medications: z.array(medicationSchema).min(1).optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
