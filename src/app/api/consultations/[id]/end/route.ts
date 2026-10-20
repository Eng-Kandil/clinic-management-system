import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Consultation } from "@/lib/db/models/Consultation";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { Appointment } from "@/lib/db/models/Appointment";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";
import { publish } from "@/lib/realtime/bus";

// ---------------------------------------------------------------------------
// POST /api/consultations/[id]/end — End a consultation
// ---------------------------------------------------------------------------

export async function POST(
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

    const consultation = await Consultation.findById(id).lean();
    if (!consultation) return errorResponse("Consultation not found", 404);

    // Only active or waiting consultations can be ended
    if (consultation.status === "ended") {
      return errorResponse("Consultation is already ended", 400);
    }

    // Access control: doctor, patient (own), or admin
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !patient ||
        String(consultation.patientId) !== String(patient._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !doctor ||
        String(consultation.doctorId) !== String(doctor._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
    }
    // Admin can end any consultation

    // Parse optional body for summary / notes
    let summary: string | undefined;
    try {
      const body = await req.json();
      if (body.summary && typeof body.summary === "string") {
        summary = body.summary.slice(0, 2000);
      }
    } catch {
      // No body provided — that's fine
    }

    // Calculate duration
    const now = new Date();
    let duration: number | undefined;
    if (consultation.startedAt) {
      const durationMs =
        now.getTime() - new Date(consultation.startedAt).getTime();
      duration = Math.round(durationMs / 60000);
    }

    const updateData: Record<string, unknown> = {
      status: "ended",
      endedAt: now,
    };
    if (duration !== undefined) updateData.duration = duration;
    if (summary) updateData.summary = summary;

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

    // Mark the linked appointment as completed so it leaves the active queue
    // and shows up correctly across the patient/doctor/admin views. Only flip
    // appointments that are still in an active state (avoid overriding a
    // cancelled/no-show appointment).
    if (consultation.appointmentId) {
      try {
        await Appointment.updateOne(
          {
            _id: consultation.appointmentId,
            status: { $in: ["scheduled", "confirmed", "in-progress"] },
          },
          { $set: { status: "completed" } }
        );
      } catch (aptErr) {
        console.error("[consultation.end] appointment update failed:", aptErr);
      }
    }

    // Tear down the other participant's live call immediately. CallStage already
    // handles a "hangup" signal; the consultation page also flips to the ended
    // view via status polling as a fallback.
    publish(`consultation:${id}`, "signal", {
      kind: "hangup",
      payload: null,
      from: session.user.id,
      role: session.user.role === "doctor" ? "doctor" : "patient",
      at: Date.now(),
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "END_CONSULTATION",
      resource: "Consultation",
      resourceId: id,
      details: `Consultation ended${duration ? ` after ${duration} minutes` : ""}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    return successResponse(updated, "Consultation ended successfully");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
