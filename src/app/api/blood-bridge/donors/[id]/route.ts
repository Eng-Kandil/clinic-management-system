import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { BloodDonor } from "@/lib/db/models/BloodDonor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/blood-bridge/donors/[id] — Get donor details
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid donor ID", 400);
    }

    const donor = await BloodDonor.findById(id)
      .populate("userId", "name email phone avatar")
      .lean();

    if (!donor) return errorResponse("Donor not found", 404);

    return successResponse(donor);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/blood-bridge/donors/[id] — Update donor profile
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid donor ID", 400);
    }

    const existingDonor = await BloodDonor.findById(id).lean();
    if (!existingDonor) return errorResponse("Donor not found", 404);

    // Only the owner or admin can update
    if (
      session.user.role !== "admin" &&
      String(existingDonor.userId) !== session.user.id
    ) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    // Allowed fields to update
    if (typeof body.isAvailable === "boolean") {
      updateData.isAvailable = body.isAvailable;
    }

    if (body.bloodType) {
      const validTypes = [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
      ];
      if (validTypes.includes(body.bloodType)) {
        updateData.bloodType = body.bloodType;
      }
    }

    if (body.location) {
      updateData.location = body.location;
    }

    if (body.healthConditions && Array.isArray(body.healthConditions)) {
      updateData.healthConditions = body.healthConditions;
    }

    if (body.lastDonationDate) {
      updateData.lastDonationDate = new Date(body.lastDonationDate);
      // Recalculate next eligible date
      const nextDate = new Date(body.lastDonationDate);
      nextDate.setDate(nextDate.getDate() + 56);
      updateData.nextEligibleDate = nextDate;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const updatedDonor = await BloodDonor.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("userId", "name email phone avatar")
      .lean();

    if (!updatedDonor) return errorResponse("Donor not found", 404);

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE_BLOOD_DONOR",
      resource: "BloodDonor",
      resourceId: id,
      details: `Updated donor profile: ${Object.keys(updateData).join(", ")}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    return successResponse(updatedDonor, "Donor profile updated successfully");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/blood-bridge/donors/[id] — Remove donor registration
// ---------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid donor ID", 400);
    }

    const donor = await BloodDonor.findById(id).lean();
    if (!donor) return errorResponse("Donor not found", 404);

    // Only the owner or admin can delete
    if (
      session.user.role !== "admin" &&
      String(donor.userId) !== session.user.id
    ) {
      return errorResponse("Forbidden", 403);
    }

    await BloodDonor.findByIdAndDelete(id);

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_BLOOD_DONOR",
      resource: "BloodDonor",
      resourceId: id,
      details: `Removed blood donor registration for blood type ${donor.bloodType}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "warning",
    });

    return successResponse(null, "Donor registration removed successfully");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
