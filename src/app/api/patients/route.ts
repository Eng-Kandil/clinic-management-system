import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Patient } from "@/lib/db/models/Patient";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// GET /api/patients — List patients (doctor/admin only)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (!["admin", "doctor"].includes(session.user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const bloodType = searchParams.get("bloodType");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (bloodType) {
      filter.bloodType = bloodType;
    }

    // For search by name, we need to search within the populated user field.
    // We build a pipeline or use a two-step approach.
    // Approach: first find matching user IDs if search is provided, then filter patients.
    let userFilter: Record<string, unknown> | undefined;
    if (search) {
      const searchRegex = new RegExp(search, "i");
      userFilter = { name: searchRegex };
    }

    // If we have a search term, find matching user IDs first
    if (userFilter) {
      const { User } = await import("@/lib/db/models/User");
      const matchingUsers = await User.find(userFilter).select("_id").lean();
      const userIds = matchingUsers.map((u) => u._id);
      filter.user = { $in: userIds };
    }

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .populate("user", "name email phone avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(filter),
    ]);

    return paginatedResponse(patients, page, limit, total);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
