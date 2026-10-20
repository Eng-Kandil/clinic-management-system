import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Doctor } from "@/lib/db/models/Doctor";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// GET /api/doctors — List doctors (any authenticated user)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");
    const department = searchParams.get("department");
    const search = searchParams.get("search");
    const isAvailableForRemote = searchParams.get("isAvailableForRemote");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (specialization) {
      filter.specialization = new RegExp(specialization, "i");
    }

    if (department) {
      filter.department = new RegExp(department, "i");
    }

    if (isAvailableForRemote === "true") {
      filter.isAvailableForRemote = true;
    } else if (isAvailableForRemote === "false") {
      filter.isAvailableForRemote = false;
    }

    // For search by doctor's name, find matching user IDs first
    if (search) {
      const { User } = await import("@/lib/db/models/User");
      const searchRegex = new RegExp(search, "i");
      const matchingUsers = await User.find({ name: searchRegex }).select("_id").lean();
      const userIds = matchingUsers.map((u) => u._id);
      filter.user = { $in: userIds };
    }

    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .populate("user", "name email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Doctor.countDocuments(filter),
    ]);

    return paginatedResponse(doctors, page, limit, total);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
