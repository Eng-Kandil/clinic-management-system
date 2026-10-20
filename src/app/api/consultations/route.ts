import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Consultation } from "@/lib/db/models/Consultation";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";
import { createConsultationSchema } from "@/lib/validators/consultation.schema";
import { createAuditLog } from "@/lib/utils/audit";
import { hasActiveChatSubscription } from "@/lib/utils/subscription";
import { dispatchNotification } from "@/lib/notifications/dispatch";

// ---------------------------------------------------------------------------
// GET /api/consultations — List consultations (role-filtered, paginated)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );
    const skip = (page - 1) * limit;

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
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!doctor) return paginatedResponse([], page, limit, 0);
      filter.doctorId = doctor._id;
    }
    // Admin sees all — no additional filter

    // Optional filters
    if (status && ["waiting", "active", "ended"].includes(status)) {
      filter.status = status;
    }

    if (type && ["chat", "voice", "video"].includes(type)) {
      filter.type = type;
    }

    const [consultations, total] = await Promise.all([
      Consultation.find(filter)
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
        .select("-messages") // Exclude messages from list for performance
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Consultation.countDocuments(filter),
    ]);

    return paginatedResponse(consultations, page, limit, total);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/consultations — Create a new consultation
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const validation = createConsultationSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const { doctorId, type, appointmentId } = validation.data;
    let patientId = validation.data.patientId;

    // Validate doctor exists
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return errorResponse("Invalid doctor ID", 400);
    }
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return errorResponse("Doctor not found", 404);

    // Resolve the patient. Patients always create for themselves (any supplied
    // patientId is ignored); doctors/admins must name the patient.
    if (session.user.role === "patient") {
      const ownPatient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!ownPatient) return errorResponse("Patient profile not found", 404);
      patientId = String(ownPatient._id);
    } else {
      if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
        return errorResponse("Valid patientId is required", 400);
      }
      const patient = await Patient.findById(patientId).lean();
      if (!patient) return errorResponse("Patient not found", 404);
    }

    // Subscription gate: a patient may only start a text chat with an active
    // paid plan. Appointment-driven voice/video consultations are not gated.
    if (session.user.role === "patient" && type === "chat") {
      const allowed = await hasActiveChatSubscription(session.user.id);
      if (!allowed) {
        return errorResponse(
          "An active subscription is required to message a doctor. Please upgrade your plan to start a chat.",
          403
        );
      }
    }

    // Create consultation
    const consultation = await Consultation.create({
      patientId,
      doctorId,
      type,
      status: "waiting",
      appointmentId:
        appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)
          ? appointmentId
          : undefined,
      messages: [],
    });

    // Populate for response
    const populated = await Consultation.findById(consultation._id)
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

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_CONSULTATION",
      resource: "Consultation",
      resourceId: consultation._id.toString(),
      details: `Created ${type} consultation with doctor ${doctorId}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    // Let the doctor know a patient started a text chat with them.
    if (type === "chat" && session.user.role === "patient") {
      try {
        const docUserId = (doctor as { userId?: unknown }).userId;
        if (docUserId) {
          await dispatchNotification({
            userId: String(docUserId),
            type: "chat",
            title: "New message thread",
            message: "A patient started a chat with you.",
            data: {
              link: `/dashboard/consultations/${consultation._id.toString()}`,
            },
            channels: ["inApp"],
          });
        }
      } catch {
        // Notification failures must not block creating the chat.
      }
    }

    return successResponse(
      populated,
      "Consultation created successfully",
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
