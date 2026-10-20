import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { User } from "@/lib/db/models/User";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

// ---------------------------------------------------------------------------
// PATCH /api/users/me/password — Change password
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const { currentPassword, newPassword } = validation.data;

    // ── Get user with password ────────────────────────────────────────

    const user = await User.findById(session.user.id).select("+password");
    if (!user) return errorResponse("User not found", 404);

    // ── Verify current password ───────────────────────────────────────

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return errorResponse("Current password is incorrect", 400);
    }

    // ── Prevent reusing same password ─────────────────────────────────

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return errorResponse(
        "New password must be different from current password",
        400
      );
    }

    // ── Hash and save new password ────────────────────────────────────

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(session.user.id, {
      $set: { password: hashedPassword },
    });

    // ── Create audit log ──────────────────────────────────────────────

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      action: "PASSWORD_CHANGED",
      userId: session.user.id,
      resource: "User",
      resourceId: session.user.id,
      details: JSON.stringify({ changedAt: new Date().toISOString() }),
      ipAddress: ip,
      userAgent,
      severity: "warning",
    });

    return successResponse(null, "Password changed successfully");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
