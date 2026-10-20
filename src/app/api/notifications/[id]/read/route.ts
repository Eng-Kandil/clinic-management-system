import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Notification } from "@/lib/db/models/Notification";
import { errorResponse, successResponse } from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// POST /api/notifications/[id]/read — Mark a notification as read
// ---------------------------------------------------------------------------

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return errorResponse("Invalid notification id", 400);
    }

    // Ownership-enforcing update — only matches if userId matches caller
    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();

    if (!updated) return errorResponse("Notification not found", 404);

    return successResponse(updated, "Notification marked as read");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
