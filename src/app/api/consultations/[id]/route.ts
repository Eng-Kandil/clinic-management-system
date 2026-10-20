import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Consultation } from "@/lib/db/models/Consultation";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { updateConsultationSchema } from "@/lib/validators/consultation.schema";
import { createAuditLog } from "@/lib/utils/audit";
import { dispatchNotification } from "@/lib/notifications/dispatch";

// ---------------------------------------------------------------------------
// GET /api/consultations/[id] — Get a single consultation with messages
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
      return errorResponse("Invalid consultation ID", 400);
    }

    const consultation = await Consultation.findById(id)
      .populate({
        path: "patientId",
        select: "userId",
        populate: { path: "user", select: "name email phone avatar" },
      })
      .populate({
        path: "doctorId",
        select: "userId specialization department consultationFee",
        populate: { path: "user", select: "name email phone avatar" },
      })
      .lean();

    if (!consultation) return errorResponse("Consultation not found", 404);

    // Access control
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !patient ||
        String(consultation.patientId._id) !== String(patient._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !doctor ||
        String(consultation.doctorId._id) !== String(doctor._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
    }
    // Admin can access all

    return successResponse(consultation);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/consultations/[id] — Update consultation (status, notes, summary)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, string[]> = {
  waiting: ["active", "ended"],
  active: ["ended"],
  ended: [], // Terminal state
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
      return errorResponse("Invalid consultation ID", 400);
    }

    const existing = await Consultation.findById(id).lean();
    if (!existing) return errorResponse("Consultation not found", 404);

    // Access control
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!patient || String(existing.patientId) !== String(patient._id)) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!doctor || String(existing.doctorId) !== String(doctor._id)) {
        return errorResponse("Forbidden", 403);
      }
    }

    const body = await req.json();
    const validation = updateConsultationSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    // Handle status transitions
    if (data.status) {
      // TODO(Phase 5.6): Unify status vocab to canonical: scheduled|active|ended|cancelled
      // Map incoming statuses to model-compatible values
      const statusMap: Record<string, string> = {
        "in-progress": "active",
        completed: "ended",
        cancelled: "ended",
        scheduled: "waiting",
      };
      const mappedStatus = statusMap[data.status] || data.status;
      const currentStatus = existing.status;
      const allowedNext = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedNext.includes(mappedStatus)) {
        return errorResponse(
          `Cannot transition from "${currentStatus}" to "${mappedStatus}"`,
          400
        );
      }

      updateData.status = mappedStatus;

      if (mappedStatus === "active" && !existing.startedAt) {
        updateData.startedAt = new Date();
      }

      if (mappedStatus === "ended") {
        updateData.endedAt = new Date();
        if (existing.startedAt) {
          const durationMs =
            new Date().getTime() - new Date(existing.startedAt).getTime();
          updateData.duration = Math.round(durationMs / 60000); // minutes
        }
      }
    }

    // Optional field updates
    if (data.notes !== undefined) updateData.summary = data.notes;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const updated = await Consultation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate({
        path: "patientId",
        select: "userId",
        populate: { path: "user", select: "name email avatar" },
      })
      .populate({
        path: "doctorId",
        select: "userId specialization",
        populate: { path: "user", select: "name email avatar" },
      })
      .lean();

    if (!updated) return errorResponse("Consultation not found", 404);

    // Audit log
    const auditDetails: string[] = [];
    if (data.status)
      auditDetails.push(
        `Status changed from "${existing.status}" to "${updated.status}"`
      );
    if (data.notes) auditDetails.push("Notes updated");

    if (auditDetails.length > 0) {
      await createAuditLog({
        userId: session.user.id,
        action: "UPDATE_CONSULTATION",
        resource: "Consultation",
        resourceId: id,
        details: auditDetails.join(". "),
        ipAddress:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        severity: "info",
      });
    }

    // When a live voice/video call goes active, alert the other participant so
    // they can join immediately. The page also picks up the status change via
    // polling; the bus event + notification make it near-instant.
    if (updateData.status === "active") {
      const u = updated as unknown as {
        type: string;
        patientId?: { userId?: unknown; user?: { name?: string } };
        doctorId?: { userId?: unknown; user?: { name?: string } };
      };

      if (u.type === "voice" || u.type === "video") {
        const startedByDoctor = session.user.role === "doctor";
        const recipientUserId = startedByDoctor
          ? u.patientId?.userId
          : u.doctorId?.userId;
        if (recipientUserId) {
          try {
            const doctorName = u.doctorId?.user?.name;
            await dispatchNotification({
              userId: String(recipientUserId),
              type: "appointment",
              title: `Your ${u.type} call is starting`,
              message: startedByDoctor
                ? `Dr. ${doctorName ?? "your doctor"} has started the ${u.type} consultation. Join now.`
                : `The patient has joined the ${u.type} consultation.`,
              data: { link: `/dashboard/consultations/${id}` },
              channels: ["inApp"],
            });
          } catch {
            // A notification failure must never block starting the call.
          }
        }
      }
    }

    return successResponse(updated, "Consultation updated successfully");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
