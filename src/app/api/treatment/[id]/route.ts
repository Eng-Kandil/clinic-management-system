import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { TreatmentTracking } from "@/lib/db/models/TreatmentTracking";
import { Patient } from "@/lib/db/models/Patient";
import {
  successResponse,
  errorResponse,
} from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";
import { auth } from "@/lib/auth/auth.config";
import mongoose from "mongoose";

// ─── GET /api/treatment/[id] ─────────────────────────────────
// Full treatment entry detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid treatment entry ID", 400);
    }

    await connectDB();

    const entry = await TreatmentTracking.findById(id)
      .populate({
        path: "patientId",
        select: "userId",
        populate: { path: "userId", select: "name email avatar" },
      })
      .populate({
        path: "prescriptionId",
        select: "medications status notes doctorId",
        populate: {
          path: "doctorId",
          select: "userId specialization",
          populate: { path: "userId", select: "name email" },
        },
      })
      .lean();

    if (!entry) {
      return errorResponse("Treatment entry not found", 404);
    }

    // Verify access: patient can only see their own
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id });
      const entryObj = entry as unknown as Record<string, unknown>;
      if (
        !patient ||
        String(entryObj.patientId) !== String(patient._id)
      ) {
        return errorResponse("Access denied", 403);
      }
    }

    return successResponse(entry);
  } catch (error) {
    console.error("Treatment GET error:", error);
    return errorResponse("Failed to fetch treatment entry", 500);
  }
}

// ─── PATCH /api/treatment/[id] ───────────────────────────────
// Update a treatment entry: mark dose status, add notes, update status.
// Also supports bulk status changes (pause/resume/discontinue/complete)
// for all entries of a given prescription+medication.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid treatment entry ID", 400);
    }

    const body = await req.json();
    const { status, notes, bulkAction } = body as {
      status?: "taken" | "missed" | "skipped" | "pending";
      notes?: string;
      bulkAction?: "pause" | "resume" | "discontinue" | "complete";
    };

    await connectDB();

    const entry = await TreatmentTracking.findById(id);
    if (!entry) {
      return errorResponse("Treatment entry not found", 404);
    }

    // Verify access
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id });
      if (!patient || String(entry.patientId) !== String(patient._id)) {
        return errorResponse("Access denied", 403);
      }
    }

    // ── Bulk action: affects all pending entries for the same prescription+medication ──
    if (bulkAction) {
      if (!["doctor", "admin"].includes(session.user.role as string)) {
        return errorResponse(
          "Only doctors or admins can perform bulk actions",
          403
        );
      }

      const bulkFilter = {
        prescriptionId: entry.prescriptionId,
        medicationName: entry.medicationName,
        status: "pending" as const,
      };

      let newStatus: "pending" | "skipped" | "missed" = "pending";
      if (bulkAction === "pause" || bulkAction === "discontinue") {
        newStatus = "skipped";
      } else if (bulkAction === "complete") {
        // Mark remaining pending as skipped (treatment completed early)
        newStatus = "skipped";
      }
      // "resume" doesn't change existing entries; it means new entries stay pending

      if (bulkAction !== "resume") {
        const result = await TreatmentTracking.updateMany(bulkFilter, {
          $set: { status: newStatus },
        });

        const ip =
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown";
        const ua = req.headers.get("user-agent") || "unknown";

        await createAuditLog({
          userId: session.user.id,
          action: "BULK_UPDATE",
          resource: "TreatmentTracking",
          resourceId: String(entry.prescriptionId),
          details: `Bulk ${bulkAction} on ${entry.medicationName}: ${result.modifiedCount} entries updated`,
          ipAddress: ip,
          userAgent: ua,
          severity: "info",
        });
      }

      return successResponse(
        { bulkAction, medicationName: entry.medicationName },
        `Treatment ${bulkAction} applied successfully`
      );
    }

    // ── Single entry update ──────────────────────────────────
    const updateFields: Record<string, unknown> = {};

    if (status) {
      updateFields.status = status;
      if (status === "taken") {
        updateFields.takenAt = new Date();
      } else {
        updateFields.takenAt = null;
      }
    }

    if (notes !== undefined) {
      updateFields.notes = notes;
    }

    if (Object.keys(updateFields).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await TreatmentTracking.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).lean();

    // Audit log
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "TreatmentTracking",
      resourceId: id,
      details: `Updated treatment entry: ${JSON.stringify(updateFields)}`,
      ipAddress: ip,
      userAgent: ua,
      severity: "info",
    });

    return successResponse(updated, "Treatment entry updated successfully");
  } catch (error) {
    console.error("Treatment PATCH error:", error);
    return errorResponse("Failed to update treatment entry", 500);
  }
}
