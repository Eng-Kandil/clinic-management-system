import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { Prescription } from "@/lib/db/models/Prescription";
import { TreatmentTracking } from "@/lib/db/models/TreatmentTracking";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { updatePrescriptionSchema } from "@/lib/validators/prescription.schema";
import { auth } from "@/lib/auth/auth.config";
import { assertCanReadPrescription } from "@/lib/auth/ownership";

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

    const prescription = await Prescription.findById(id)
      .populate({
        path: "doctor",
        populate: { path: "user", select: "name email avatar" },
      })
      .populate({
        path: "patient",
        populate: { path: "user", select: "name email" },
      })
      .populate("medicalRecord");

    if (!prescription) {
      return errorResponse("Prescription not found", 404);
    }

    // IDOR ownership check
    const ownershipDenied = await assertCanReadPrescription(session, prescription);
    if (ownershipDenied) return ownershipDenied;

    return successResponse(prescription);
  } catch (error) {
    console.error("Prescription GET error:", error);
    return errorResponse("Failed to fetch prescription", 500);
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

    if (session.user.role !== "doctor" && session.user.role !== "admin") {
      return errorResponse("Only doctors or admins can update prescriptions", 403);
    }

    const { id } = await params;
    const body = await req.json();

    const validation = updatePrescriptionSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.flatten().fieldErrors);
    }

    await connectDB();

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return errorResponse("Prescription not found", 404);
    }

    const data = validation.data;
    const updateFields: Record<string, unknown> = {};

    if (data.status !== undefined) {
      updateFields.status = data.status;

      // If cancelled, mark all pending tracking entries as skipped
      if (data.status === "cancelled") {
        await TreatmentTracking.updateMany(
          { prescription: id, status: "pending" },
          { $set: { status: "skipped" } }
        );
      }
    }
    if (data.notes !== undefined) updateFields.notes = data.notes;
    if (data.medications !== undefined) {
      updateFields.medications = data.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        startDate: new Date(m.startDate),
        endDate: new Date(m.endDate),
      }));
    }

    const updated = await Prescription.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    )
      .populate({
        path: "doctor",
        populate: { path: "user", select: "name email avatar" },
      })
      .populate({
        path: "patient",
        populate: { path: "user", select: "name email" },
      });

    return successResponse(updated, "Prescription updated successfully");
  } catch (error) {
    console.error("Prescription PATCH error:", error);
    return errorResponse("Failed to update prescription", 500);
  }
}
