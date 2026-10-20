import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import connectDB from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { PasswordResetToken } from "@/lib/db/models/PasswordResetToken";
import { sendEmail } from "@/lib/email/resend";
import { passwordReset } from "@/lib/email/templates/password-reset";

const Schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = Schema.safeParse(await req.json());

    // Always return 200 to avoid email enumeration
    if (!body.success) {
      return NextResponse.json({
        message: "If that email exists, a reset link was sent.",
      });
    }

    const user = await User.findOne({ email: body.data.email.toLowerCase() });

    // Always return 200 — do not leak whether email exists
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Delete any existing tokens for this user
      await PasswordResetToken.deleteMany({ userId: user._id });

      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        expiresAt,
      });

      const baseUrl =
        process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "";
      const resetUrl = `${baseUrl}/reset-password/${rawToken}`;

      const tpl = passwordReset({ name: user.name ?? "there", resetUrl });
      const sendResult = await sendEmail({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });

      if (!sendResult.ok && process.env.NODE_ENV !== "production") {
        console.log(
          `[DEV] Password reset link for ${user.email}: ${resetUrl}`
        );
      }
    }

    return NextResponse.json({
      message: "If that email exists, a reset link was sent.",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
