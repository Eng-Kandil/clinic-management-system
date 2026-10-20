import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Appointment } from "@/lib/db/models/Appointment";
import { Consultation } from "@/lib/db/models/Consultation";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// POST /api/appointments/[id]/consultation — Find-or-create the live call
// consultation for a remote appointment, then return it so the client can
// navigate into the consultation room. Idempotent: re-using an existing
// waiting/active consultation avoids duplicates if both parties click "join".
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  type: z.enum(["video", "voice"]).default("video"),
});

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
      return errorResponse("Invalid appointment ID", 400);
    }

    const appointment = await Appointment.findById(id)
      .select("patientId doctorId type status")
      .lean();
    if (!appointment) return errorResponse("Appointment not found", 404);

    if (appointment.type !== "remote") {
      return errorResponse(
        "Calls are only available for remote appointments",
        400
      );
    }

    // Authorize: only the appointment's patient/doctor (or an admin) may start.
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!patient || String(appointment.patientId) !== String(patient._id)) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!doctor || String(appointment.doctorId) !== String(doctor._id)) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return errorResponse("Invalid request", 400, parsed.error.issues);
    }
    const { type } = parsed.data;

    // Reuse an in-flight consultation for this appointment if one exists.
    const existing = await Consultation.findOne({
      appointmentId: id,
      status: { $in: ["waiting", "active"] },
    })
      .select("_id type status")
      .lean();

    if (existing) {
      return successResponse(
        { _id: String(existing._id), type: existing.type, status: existing.status },
        "Joined existing consultation"
      );
    }

    const consultation = await Consultation.create({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: id,
      type,
      status: "waiting",
      messages: [],
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_CONSULTATION",
      resource: "Consultation",
      resourceId: consultation._id.toString(),
      details: `Started ${type} call from appointment ${id}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    return successResponse(
      { _id: String(consultation._id), type, status: "waiting" },
      "Consultation created",
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
