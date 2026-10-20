import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { MedicalRecord } from "@/lib/db/models/MedicalRecord";
import { Doctor } from "@/lib/db/models/Doctor";
import { Patient } from "@/lib/db/models/Patient";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createMedicalRecordSchema } from "@/lib/validators/emr.schema";
import { createAuditLog } from "@/lib/utils/audit";
import { auth } from "@/lib/auth/auth.config";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    if (session.user.role !== "doctor") {
      return errorResponse("Only doctors can create medical records", 403);
    }

    const body = await req.json();
    const validation = createMedicalRecordSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.flatten().fieldErrors);
    }

    const data = validation.data;

    await connectDB();

    // Find the doctor profile for the logged-in user
    const doctor = await Doctor.findOne({ userId: session.user.id });
    if (!doctor) {
      return errorResponse("Doctor profile not found", 404);
    }

    // Verify the patient exists
    const patient = await Patient.findById(data.patientId);
    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Create the medical record
    const record = await MedicalRecord.create({
      patientId: data.patientId,
      doctorId: doctor._id,
      appointmentId: data.appointmentId || undefined,
      visitDate: new Date(data.visitDate),
      chiefComplaint: data.chiefComplaint,
      symptoms: data.symptoms,
      diagnosis: data.diagnosis,
      vitals: data.vitals || undefined,
      treatmentPlan: data.treatmentPlan || undefined,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
    });

    // Create audit log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "MedicalRecord",
      resourceId: record._id.toString(),
      details: `Created medical record for patient ${data.patientId}`,
      ipAddress: ip,
      userAgent: ua,
      severity: "info",
      metadata: { patientId: data.patientId, diagnosis: data.diagnosis },
    });

    // Populate and return
    const populated = await MedicalRecord.findById(record._id)
      .populate({
        path: "doctorId",
        populate: { path: "user", select: "name email avatar" },
      })
      .populate({
        path: "patientId",
        populate: { path: "user", select: "name email" },
      });

    return successResponse(populated, "Medical record created successfully", 201);
  } catch (error) {
    console.error("EMR POST error:", error);
    return errorResponse("Failed to create medical record", 500);
  }
}
