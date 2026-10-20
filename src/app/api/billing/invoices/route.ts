import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Invoice } from "@/lib/db/models/Invoice";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";
import { createInvoiceSchema } from "@/lib/validators/billing.schema";
import { createAuditLog } from "@/lib/utils/audit";
import { formatCurrency } from "@/lib/utils/helpers";

// ---------------------------------------------------------------------------
// GET /api/billing/invoices — List invoices (role-filtered, paginated)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const patientId = searchParams.get("patientId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );
    const skip = (page - 1) * limit;
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build query filter
    const filter: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!patient) return paginatedResponse([], page, limit, 0);
      filter.patientId = patient._id;
    } else if (session.user.role === "doctor") {
      // Doctors see invoices for their patients' appointments
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!doctor) return paginatedResponse([], page, limit, 0);
      // Doctors can see all invoices (they create them)
      // Optionally filter by a specific patient
      if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
        filter.patientId = new mongoose.Types.ObjectId(patientId);
      }
    }
    // Admin sees all

    // Optional filters
    if (status && ["pending", "paid", "overdue", "cancelled", "refunded"].includes(status)) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (filter.createdAt as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    if (
      (session.user.role === "admin" || session.user.role === "receptionist") &&
      patientId &&
      mongoose.Types.ObjectId.isValid(patientId)
    ) {
      filter.patientId = new mongoose.Types.ObjectId(patientId);
    }
    // Receptionist sees all invoices (same access as admin for billing ops)

    // Build sort
    const validSortFields = ["createdAt", "dueDate", "total", "invoiceNumber", "status"];
    const sort: Record<string, 1 | -1> = {};
    sort[validSortFields.includes(sortField) ? sortField : "createdAt"] = sortOrder;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate({
          path: "patientId",
          select: "userId",
          populate: { path: "userId", model: "User", select: "name email" },
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return paginatedResponse(invoices, page, limit, total);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/billing/invoices — Create an invoice
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Only doctors and admins can create invoices
    if (!["doctor", "admin"].includes(session.user.role)) {
      return errorResponse("Only doctors and admins can create invoices", 403);
    }

    const body = await req.json();
    const validation = createInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const { patientId, appointmentId, items, notes, dueDate } = validation.data;

    // Validate patient exists
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return errorResponse("Invalid patient ID", 400);
    }

    const patient = await Patient.findById(patientId).lean();
    if (!patient) return errorResponse("Patient not found", 404);

    // Calculate totals from line items
    const calculatedItems = items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discountAmount = lineTotal * ((item.discount || 0) / 100);
      const taxAmount = (lineTotal - discountAmount) * ((item.tax || 0) / 100);
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: parseFloat((lineTotal - discountAmount + taxAmount).toFixed(2)),
      };
    });

    const subtotal = parseFloat(
      calculatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)
    );

    // Aggregate tax and discount from per-item values
    const totalDiscount = parseFloat(
      items
        .reduce((sum, item) => {
          const lineTotal = item.quantity * item.unitPrice;
          return sum + lineTotal * ((item.discount || 0) / 100);
        }, 0)
        .toFixed(2)
    );

    const totalTax = parseFloat(
      items
        .reduce((sum, item) => {
          const lineTotal = item.quantity * item.unitPrice;
          const disc = lineTotal * ((item.discount || 0) / 100);
          return sum + (lineTotal - disc) * ((item.tax || 0) / 100);
        }, 0)
        .toFixed(2)
    );

    const total = parseFloat((subtotal - totalDiscount + totalTax).toFixed(2));

    const invoice = await Invoice.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      appointmentId: appointmentId
        ? new mongoose.Types.ObjectId(appointmentId)
        : undefined,
      items: calculatedItems,
      subtotal,
      tax: totalTax,
      discount: totalDiscount,
      total,
      status: "pending",
      dueDate: new Date(dueDate),
      notes: notes || undefined,
    });

    // Populate for response
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate({
        path: "patientId",
        select: "userId",
        populate: { path: "userId", model: "User", select: "name email" },
      })
      .lean();

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_INVOICE",
      resource: "Invoice",
      resourceId: invoice._id.toString(),
      details: `Created invoice ${invoice.invoiceNumber} for patient ${patientId} — Total: ${formatCurrency(total)}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    return successResponse(
      populatedInvoice,
      "Invoice created successfully",
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
