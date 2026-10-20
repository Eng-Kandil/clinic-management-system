import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Appointment } from "@/lib/db/models/Appointment";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";
import {
  createAppointmentSchema,
} from "@/lib/validators/appointment.schema";
import { createAuditLog } from "@/lib/utils/audit";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { appointmentConfirmation } from "@/lib/email/templates/appointment-confirmation";
import { wallClockToInstant, formatClinicTime } from "@/lib/utils/datetime";

// ---------------------------------------------------------------------------
// GET /api/appointments — List appointments (role-filtered)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    // Build query filter
    const filter: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user.role === "patient") {
      // Patients see only their own appointments
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!patient) return paginatedResponse([], page, limit, 0);
      filter.patientId = patient._id;
    } else if (session.user.role === "doctor") {
      // Doctors see only their own appointments
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!doctor) return paginatedResponse([], page, limit, 0);
      filter.doctorId = doctor._id;
    }
    // Admin sees all — no additional filter needed

    // Optional filters
    if (status) {
      filter.status = status;
    }

    if (type && ["in-person", "remote"].includes(type)) {
      filter.type = type;
    }

    if (dateFrom || dateTo) {
      filter.dateTime = {};
      if (dateFrom) {
        (filter.dateTime as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (filter.dateTime as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
      filter.doctorId = new mongoose.Types.ObjectId(doctorId);
    }

    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      filter.patientId = new mongoose.Types.ObjectId(patientId);
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate({
          path: "patientId",
          select: "userId",
          populate: { path: "user", select: "name" },
        })
        .populate({
          path: "doctorId",
          select: "userId specialization",
          populate: { path: "user", select: "name" },
        })
        .sort({ dateTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(filter),
    ]);

    return paginatedResponse(appointments, page, limit, total);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/appointments — Create appointment
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const validation = createAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const { doctorId, dateTime, endTime, type, reason, notes } = validation.data;

    // Validate doctor exists
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return errorResponse("Invalid doctor ID", 400);
    }

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return errorResponse("Doctor not found", 404);

    // Get the patient profile for the current user
    let patientDoc;
    if (session.user.role === "patient") {
      patientDoc = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!patientDoc) return errorResponse("Patient profile not found", 404);
    } else if (session.user.role === "admin") {
      // Admin may create on behalf — require patientId in body
      const adminPatientId = body.patientId;
      if (!adminPatientId || !mongoose.Types.ObjectId.isValid(adminPatientId)) {
        return errorResponse("patientId is required when admin creates appointment", 400);
      }
      patientDoc = await Patient.findById(adminPatientId).select("_id").lean();
      if (!patientDoc) return errorResponse("Patient not found", 404);
    } else {
      return errorResponse("Only patients and admins can create appointments", 403);
    }

    const appointmentStart = new Date(dateTime);
    const appointmentEnd = new Date(endTime);

    // Validate end time is after start time
    if (appointmentEnd <= appointmentStart) {
      return errorResponse("End time must be after start time", 400);
    }

    // Same-day booking is allowed, but the slot must not already be in the past.
    // Compare the true instant (clinic-local wall-clock → UTC); 1-min grace
    // tolerates clock skew / in-flight submissions.
    if (wallClockToInstant(appointmentStart).getTime() < Date.now() - 60_000) {
      return errorResponse("Cannot book an appointment in the past", 400);
    }

    // Check doctor availability for that day of week
    const dayOfWeek = appointmentStart.getUTCDay(); // 0=Sunday, 6=Saturday
    const daySlots = doctor.availableSlots?.filter((s) => s.dayOfWeek === dayOfWeek);

    if (!daySlots || daySlots.length === 0) {
      return errorResponse("Doctor is not available on this day", 400);
    }

    // Check if the requested time falls within any of the doctor's available ranges
    const requestedStartMinutes =
      appointmentStart.getUTCHours() * 60 + appointmentStart.getUTCMinutes();
    const requestedEndMinutes =
      appointmentEnd.getUTCHours() * 60 + appointmentEnd.getUTCMinutes();

    const withinSchedule = daySlots.some((slot) => {
      const [sH = 0, sM = 0] = slot.startTime.split(":").map(Number);
      const [eH = 0, eM = 0] = slot.endTime.split(":").map(Number);
      const slotStart = sH * 60 + sM;
      const slotEnd = eH * 60 + eM;
      return requestedStartMinutes >= slotStart && requestedEndMinutes <= slotEnd;
    });

    if (!withinSchedule) {
      return errorResponse(
        "Requested time is outside the doctor's available schedule",
        400
      );
    }

    // Check for conflicting appointments (same doctor, overlapping time, not cancelled)
    const conflicting = await Appointment.findOne({
      doctorId: doctorId,
      status: { $nin: ["cancelled"] },
      $or: [
        {
          dateTime: { $lt: appointmentEnd },
          endTime: { $gt: appointmentStart },
        },
      ],
    }).lean();

    if (conflicting) {
      return errorResponse(
        "This time slot is already booked. Please choose another slot.",
        409
      );
    }

    // Create the appointment
    const appointment = await Appointment.create({
      patientId: patientDoc._id,
      doctorId: doctorId,
      dateTime: appointmentStart,
      endTime: appointmentEnd,
      type,
      reason,
      notes: notes || undefined,
      status: "scheduled",
    });

    // Populate for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: "patientId",
        select: "userId",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "doctorId",
        select: "userId specialization",
        populate: { path: "user", select: "name email" },
      })
      .lean();

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_APPOINTMENT",
      resource: "Appointment",
      resourceId: appointment._id.toString(),
      details: `Created appointment with doctor ${doctorId} for ${dateTime}`,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    // Notify patient + doctor (best-effort, never throws)
    try {
      const populated = populatedAppointment as unknown as {
        patientId?: { user?: { _id?: unknown; name?: string } | null } | null;
        doctorId?: {
          user?: { _id?: unknown; name?: string } | null;
          specialization?: string;
        } | null;
      } | null;

      const patientUser = populated?.patientId?.user ?? null;
      const doctorUser = populated?.doctorId?.user ?? null;
      const patientName = patientUser?.name ?? "Patient";
      const doctorName = doctorUser?.name ? `Dr. ${doctorUser.name}` : "your doctor";
      const location =
        type === "remote" ? "Remote (video)" : "Clinic (in-person)";
      const tpl = appointmentConfirmation({
        patientName,
        doctorName,
        dateTime: appointmentStart,
        location,
      });

      const targets: string[] = [];
      if (patientUser?._id) targets.push(String(patientUser._id));
      if (doctorUser?._id) targets.push(String(doctorUser._id));

      await Promise.all(
        targets.map((uid) =>
          dispatchNotification({
            userId: uid,
            type: "appointment",
            title: "Appointment confirmed",
            message: `Appointment with ${doctorName} on ${formatClinicTime(
              appointmentStart,
              {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}`,
            data: {
              link: `/dashboard/appointments/${appointment._id.toString()}`,
              email: tpl,
            },
            channels: ["inApp", "email"],
          })
        )
      );
    } catch (notifyErr) {
      console.error("[appointments.POST] notify failed:", notifyErr);
    }

    return successResponse(populatedAppointment, "Appointment created successfully", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
