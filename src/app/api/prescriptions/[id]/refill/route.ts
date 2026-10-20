import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { Prescription } from "@/lib/db/models/Prescription";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";
import { auth } from "@/lib/auth/auth.config";

// POST /api/prescriptions/[id]/refill
// Patient requests a refill; creates a new Prescription with status "pending"
// and refillOf pointing to the original prescription.
// A doctor must then review and approve (change status to "active").
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    const role = session.user.role;
    if (role !== "patient" && role !== "doctor" && role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;

    await connectDB();

    // Fetch the original prescription
    const original = await Prescription.findById(id).lean();
    if (!original) {
      return errorResponse("Prescription not found", 404);
    }

    // Authorization: patient must own this prescription; doctors/admins are allowed
    if (role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id }).lean();
      if (!patient) {
        return errorResponse("Patient profile not found", 404);
      }
      if (original.patientId.toString() !== patient._id.toString()) {
        return errorResponse("Forbidden", 403);
      }
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id }).lean();
      if (!doctor) {
        return errorResponse("Doctor profile not found", 404);
      }
      // Doctors can only request refills for prescriptions they authored
      if (original.doctorId.toString() !== doctor._id.toString()) {
        return errorResponse("Forbidden", 403);
      }
    }
    // admin: no additional check needed

    // Parse optional notes from request body
    let notes: string | undefined;
    try {
      const body = await req.json();
      notes = typeof body?.notes === "string" ? body.notes : undefined;
    } catch {
      // body is optional
    }

    // Create the refill prescription (pending approval)
    const refill = await Prescription.create({
      patientId: original.patientId,
      doctorId: original.doctorId,
      medicalRecordId: original.medicalRecordId,
      medications: original.medications,
      status: "pending",
      notes: notes ?? original.notes,
      refillOf: original._id,
    });

    // Write audit log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId: session.user.id,
      action: "PRESCRIPTION_REFILL_REQUESTED",
      resource: "Prescription",
      resourceId: refill._id.toString(),
      details: `Refill requested for prescription ${id} by ${role} (userId: ${session.user.id})`,
      ipAddress: ip,
      userAgent: ua,
      severity: "info",
      metadata: {
        originalPrescriptionId: id,
        refillPrescriptionId: refill._id.toString(),
        patientId: original.patientId.toString(),
        requestedBy: role,
      },
    });

    return successResponse(refill, "Refill request created successfully", 201);
  } catch (error) {
    console.error("Prescription refill POST error:", error);
    return errorResponse("Failed to create refill request", 500);
  }
}
