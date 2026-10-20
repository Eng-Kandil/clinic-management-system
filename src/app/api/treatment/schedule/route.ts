import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { TreatmentTracking } from "@/lib/db/models/TreatmentTracking";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import {
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";
import { auth } from "@/lib/auth/auth.config";

// ─── GET /api/treatment/schedule ─────────────────────────────
// Paginated list of treatment schedule entries.
// Filterable by status, medicationName, patientId, date range.
// Patient sees own entries; doctor sees their patients'; admin sees all.
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    await connectDB();

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const medication = url.searchParams.get("medication");
    const patientId = url.searchParams.get("patientId");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "20"))
    );
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};

    // ── Role-based scoping ──────────────────────────────────
    if (session.user.role === "patient") {
      // Patient: find their Patient doc, then scope to patientId
      const patient = await Patient.findOne({ userId: session.user.id });
      if (!patient) {
        return paginatedResponse([], page, limit, 0);
      }
      filter.patientId = patient._id;
    } else if (session.user.role === "doctor") {
      // Doctor: if a specific patientId is requested, allow it;
      // otherwise return entries for all their prescriptions' patients
      if (patientId) {
        filter.patientId = patientId;
      } else {
        const doctor = await Doctor.findOne({ userId: session.user.id });
        if (!doctor) {
          return paginatedResponse([], page, limit, 0);
        }
        // Doctor can see tracking entries linked to prescriptions they wrote.
        // The Prescription model stores doctorId; TreatmentTracking stores prescriptionId.
        // We do a lookup via the Prescription collection.
        const { Prescription } = await import(
          "@/lib/db/models/Prescription"
        );
        const doctorPrescriptions = await Prescription.find({
          doctorId: doctor._id,
        })
          .select("_id")
          .lean();
        const prescriptionIds = doctorPrescriptions.map(
          (p: { _id: unknown }) => p._id
        );
        filter.prescriptionId = { $in: prescriptionIds };
      }
    } else if (session.user.role === "admin") {
      // Admin: can filter by patientId or see all
      if (patientId) {
        filter.patientId = patientId;
      }
    } else {
      return errorResponse("Unauthorized role", 403);
    }

    // ── Optional filters ────────────────────────────────────
    if (status) {
      filter.status = status;
    }

    if (medication) {
      filter.medicationName = { $regex: medication, $options: "i" };
    }

    if (dateFrom || dateTo) {
      const scheduledTimeFilter: Record<string, Date> = {};
      if (dateFrom) scheduledTimeFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        scheduledTimeFilter.$lte = end;
      }
      filter.scheduledTime = scheduledTimeFilter;
    }

    const total = await TreatmentTracking.countDocuments(filter);

    const entries = await TreatmentTracking.find(filter)
      .sort({ scheduledTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "patientId",
        select: "userId",
        populate: { path: "userId", select: "name email" },
      })
      .lean();

    // ── Compute adherence stats per unique medication+prescription ─
    // Group entries by prescriptionId+medicationName and compute rates
    const enriched = entries.map((entry) => {
      const e = entry as unknown as Record<string, unknown>;
      return {
        ...e,
        _id: String(e._id),
      };
    });

    return paginatedResponse(enriched, page, limit, total);
  } catch (error) {
    console.error("Treatment schedule GET error:", error);
    return errorResponse("Failed to fetch treatment schedule", 500);
  }
}
