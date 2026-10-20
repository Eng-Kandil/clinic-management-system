import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { AuditLog } from "@/lib/db/models/AuditLog";
import {
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// GET /api/audit-log — List audit logs (admin & security_officer only)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (!["admin", "security_officer"].includes(session.user.role)) {
      return errorResponse("Forbidden — insufficient privileges", 403);
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");
    const severity = searchParams.get("severity");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    // ── Build filter ─────────────────────────────────────────
    const filter: Record<string, unknown> = {};

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (severity && ["info", "warning", "critical"].includes(severity)) {
      filter.severity = severity;
    }
    if (userId) filter.userId = userId;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom)
        (filter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      if (dateTo)
        (filter.createdAt as Record<string, Date>).$lte = new Date(dateTo);
    }

    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: "i" } },
        { resource: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
      ];
    }

    // ── Query ────────────────────────────────────────────────
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email role avatar")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return paginatedResponse(logs, page, limit, total);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
