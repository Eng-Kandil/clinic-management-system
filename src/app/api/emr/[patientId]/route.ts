import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { MedicalRecord } from "@/lib/db/models/MedicalRecord";
import { Patient, IPatient } from "@/lib/db/models/Patient";
import { Prescription } from "@/lib/db/models/Prescription";
import { successResponse, errorResponse, paginatedResponse } from "@/lib/utils/api-response";
import { auth } from "@/lib/auth/auth.config";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    const { patientId } = await params;

    await connectDB();

    // Verify the patient exists
    const patient = await Patient.findById(patientId).populate("user", "name email");
    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Check authorization: doctor, admin, or the patient themselves
    const isAdmin = session.user.role === "admin";
    const isDoctor = session.user.role === "doctor";
    const isOwnPatient =
      (patient as IPatient & { user?: { _id: { toString(): string } } }).user?._id?.toString() ===
      session.user.id;

    if (!isAdmin && !isDoctor && !isOwnPatient) {
      return errorResponse("Insufficient permissions", 403);
    }

    // Pagination
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    // Get total count
    const total = await MedicalRecord.countDocuments({ patientId: patientId });

    // Get records sorted by visitDate descending
    const records = await MedicalRecord.find({ patientId: patientId })
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "doctorId",
        populate: { path: "user", select: "name email avatar" },
      })
      .lean();

    // Get prescription count per record
    const recordIds = records.map((r) => r._id);
    const prescriptionCounts = await Prescription.aggregate([
      { $match: { medicalRecord: { $in: recordIds } } },
      { $group: { _id: "$medicalRecord", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      prescriptionCounts.map((p: { _id: string; count: number }) => [p._id.toString(), p.count])
    );

    const recordsWithCounts = records.map((record) => ({
      ...record,
      prescriptionCount: countMap.get(record._id.toString()) || 0,
    }));

    return paginatedResponse(recordsWithCounts, page, limit, total);
  } catch (error) {
    console.error("EMR GET by patient error:", error);
    return errorResponse("Failed to fetch medical records", 500);
  }
}
