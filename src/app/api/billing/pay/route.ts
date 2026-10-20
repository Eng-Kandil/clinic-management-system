import { NextRequest } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Invoice } from "@/lib/db/models/Invoice";
import { Patient } from "@/lib/db/models/Patient";
import { Payment } from "@/lib/db/models/Payment";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";
import { formatCurrency } from "@/lib/utils/helpers";

// DEMO MODE: no real payment processor wired
// Mock payment endpoint per Phase 5.4 spec.
// Body: { invoiceId: string, method: 'card' | 'cash' }
// Response: { success: true, demo: true }

const payBodySchema = z.object({
  invoiceId: z.string().min(1, "invoiceId is required"),
  method: z.enum(["card", "cash"]),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const validation = payBodySchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const { invoiceId, method } = validation.data;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return errorResponse("Invalid invoice ID", 400);
    }

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) return errorResponse("Invoice not found", 404);

    // Ownership: admin/receptionist can pay any invoice; otherwise the
    // session user must be the patient that owns the invoice.
    const role = session.user.role;
    const isStaff = role === "admin" || role === "receptionist";
    if (!isStaff) {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!patient || String(invoice.patientId) !== String(patient._id)) {
        return errorResponse("Forbidden", 403);
      }
    }

    // Only pending or overdue invoices can be paid
    if (!["pending", "overdue"].includes(invoice.status)) {
      return errorResponse(
        `Cannot pay an invoice with status "${invoice.status}"`,
        400
      );
    }

    const paidAt = new Date();
    const paymentMethod = method === "card" ? "demo_card" : "demo_cash";

    // DEMO MODE: no real payment processor wired — instantly mark as paid.
    await Invoice.findByIdAndUpdate(
      invoiceId,
      { $set: { status: "paid", paidAt, paymentMethod } },
      { runValidators: true }
    );

    // Persist a Payment record for traceability.
    await Payment.create({
      invoiceId,
      provider: "demo",
      amount: invoice.total,
      currency: "TRY",
      status: "completed",
      idempotencyKey: crypto.randomUUID(),
    });

    // Audit log per spec
    await createAuditLog({
      userId: session.user.id,
      action: "PAYMENT_CREATED",
      resource: "invoice",
      resourceId: invoiceId,
      details: `DEMO payment of ${formatCurrency(invoice.total)} recorded for invoice ${invoice.invoiceNumber} via ${method}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
      metadata: {
        amount: invoice.total,
        method,
        invoiceNumber: invoice.invoiceNumber,
        demo: true,
      },
    });

    return successResponse(
      { success: true, demo: true },
      "Demo payment successful"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
