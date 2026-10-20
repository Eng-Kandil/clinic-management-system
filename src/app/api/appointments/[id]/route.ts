import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Appointment } from "@/lib/db/models/Appointment";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { updateAppointmentSchema } from "@/lib/validators/appointment.schema";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/appointments/[id] — Get appointment detail
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
      return errorResponse("Invalid appointment ID", 400);
    }

    const appointment = await Appointment.findById(id)
      .populate({
        path: "patientId",
        populate: { path: "user", select: "name email phone avatar" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "user", select: "name email phone avatar" },
      })
      .populate("cancelledBy", "name email")
      .lean();

    if (!appointment) return errorResponse("Appointment not found", 404);

    // Access control: patients see own, doctors see own, admin sees all
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      const populatedPatient = appointment.patientId as unknown as { _id: unknown };
      if (!patient || String(populatedPatient._id) !== String(patient._id)) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      const populatedDoctor = appointment.doctorId as unknown as { _id: unknown };
      if (!doctor || String(populatedDoctor._id) !== String(doctor._id)) {
        return errorResponse("Forbidden", 403);
      }
    }
    // Admin can see all — no additional check

    return successResponse(appointment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/appointments/[id] — Update appointment
// ---------------------------------------------------------------------------

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["confirmed", "cancelled", "no-show"],
  confirmed: ["in-progress", "cancelled", "no-show"],
  "in-progress": ["completed", "cancelled"],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
  "no-show": [],  // Terminal state
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
      return errorResponse("Invalid appointment ID", 400);
    }

    const existingAppointment = await Appointment.findById(id).lean();
    if (!existingAppointment) return errorResponse("Appointment not found", 404);

    // Access control
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !patient ||
        String(existingAppointment.patientId) !== String(patient._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !doctor ||
        String(existingAppointment.doctorId) !== String(doctor._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
    }
    // Admin can update all

    const body = await req.json();
    const validation = updateAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    // Handle status change
    if (data.status) {
      const currentStatus = existingAppointment.status;
      const allowedNext = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedNext.includes(data.status)) {
        return errorResponse(
          `Cannot transition from "${currentStatus}" to "${data.status}"`,
          400
        );
      }

      updateData.status = data.status;

      // If cancelling, require cancelReason
      if (data.status === "cancelled") {
        if (!data.cancelReason) {
          return errorResponse(
            "cancelReason is required when cancelling an appointment",
            400
          );
        }
        updateData.cancelReason = data.cancelReason;
        updateData.cancelledBy = new mongoose.Types.ObjectId(session.user.id);
      }
    }

    // Handle reschedule (dateTime and/or endTime)
    if (data.dateTime) {
      updateData.dateTime = new Date(data.dateTime);
    }
    if (data.endTime) {
      updateData.endTime = new Date(data.endTime);
    }

    // If rescheduling, validate no conflicts
    if (data.dateTime || data.endTime) {
      const newStart = data.dateTime
        ? new Date(data.dateTime)
        : existingAppointment.dateTime;
      const newEnd = data.endTime
        ? new Date(data.endTime)
        : existingAppointment.endTime;

      if (newEnd <= newStart) {
        return errorResponse("End time must be after start time", 400);
      }

      // Check for conflicts (excluding this appointment)
      const conflicting = await Appointment.findOne({
        _id: { $ne: id },
        doctorId: existingAppointment.doctorId,
        status: { $nin: ["cancelled"] },
        dateTime: { $lt: newEnd },
        endTime: { $gt: newStart },
      }).lean();

      if (conflicting) {
        return errorResponse(
          "The new time slot conflicts with an existing appointment",
          409
        );
      }
    }

    // Other optional fields
    if (data.type) updateData.type = data.type;
    if (data.reason) updateData.reason = data.reason;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate({
        path: "patientId",
        populate: { path: "user", select: "name email phone" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "user", select: "name email phone" },
      })
      .lean();

    if (!updatedAppointment) return errorResponse("Appointment not found", 404);

    // Audit log for status changes and reschedules
    const auditDetails: string[] = [];
    if (data.status) {
      auditDetails.push(
        `Status changed from "${existingAppointment.status}" to "${data.status}"`
      );
    }
    if (data.dateTime || data.endTime) {
      auditDetails.push("Appointment rescheduled");
    }

    if (auditDetails.length > 0) {
      await createAuditLog({
        userId: session.user.id,
        action: data.status === "cancelled" ? "CANCEL_APPOINTMENT" : "UPDATE_APPOINTMENT",
        resource: "Appointment",
        resourceId: id,
        details: auditDetails.join(". "),
        ipAddress:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        severity: data.status === "cancelled" ? "warning" : "info",
      });
    }

    return successResponse(updatedAppointment, "Appointment updated successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
