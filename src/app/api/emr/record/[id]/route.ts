import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { MedicalRecord } from "@/lib/db/models/MedicalRecord";
import { Doctor } from "@/lib/db/models/Doctor";
import { Patient } from "@/lib/db/models/Patient";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { updateMedicalRecordSchema } from "@/lib/validators/emr.schema";
import { auth } from "@/lib/auth/auth.config";
import { createAuditLog } from "@/lib/utils/audit";

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

    await connectDB();

    const record = await MedicalRecord.findById(id)
      .populate({
        path: "doctorId",
        populate: { path: "user", select: "name email avatar" },
      })
      .populate({
        path: "patientId",
        populate: { path: "user", select: "name email" },
      })
      .populate("prescriptions")
      .populate("appointmentId");

    if (!record) {
      return errorResponse("Medical record not found", 404);
    }

    // IDOR ownership check
    const role = session.user.role;
    if (role !== "admin") {
      if (role === "patient") {
        const patient = await Patient.findOne({ userId: session.user.id }).lean();
        if (!patient || record.patientId?.toString() !== patient._id.toString()) {
          return errorResponse("Forbidden", 403);
        }
      } else if (role === "doctor") {
        const doctor = await Doctor.findOne({ userId: session.user.id }).lean();
        if (!doctor || record.doctorId?.toString() !== doctor._id.toString()) {
          return errorResponse("Forbidden", 403);
        }
      } else {
        return errorResponse("Forbidden", 403);
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: "PHI_VIEW",
      resource: "MedicalRecord",
      resourceId: id,
      details: `User ${session.user.id} viewed medical record ${id}`,
      ipAddress: "unknown",
      userAgent: "unknown",
      severity: "info",
      metadata: { recordId: id, viewerId: session.user.id },
    });

    return successResponse(record);
  } catch (error) {
    console.error("EMR record GET error:", error);
    return errorResponse("Failed to fetch medical record", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    if (session.user.role !== "doctor") {
      return errorResponse("Only doctors can update medical records", 403);
    }

    const { id } = await params;
    const body = await req.json();

    const validation = updateMedicalRecordSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.flatten().fieldErrors);
    }

    await connectDB();

    // Verify the doctor is the author of the record
    const doctor = await Doctor.findOne({ userId: session.user.id });
    if (!doctor) {
      return errorResponse("Doctor profile not found", 404);
    }

    const record = await MedicalRecord.findById(id);
    if (!record) {
      return errorResponse("Medical record not found", 404);
    }

    if (record.doctorId.toString() !== doctor._id.toString()) {
      return errorResponse("Only the authoring doctor can update this record", 403);
    }

    // Build update object from validated data
    const data = validation.data;
    const updateFields: Record<string, unknown> = {};

    if (data.diagnosis !== undefined) updateFields.diagnosis = data.diagnosis;
    if (data.treatmentPlan !== undefined) updateFields.treatmentPlan = data.treatmentPlan;
    if (data.vitals !== undefined) updateFields.vitals = data.vitals;
    if (data.followUpDate !== undefined) updateFields.followUpDate = new Date(data.followUpDate);
    if (data.chiefComplaint !== undefined) updateFields.chiefComplaint = data.chiefComplaint;
    if (data.symptoms !== undefined) updateFields.symptoms = data.symptoms;
    if (data.visitDate !== undefined) updateFields.visitDate = new Date(data.visitDate);

    // Handle labResults if present in the body (not in the zod schema but allowed for updates)
    if (body.labResults !== undefined) {
      updateFields.labResults = body.labResults;
    }

    const updated = await MedicalRecord.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    )
      .populate({
        path: "doctorId",
        populate: { path: "user", select: "name email avatar" },
      })
      .populate({
        path: "patientId",
        populate: { path: "user", select: "name email" },
      });

    return successResponse(updated, "Medical record updated successfully");
  } catch (error) {
    console.error("EMR record PATCH error:", error);
    return errorResponse("Failed to update medical record", 500);
  }
}
