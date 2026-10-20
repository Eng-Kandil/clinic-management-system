import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { AIDiagnosisModel } from "@/lib/db/models/AIDiagnosis";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";
import { symptomCheckSchema } from "@/lib/validators/ai-diagnosis.schema";
import { analyzeSymptomsWithAI, checkSubscriptionLimit } from "@/lib/ai/diagnosis";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// POST /api/ai-diagnosis — Run a new AI diagnosis
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Only patients and doctors can run AI diagnosis
    if (!["patient", "doctor", "admin"].includes(session.user.role)) {
      return errorResponse("Insufficient permissions", 403);
    }

    const body = await req.json();
    const validation = symptomCheckSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const { symptoms, additionalInfo, patientAge, patientGender } =
      validation.data;

    // Determine the patient ID — for patients it's themselves, for doctors
    // they can specify a patientId in the body
    const patientId =
      session.user.role === "patient"
        ? session.user.id
        : body.patientId || session.user.id;

    // Check subscription limits (only for patients running their own)
    if (session.user.role === "patient") {
      const subCheck = await checkSubscriptionLimit(patientId);
      if (!subCheck.allowed) {
        return errorResponse(
          subCheck.message || "AI diagnosis limit reached",
          403,
          {
            plan: subCheck.plan,
            used: subCheck.used,
            limit: subCheck.limit,
          }
        );
      }
    }

    // Run AI analysis
    const result = await analyzeSymptomsWithAI(
      symptoms,
      additionalInfo,
      patientAge,
      patientGender
    );

    // Save to database
    const diagnosis = await AIDiagnosisModel.create({
      patientId,
      symptoms,
      additionalInfo: additionalInfo || undefined,
      patientAge,
      patientGender,
      result,
      status: "completed",
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "AI_DIAGNOSIS_RUN",
      resource: "AIDiagnosis",
      resourceId: diagnosis._id.toString(),
      details: `AI diagnosis run with ${symptoms.length} symptoms. Urgency: ${result.urgencyLevel}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity:
        result.urgencyLevel === "emergency" || result.urgencyLevel === "high"
          ? "warning"
          : "info",
    });

    return successResponse(
      {
        id: diagnosis._id,
        symptoms: diagnosis.symptoms,
        additionalInfo: diagnosis.additionalInfo,
        result: diagnosis.result,
        status: diagnosis.status,
        createdAt: diagnosis.createdAt,
      },
      "AI diagnosis completed successfully",
      201
    );
  } catch (error: unknown) {
    console.error("[AI Diagnosis] POST error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/ai-diagnosis — List diagnosis history (shortcut)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");
    const urgencyLevel = searchParams.get("urgencyLevel");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build filter
    const filter: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user.role === "patient") {
      filter.patientId = session.user.id;
    } else if (session.user.role === "doctor") {
      // Doctors can see all diagnoses (they may review any)
      // Optionally filter by a specific patient
      const patientId = searchParams.get("patientId");
      if (patientId) filter.patientId = patientId;
    }
    // Admin sees all

    if (status) filter.status = status;
    if (urgencyLevel) filter["result.urgencyLevel"] = urgencyLevel;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom)
        (filter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      if (dateTo)
        (filter.createdAt as Record<string, Date>).$lte = new Date(dateTo);
    }

    const [diagnoses, total] = await Promise.all([
      AIDiagnosisModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AIDiagnosisModel.countDocuments(filter),
    ]);

    return paginatedResponse(diagnoses, page, limit, total);
  } catch (error: unknown) {
    console.error("[AI Diagnosis] GET error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
