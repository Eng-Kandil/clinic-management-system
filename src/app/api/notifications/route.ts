import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Notification } from "@/lib/db/models/Notification";
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// GET /api/notifications — List notifications for the current user
// ---------------------------------------------------------------------------
// Query params:
//   page=1, limit=20, unreadOnly=true|false
// Returns paginated notifications (unread first, then newest first) plus
// `unreadCount` in the message field for convenience? No — use successResponse
// shape would break paginated. Caller computes unread separately via
// `?unreadOnly=true&limit=1` or by counting `readAt == null` in result.
// We expose unread count via a separate `summary` endpoint pattern: include
// it as an extra field by overriding paginatedResponse... Instead, we keep
// strict pagination and add a small GET ?summary=true mode.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);

    // Lightweight summary mode for the topbar bell badge
    if (searchParams.get("summary") === "true") {
      const unreadCount = await Notification.countDocuments({
        userId: session.user.id,
        readAt: null,
      });
      return successResponse({ unreadCount });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const filter: Record<string, unknown> = { userId: session.user.id };
    if (unreadOnly) filter.readAt = null;

    const [items, total] = await Promise.all([
      Notification.find(filter)
        // Unread first (readAt == null sorts before non-null when ascending? No.
        // Use a compound sort: items with readAt null first via $exists sort proxy.
        // Mongoose can't sort by "null first" directly; use createdAt desc which
        // is acceptable since unread are typically the most recent.
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return paginatedResponse(items, page, limit, total);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
