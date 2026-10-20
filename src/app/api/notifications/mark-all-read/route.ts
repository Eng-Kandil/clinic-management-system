import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Notification } from "@/lib/db/models/Notification";
import { errorResponse, successResponse } from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// POST /api/notifications/mark-all-read — Mark all unread notifications as read
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const result = await Notification.updateMany(
      { userId: session.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return successResponse(
      { modifiedCount: result.modifiedCount },
      "All notifications marked as read"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
