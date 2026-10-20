import { z } from "zod";

// ─── Blood Types ─────────────────────────────────────────────────────────────

const bloodTypeEnum = z.enum([
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
]);

// ─── Register as Donor ───────────────────────────────────────────────────────

export const registerDonorSchema = z.object({
  bloodType: bloodTypeEnum,
  dateOfBirth: z.string().datetime("Invalid date of birth"),
  weight: z.number().min(50, "Minimum weight to donate is 50 kg"),
  lastDonationDate: z.string().datetime().optional(),
  medicalConditions: z.array(z.string()).optional(),
  contactPhone: z.string().min(1, "Contact phone is required"),
  isAvailable: z.boolean().default(true),
});

export type RegisterDonorInput = z.infer<typeof registerDonorSchema>;

// ─── Create Blood Request ────────────────────────────────────────────────────

export const createBloodRequestSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  bloodType: bloodTypeEnum,
  units: z.number().int().min(1, "At least 1 unit is required").max(10),
  urgency: z.enum(["normal", "urgent", "critical"]),
  reason: z.string().min(1, "Reason is required").max(500),
  requiredBy: z.string().datetime("Invalid required-by date"),
  hospitalName: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateBloodRequestInput = z.infer<typeof createBloodRequestSchema>;

// ─── Update Blood Request ────────────────────────────────────────────────────

export const updateBloodRequestSchema = z.object({
  status: z
    .enum(["pending", "matched", "fulfilled", "cancelled", "expired"])
    .optional(),
  matchedDonorId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateBloodRequestInput = z.infer<typeof updateBloodRequestSchema>;

// ─── Record Donation ─────────────────────────────────────────────────────────

export const recordDonationSchema = z.object({
  donorId: z.string().min(1, "Donor ID is required"),
  bloodRequestId: z.string().optional(),
  bloodType: bloodTypeEnum,
  units: z.number().int().min(1).max(3),
  donationDate: z.string().datetime("Invalid donation date"),
  collectionCenter: z.string().min(1, "Collection center is required"),
  notes: z.string().max(1000).optional(),
});

export type RecordDonationInput = z.infer<typeof recordDonationSchema>;
