import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { AIDiagnosisModel } from "@/lib/db/models/AIDiagnosis";
import {
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// GET /api/ai-diagnosis/history — Paginated, filterable diagnosis history
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status");
    const urgencyLevel = searchParams.get("urgencyLevel");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const patientId = searchParams.get("patientId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build query filter
    const filter: Record<string, unknown> = {};

    // Role-based access control
    switch (session.user.role) {
      case "patient":
        // Patients only see their own diagnoses
        filter.patientId = session.user.id;
        break;

      case "doctor":
        // Doctors can see all patients' diagnoses, optionally filtered
        if (patientId) {
          filter.patientId = patientId;
        }
        break;

      case "admin":
        // Admins see all, optionally filtered by patient
        if (patientId) {
          filter.patientId = patientId;
        }
        break;

      default:
        return errorResponse("Insufficient permissions", 403);
    }

    // Optional filters
    if (status && ["pending", "completed", "reviewed", "dismissed"].includes(status)) {
      filter.status = status;
    }

    if (
      urgencyLevel &&
      ["low", "medium", "high", "emergency"].includes(urgencyLevel)
    ) {
      filter["result.urgencyLevel"] = urgencyLevel;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (filter.createdAt as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    // Build sort
    const validSortFields = ["createdAt", "status", "result.urgencyLevel"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [diagnoses, total] = await Promise.all([
      AIDiagnosisModel.find(filter)
        .populate("patientId", "name email")
        .populate("reviewedBy", "name email")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      AIDiagnosisModel.countDocuments(filter),
    ]);

    return paginatedResponse(diagnoses, page, limit, total);
  } catch (error: unknown) {
    console.error("[AI Diagnosis History] GET error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
