import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// GET /api/doctors/me — The logged-in doctor's own profile (incl. availability)
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (session.user.role !== "doctor") {
      return errorResponse("Only doctors have a doctor profile", 403);
    }

    const doctor = await Doctor.findOne({ userId: session.user.id })
      .populate("user", "name email phone avatar")
      .lean();

    if (!doctor) return errorResponse("Doctor profile not found", 404);

    return successResponse(doctor);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
