import { z } from "zod";

export const SideEffectSchema = z.object({
  symptom: z.string().min(1, "Symptom is required"),
  severity: z.enum(["mild", "moderate", "severe"]),
  occurredAt: z.string().optional(), // ISO date string
});

export const TreatmentSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().optional(),
  name: z.string().min(1, "Treatment name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
});

export const TreatmentTrackingSchema = z.object({
  treatmentId: z.string().min(1),
  takenAt: z.string().optional(),
  status: z.enum(["taken", "missed", "skipped"]).default("taken"),
  notes: z.string().optional(),
  sideEffects: z.array(SideEffectSchema).optional(),
});
