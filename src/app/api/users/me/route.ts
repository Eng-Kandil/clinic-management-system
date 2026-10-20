import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { User } from "@/lib/db/models/User";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET /api/users/me — Get current user profile
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const user = await User.findById(session.user.id).select("-password").lean();
    if (!user) return errorResponse("User not found", 404);

    // Attach related profile if exists
    let profile: unknown = null;

    if (session.user.role === "patient") {
      profile = await Patient.findOne({ userId: session.user.id }).lean();
    } else if (session.user.role === "doctor") {
      profile = await Doctor.findOne({ userId: session.user.id }).lean();
    }

    return successResponse({
      ...user,
      profile,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/users/me — Update current user profile
// ---------------------------------------------------------------------------

const updateMeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  avatar: z.string().url().optional(),
  avatarKey: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const validation = updateMeSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const { name, phone, avatar, avatarKey } = validation.data;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (avatarKey !== undefined) updateData.avatarKey = avatarKey;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();

    if (!updatedUser) return errorResponse("User not found", 404);

    return successResponse(updatedUser, "Profile updated successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/users/me — Soft-delete account (anonymise PII)
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Soft delete: set deletedAt, anonymise PII, deactivate
    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        deletedAt: new Date(),
        name: "[Deleted User]",
        email: `deleted-${session.user.id}@deleted.invalid`,
        isActive: false,
      },
    });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId: session.user.id,
      action: "ACCOUNT_DELETED",
      resource: "User",
      resourceId: session.user.id,
      details: JSON.stringify({ selfDeleted: true }),
      ipAddress: ip,
      userAgent,
      severity: "warning",
    });

    return successResponse(null, "Account deleted successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
