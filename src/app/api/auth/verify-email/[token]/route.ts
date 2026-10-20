import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { User } from "@/lib/db/models/User";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email/[token]
// ---------------------------------------------------------------------------
// NOTE (demo stub): The User model does not currently persist an
// `emailVerificationToken` field. Until that is added, this endpoint requires
// an authenticated session and accepts any non-empty token, marking the
// signed-in user's email as verified. A full implementation should:
//   1. Add `emailVerificationToken` + `emailVerificationExpiresAt` to User.
//   2. Issue a hashed token at signup and on resend.
//   3. Look up `{ emailVerificationToken: hash(token), expiresAt: { $gt: now } }`
//      with no auth required (link-only flow).
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 8) {
      return errorResponse("Invalid verification token", 400);
    }

    await connectDB();

    const session = await auth();
    if (!session?.user) {
      return errorResponse(
        "Please sign in to complete email verification",
        401
      );
    }

    const user = await User.findById(session.user.id);
    if (!user) return errorResponse("User not found", 404);

    if (user.emailVerifiedAt) {
      return successResponse(
        { alreadyVerified: true },
        "Your email is already verified."
      );
    }

    user.emailVerifiedAt = new Date();
    await user.save();

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId: user._id.toString(),
      action: "EMAIL_VERIFIED",
      resource: "User",
      resourceId: user._id.toString(),
      details: JSON.stringify({ email: user.email }),
      ipAddress: ip,
      userAgent,
      severity: "info",
    });

    return successResponse(
      { verifiedAt: user.emailVerifiedAt },
      "Your email has been verified successfully."
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
