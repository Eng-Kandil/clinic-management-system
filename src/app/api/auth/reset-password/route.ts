import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { PasswordResetToken } from "@/lib/db/models/PasswordResetToken";
import { createAuditLog } from "@/lib/utils/audit";
import { passwordSchema } from "@/lib/validations/auth.schema";

const Schema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = Schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.flatten() },
        { status: 400 }
      );
    }

    const { token, newPassword } = body.data;
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetToken = await PasswordResetToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
      usedAt: { $exists: false },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(resetToken.userId, {
      password: hashedPassword,
      $unset: { lockedUntil: 1 },
    });

    // Mark token as used
    await PasswordResetToken.findByIdAndUpdate(resetToken._id, {
      usedAt: new Date(),
    });

    await createAuditLog({
      userId: resetToken.userId.toString(),
      action: "PASSWORD_RESET",
      resource: "Auth",
      details: `Password reset via reset token for userId: ${resetToken.userId.toString()}`,
      ipAddress: "unknown",
      userAgent: "unknown",
      severity: "info",
    });

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
