import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { User } from "@/lib/db/models/User";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { z } from "zod";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/users/[id] — Get user by ID (admin only)
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role !== "admin") return errorResponse("Forbidden", 403);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid user ID", 400);
    }

    const user = await User.findById(id).select("-password").lean();
    if (!user) return errorResponse("User not found", 404);

    return successResponse(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/users/[id] — Update user (admin only)
// ---------------------------------------------------------------------------

const updateUserSchema = z.object({
  role: z
    .enum(["admin", "doctor", "patient", "security_officer"])
    .optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role !== "admin") return errorResponse("Forbidden", 403);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid user ID", 400);
    }

    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.role !== undefined) updateData.role = validation.data.role;
    if (validation.data.isActive !== undefined) updateData.isActive = validation.data.isActive;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();

    if (!updatedUser) return errorResponse("User not found", 404);

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE_USER",
      resource: "User",
      resourceId: id,
      details: `Admin updated user: ${JSON.stringify(updateData)}`,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "warning",
    });

    return successResponse(updatedUser, "User updated successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/users/[id] — Soft delete (set isActive: false)
// ---------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role !== "admin") return errorResponse("Forbidden", 403);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid user ID", 400);
    }

    // Prevent self-deletion
    if (id === session.user.id) {
      return errorResponse("Cannot deactivate your own account", 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    )
      .select("-password")
      .lean();

    if (!user) return errorResponse("User not found", 404);

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "DEACTIVATE_USER",
      resource: "User",
      resourceId: id,
      details: `Admin soft-deleted user ${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "critical",
    });

    return successResponse(user, "User deactivated successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
