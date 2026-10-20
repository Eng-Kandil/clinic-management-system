import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Patient, IPatient } from "@/lib/db/models/Patient";
import { Appointment } from "@/lib/db/models/Appointment";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { z } from "zod";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/patients/[id] — Get patient detail
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
      return errorResponse("Invalid patient ID", 400);
    }

    const patient = await Patient.findById(id)
      .populate("user", "name email phone avatar")
      .lean() as (IPatient & { user?: { _id: mongoose.Types.ObjectId; name?: string; email?: string; phone?: string; avatar?: string } }) | null;

    if (!patient) return errorResponse("Patient not found", 404);

    // Patients can only view their own profile; doctors/admin can view any
    if (
      session.user.role === "patient" &&
      patient.user &&
      typeof patient.user === "object" &&
      "_id" in patient.user &&
      String(patient.user._id) !== session.user.id
    ) {
      return errorResponse("Forbidden", 403);
    }

    // Get recent appointments (last 5)
    const recentAppointments = await Appointment.find({ patientId: id })
      .populate({
        path: "doctorId",
        select: "specialization",
        populate: { path: "user", select: "name" },
      })
      .sort({ dateTime: -1 })
      .limit(5)
      .lean();

    // Count total medical records (appointments with status completed)
    const medicalRecordCount = await Appointment.countDocuments({
      patientId: id,
      status: "completed",
    });

    return successResponse({
      ...patient,
      recentAppointments,
      medicalRecordCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/patients/[id] — Update patient info
// ---------------------------------------------------------------------------

const updatePatientSchema = z.object({
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1),
      relationship: z.string().min(1),
      phone: z.string().min(1),
    })
    .optional(),
  address: z.string().optional(),
  insuranceInfo: z
    .object({
      provider: z.string().min(1),
      policyNumber: z.string().min(1),
      expiryDate: z.string().datetime().optional(),
    })
    .optional(),
});

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
      return errorResponse("Invalid patient ID", 400);
    }

    // Check the patient exists and verify ownership
    const existingPatient = await Patient.findById(id).lean();
    if (!existingPatient) return errorResponse("Patient not found", 404);

    // Only the patient themselves or admin can update
    if (
      session.user.role === "patient" &&
      String(existingPatient.userId) !== session.user.id
    ) {
      return errorResponse("Forbidden", 403);
    }

    if (!["patient", "admin", "doctor"].includes(session.user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json();
    const validation = updatePatientSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const updateData: Record<string, unknown> = {};
    const data = validation.data;

    if (data.allergies !== undefined) updateData.allergies = data.allergies;
    if (data.chronicConditions !== undefined) updateData.chronicConditions = data.chronicConditions;
    if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.insuranceInfo !== undefined) updateData.insuranceInfo = data.insuranceInfo;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("user", "name email phone avatar")
      .lean();

    if (!updatedPatient) return errorResponse("Patient not found", 404);

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE_PATIENT",
      resource: "Patient",
      resourceId: id,
      details: `Updated patient profile fields: ${Object.keys(updateData).join(", ")}`,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    return successResponse(updatedPatient, "Patient updated successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/patients/[id] — Delete patient (admin ONLY)
// ---------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Only admins may delete patients — doctors are intentionally excluded
    if (session.user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid patient ID", 400);
    }

    const deleted = await Patient.findByIdAndDelete(id).lean();
    if (!deleted) return errorResponse("Patient not found", 404);

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_PATIENT",
      resource: "Patient",
      resourceId: id,
      details: `Admin deleted patient record ${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "warning",
    });

    return successResponse(null, "Patient deleted successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
