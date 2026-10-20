import { z } from "zod";

// ─── Billing Item ────────────────────────────────────────────────────────────

export const billingItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  code: z.string().optional(), // CPT or internal billing code
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  discount: z.number().min(0).max(100).default(0), // percentage
  tax: z.number().min(0).max(100).default(0), // percentage
});

export type BillingItemInput = z.infer<typeof billingItemSchema>;

// ─── Create Invoice ──────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  appointmentId: z.string().optional(),
  items: z.array(billingItemSchema).min(1, "At least one billing item is required"),
  notes: z.string().max(1000).optional(),
  dueDate: z.string().datetime("Invalid due date"),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ─── Update Invoice ──────────────────────────────────────────────────────────

export const updateInvoiceSchema = z.object({
  items: z.array(billingItemSchema).min(1).optional(),
  status: z
    .enum(["draft", "sent", "paid", "partially_paid", "overdue", "cancelled", "refunded"])
    .optional(),
  notes: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// ─── Record Payment ──────────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().min(0.01, "Payment amount must be greater than 0"),
  method: z.enum(["cash", "credit_card", "debit_card", "insurance", "bank_transfer", "other"]),
  transactionId: z.string().optional(),
  notes: z.string().max(500).optional(),
  paidAt: z.string().datetime().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

// ─── Insurance Claim ─────────────────────────────────────────────────────────

export const insuranceClaimSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  patientId: z.string().min(1, "Patient ID is required"),
  insuranceProvider: z.string().min(1, "Insurance provider is required"),
  policyNumber: z.string().min(1, "Policy number is required"),
  claimAmount: z.number().min(0.01, "Claim amount must be greater than 0"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  notes: z.string().max(1000).optional(),
});

export type InsuranceClaimInput = z.infer<typeof insuranceClaimSchema>;
