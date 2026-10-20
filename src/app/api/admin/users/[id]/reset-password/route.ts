import { NextRequest } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { withAuth } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { User } from "@/lib/db/models/User";
import { PasswordResetToken } from "@/lib/db/models/PasswordResetToken";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/");
  // pathname: /api/admin/users/[id]/reset-password — id is 3 segments from end
  return segments[segments.length - 2] ?? "";
}

// ---------------------------------------------------------------------------
// POST /api/admin/users/[id]/reset-password — Generate reset link (admin only)
// ---------------------------------------------------------------------------

export const POST = withAuth(async (req: NextRequest, { user: admin }) => {
  try {
    await connectDB();

    const id = extractId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid user ID", 400);
    }

    const user = await User.findById(id).lean();
    if (!user) return errorResponse("User not found", 404);

    // Delete all existing reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: id });

    // Generate a new secure token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordResetToken.create({ userId: id, tokenHash, expiresAt });

    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password/${rawToken}`;

    await createAuditLog({
      userId: admin.id,
      action: "ADMIN_PASSWORD_RESET",
      resource: "User",
      resourceId: id,
      details: JSON.stringify({ targetUserId: id }),
      ipAddress:
        req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "warning",
    });

    return successResponse({ resetLink, expiresAt }, "Password reset link generated");
  } catch (error: unknown) {
    console.error("[Admin Reset Password POST] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);
