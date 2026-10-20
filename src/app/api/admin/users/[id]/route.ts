import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { withAuth } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { User } from "@/lib/db/models/User";
import { Appointment } from "@/lib/db/models/Appointment";
import { Consultation } from "@/lib/db/models/Consultation";
import { Invoice } from "@/lib/db/models/Invoice";
import { AIDiagnosisModel } from "@/lib/db/models/AIDiagnosis";
import { Doctor } from "@/lib/db/models/Doctor";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/");
  return segments[segments.length - 1] ?? "";
}

// ---------------------------------------------------------------------------
// GET /api/admin/users/[id] — Detailed user profile (admin only)
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: NextRequest) => {
  try {
    await connectDB();

    const id = extractId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid user ID", 400);
    }

    const user = await User.findById(id).select("-password").lean();
    if (!user) return errorResponse("User not found", 404);

    const objectId = new mongoose.Types.ObjectId(id);

    // Fetch activity summary in parallel
    const [
      appointmentSummary,
      consultationSummary,
      invoiceSummary,
      diagnosisSummary,
      doctorProfile,
      recentAppointments,
    ] = await Promise.all([
      // Appointment stats
      Appointment.aggregate([
        {
          $match: {
            $or: [{ patientId: objectId }, { doctorId: objectId }],
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // Consultation stats
      Consultation.aggregate([
        {
          $match: {
            $or: [{ patientId: objectId }, { doctorId: objectId }],
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // Invoice stats
      Invoice.aggregate([
        { $match: { patientId: objectId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total: { $sum: "$total" },
          },
        },
      ]),

      // AI Diagnosis count
      AIDiagnosisModel.countDocuments({ patientId: objectId }),

      // Doctor profile (if user is a doctor)
      Doctor.findOne({ userId: objectId }).lean(),

      // Recent appointments
      Appointment.find({
        $or: [{ patientId: objectId }, { doctorId: objectId }],
      })
        .sort({ dateTime: -1 })
        .limit(5)
        .lean(),
    ]);

    // Normalize appointment summary
    const appointmentStats: Record<string, number> = {};
    let totalAppointments = 0;
    for (const a of appointmentSummary) {
      appointmentStats[a._id] = a.count;
      totalAppointments += a.count;
    }

    // Normalize consultation summary
    const consultationStats: Record<string, number> = {};
    let totalConsultations = 0;
    for (const c of consultationSummary) {
      consultationStats[c._id] = c.count;
      totalConsultations += c.count;
    }

    // Normalize invoice summary
    const invoiceStats: Record<string, { count: number; total: number }> = {};
    let totalInvoiceAmount = 0;
    let totalInvoices = 0;
    for (const i of invoiceSummary) {
      invoiceStats[i._id] = { count: i.count, total: i.total };
      totalInvoices += i.count;
      totalInvoiceAmount += i.total;
    }

    const response = {
      user,
      doctorProfile: doctorProfile ?? null,
      activitySummary: {
        appointments: {
          total: totalAppointments,
          byStatus: appointmentStats,
        },
        consultations: {
          total: totalConsultations,
          byStatus: consultationStats,
        },
        invoices: {
          total: totalInvoices,
          totalAmount: totalInvoiceAmount,
          byStatus: invoiceStats,
        },
        aiDiagnoses: diagnosisSummary,
      },
      recentAppointments,
    };

    return successResponse(response);
  } catch (error: unknown) {
    console.error("[Admin Users GET/:id] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/[id] — Update user (admin only)
// ---------------------------------------------------------------------------

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  role: z
    .enum(["admin", "doctor", "patient", "security_officer", "receptionist"])
    .optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { user: admin }) => {
  try {
    await connectDB();

    const id = extractId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid user ID", 400);
    }

    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const updateData: Record<string, unknown> = {};
    const { name, phone, role, isActive } = validation.data;

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    // Prevent demoting yourself
    if (id === admin.id && role && role !== "admin") {
      return errorResponse("Cannot change your own role", 400);
    }

    // Prevent deactivating yourself
    if (id === admin.id && isActive === false) {
      return errorResponse("Cannot deactivate your own account", 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();

    if (!updatedUser) return errorResponse("User not found", 404);

    // Audit log
    await createAuditLog({
      userId: admin.id,
      action: "UPDATE_USER",
      resource: "User",
      resourceId: id,
      details: JSON.stringify({ changedFields: Object.keys(body).filter(k => ["role", "isActive", "name", "email"].includes(k)) }),
      ipAddress:
        req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "warning",
    });

    return successResponse(updatedUser, "User updated successfully");
  } catch (error: unknown) {
    console.error("[Admin Users PATCH/:id] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/[id] — Soft delete (admin only)
// ---------------------------------------------------------------------------

export const DELETE = withAuth(async (req: NextRequest, { user: admin }) => {
  try {
    await connectDB();

    const id = extractId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid user ID", 400);
    }

    // Prevent self-deletion
    if (id === admin.id) {
      return errorResponse("Cannot deactivate your own account", 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    )
      .select("-password")
      .lean();

    if (!user) return errorResponse("User not found", 404);

    // Audit log
    await createAuditLog({
      userId: admin.id,
      action: "DEACTIVATE_USER",
      resource: "User",
      resourceId: id,
      details: `Admin soft-deleted (deactivated) user ${id}`,
      ipAddress:
        req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "critical",
    });

    return successResponse(user, "User deactivated successfully");
  } catch (error: unknown) {
    console.error("[Admin Users DELETE/:id] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);
