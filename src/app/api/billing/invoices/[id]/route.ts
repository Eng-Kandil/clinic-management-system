import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Invoice } from "@/lib/db/models/Invoice";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { updateInvoiceSchema } from "@/lib/validators/billing.schema";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/billing/invoices/[id] — Get full invoice details
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid invoice ID", 400);
    }

    const invoice = await Invoice.findById(id)
      .populate({
        path: "patientId",
        populate: { path: "userId", model: "User", select: "name email phone" },
      })
      .populate("appointmentId")
      .lean();

    if (!invoice) return errorResponse("Invoice not found", 404);

    // Access control
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!patient || String(invoice.patientId._id) !== String(patient._id)) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!doctor) return errorResponse("Doctor profile not found", 404);
      // Doctors can view invoices — they create them
    }
    // Admin can see all

    return successResponse(invoice);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/billing/invoices/[id] — Update invoice status / details
// ---------------------------------------------------------------------------

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: ["refunded"],
  cancelled: [], // Terminal
  refunded: [], // Terminal
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid invoice ID", 400);
    }

    const existing = await Invoice.findById(id).lean();
    if (!existing) return errorResponse("Invoice not found", 404);

    // Access control: only doctor/admin can update invoices
    if (session.user.role === "patient") {
      return errorResponse(
        "Patients cannot update invoices directly. Use the payment endpoint.",
        403
      );
    }

    const body = await req.json();
    const validation = updateInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    // Handle status transition
    if (data.status) {
      const currentStatus = existing.status;
      const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(data.status)) {
        return errorResponse(
          `Cannot transition invoice from "${currentStatus}" to "${data.status}"`,
          400
        );
      }

      updateData.status = data.status;

      if (data.status === "paid") {
        updateData.paidAt = new Date();
      }
    }

    // Handle other updates
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    // Recalculate totals if items changed
    if (data.items && data.items.length > 0) {
      const calculatedItems = data.items.map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        const discountAmount = lineTotal * ((item.discount || 0) / 100);
        const taxAmount =
          (lineTotal - discountAmount) * ((item.tax || 0) / 100);
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: parseFloat(
            (lineTotal - discountAmount + taxAmount).toFixed(2)
          ),
        };
      });

      const subtotal = parseFloat(
        calculatedItems
          .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
          .toFixed(2)
      );

      const totalDiscount = parseFloat(
        data.items
          .reduce((sum, item) => {
            const lineTotal = item.quantity * item.unitPrice;
            return sum + lineTotal * ((item.discount || 0) / 100);
          }, 0)
          .toFixed(2)
      );

      const totalTax = parseFloat(
        data.items
          .reduce((sum, item) => {
            const lineTotal = item.quantity * item.unitPrice;
            const disc = lineTotal * ((item.discount || 0) / 100);
            return sum + (lineTotal - disc) * ((item.tax || 0) / 100);
          }, 0)
          .toFixed(2)
      );

      updateData.items = calculatedItems;
      updateData.subtotal = subtotal;
      updateData.tax = totalTax;
      updateData.discount = totalDiscount;
      updateData.total = parseFloat(
        (subtotal - totalDiscount + totalTax).toFixed(2)
      );
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate({
        path: "patientId",
        populate: { path: "userId", model: "User", select: "name email phone" },
      })
      .lean();

    if (!updatedInvoice) return errorResponse("Invoice not found", 404);

    // Audit log
    const auditDetails: string[] = [];
    if (data.status) {
      auditDetails.push(
        `Invoice ${existing.invoiceNumber} status changed from "${existing.status}" to "${data.status}"`
      );
    }
    if (data.items) {
      auditDetails.push("Invoice line items updated");
    }

    if (auditDetails.length > 0) {
      await createAuditLog({
        userId: session.user.id,
        action:
          data.status === "cancelled"
            ? "CANCEL_INVOICE"
            : data.status === "refunded"
            ? "REFUND_INVOICE"
            : "UPDATE_INVOICE",
        resource: "Invoice",
        resourceId: id,
        details: auditDetails.join(". "),
        ipAddress:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        severity:
          data.status === "cancelled" || data.status === "refunded"
            ? "warning"
            : "info",
      });
    }

    return successResponse(updatedInvoice, "Invoice updated successfully");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
