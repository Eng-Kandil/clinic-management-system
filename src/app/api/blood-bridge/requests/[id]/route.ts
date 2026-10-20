import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { BloodRequest } from "@/lib/db/models/BloodRequest";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/blood-bridge/requests/[id] — Get request details
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
      return errorResponse("Invalid request ID", 400);
    }

    const bloodRequest = await BloodRequest.findById(id)
      .populate("requestedBy", "name email phone")
      .populate({
        path: "respondedDonors.donorId",
        select: "userId bloodType donationCount isAvailable",
        populate: { path: "userId", select: "name email phone" },
      })
      .lean();

    if (!bloodRequest) return errorResponse("Blood request not found", 404);

    return successResponse(bloodRequest);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/blood-bridge/requests/[id] — Update request status
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["partially_fulfilled", "fulfilled", "cancelled"],
  partially_fulfilled: ["fulfilled", "cancelled"],
  fulfilled: [], // Terminal
  cancelled: [], // Terminal
};

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
      return errorResponse("Invalid request ID", 400);
    }

    const existingRequest = await BloodRequest.findById(id).lean();
    if (!existingRequest)
      return errorResponse("Blood request not found", 404);

    // Only requester or admin can update
    if (
      session.user.role !== "admin" &&
      String(existingRequest.requestedBy) !== session.user.id
    ) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    // Handle status change
    if (body.status) {
      const currentStatus = existingRequest.status;
      const allowedNext = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedNext.includes(body.status)) {
        return errorResponse(
          `Cannot transition from "${currentStatus}" to "${body.status}"`,
          400
        );
      }

      updateData.status = body.status;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.deadline) {
      updateData.deadline = new Date(body.deadline);
    }

    if (body.hospital) {
      updateData.hospital = body.hospital;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const updatedRequest = await BloodRequest.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("requestedBy", "name email")
      .populate({
        path: "respondedDonors.donorId",
        select: "userId bloodType",
        populate: { path: "userId", select: "name" },
      })
      .lean();

    if (!updatedRequest)
      return errorResponse("Blood request not found", 404);

    // Audit log
    const auditAction =
      body.status === "cancelled"
        ? "CANCEL_BLOOD_REQUEST"
        : "UPDATE_BLOOD_REQUEST";

    await createAuditLog({
      userId: session.user.id,
      action: auditAction,
      resource: "BloodRequest",
      resourceId: id,
      details: `Updated blood request: ${Object.keys(updateData).join(", ")}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: body.status === "cancelled" ? "warning" : "info",
    });

    return successResponse(
      updatedRequest,
      "Blood request updated successfully"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
