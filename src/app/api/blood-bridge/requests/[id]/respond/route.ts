import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { BloodRequest } from "@/lib/db/models/BloodRequest";
import { BloodDonor } from "@/lib/db/models/BloodDonor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// POST /api/blood-bridge/requests/[id]/respond — Donor responds to request
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Only patients or donors may respond to blood requests
    if (!["patient", "donor"].includes(session.user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid request ID", 400);
    }

    const body = await req.json();
    const { response } = body; // "accepted" | "declined"

    if (!response || !["accepted", "declined"].includes(response)) {
      return errorResponse(
        'Response must be either "accepted" or "declined"',
        400
      );
    }

    // Find the blood request
    const bloodRequest = await BloodRequest.findById(id);
    if (!bloodRequest)
      return errorResponse("Blood request not found", 404);

    if (bloodRequest.status === "fulfilled") {
      return errorResponse("This request has already been fulfilled", 400);
    }

    if (bloodRequest.status === "cancelled") {
      return errorResponse("This request has been cancelled", 400);
    }

    // Find the donor profile for the current user
    const donor = await BloodDonor.findOne({
      userId: new mongoose.Types.ObjectId(session.user.id),
    }).lean();

    if (!donor) {
      return errorResponse(
        "You must be a registered donor to respond to requests",
        403
      );
    }

    // Eligibility check — donor must be available/eligible
    if (!donor.isAvailable) {
      return errorResponse("You are not currently eligible to donate", 403);
    }

    // Duplicate-response check — prevent responding twice with "accepted"
    const alreadyAccepted = bloodRequest.respondedDonors.some(
      (d) =>
        String(d.donorId) === String(donor._id) &&
        (d.status === "accepted" || d.status === "donated")
    );
    if (alreadyAccepted) {
      return errorResponse("You have already accepted this blood request", 409);
    }

    // Cooldown check — enforce minimum 56 days between donations
    const COOLDOWN_DAYS = 56;
    if (donor.lastDonationDate) {
      const daysSince = Math.floor(
        (Date.now() - new Date(donor.lastDonationDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysSince < COOLDOWN_DAYS) {
        return errorResponse(
          `You must wait ${COOLDOWN_DAYS - daysSince} more day(s) before donating again.`,
          409
        );
      }
    }

    // Check if this donor is in the matchedDonors list
    const donorIndex = bloodRequest.respondedDonors.findIndex(
      (d) => String(d.donorId) === String(donor._id)
    );

    if (donorIndex === -1) {
      // Donor not in the list — add them if they're responding affirmatively
      bloodRequest.respondedDonors.push({
        donorId: donor._id,
        status: response,
        respondedAt: new Date(),
      });
    } else {
      // Update existing entry
      const existingEntry = bloodRequest.respondedDonors[donorIndex]!;
      const currentStatus = existingEntry.status;
      if (currentStatus === "donated") {
        return errorResponse(
          "You have already donated for this request",
          400
        );
      }

      existingEntry.status = response;
      existingEntry.respondedAt = new Date();
    }

    // Count accepted donors and check if request should be marked as fulfilled
    const acceptedCount = bloodRequest.respondedDonors.filter(
      (d) => d.status === "accepted" || d.status === "donated"
    ).length;

    if (acceptedCount >= bloodRequest.unitsNeeded) {
      bloodRequest.status = "fulfilled";
      bloodRequest.unitsFulfilled = bloodRequest.unitsNeeded;
    } else if (acceptedCount > 0 && bloodRequest.status === "open") {
      bloodRequest.status = "partially_fulfilled";
      bloodRequest.unitsFulfilled = acceptedCount;
    } else {
      bloodRequest.unitsFulfilled = acceptedCount;
    }

    await bloodRequest.save();

    // If donor accepted, update their donation count and last donation date
    if (response === "accepted") {
      // Don't update donation count yet — that happens when status becomes "donated"
      // But mark donor as unavailable temporarily
      await BloodDonor.findByIdAndUpdate(donor._id, {
        $set: { isAvailable: false },
      });
    }

    // Fetch updated request
    const updatedRequest = await BloodRequest.findById(id)
      .populate("requestedBy", "name email")
      .populate({
        path: "respondedDonors.donorId",
        select: "userId bloodType",
        populate: { path: "userId", select: "name" },
      })
      .lean();

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "RESPOND_BLOOD_REQUEST",
      resource: "BloodRequest",
      resourceId: id,
      details: `Donor ${response} blood request for ${bloodRequest.bloodType}. ${acceptedCount}/${bloodRequest.unitsNeeded} units fulfilled.`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: response === "accepted" ? "info" : "info",
    });

    return successResponse(
      updatedRequest,
      response === "accepted"
        ? `Thank you for accepting! ${acceptedCount}/${bloodRequest.unitsNeeded} units now covered.`
        : "Response recorded. Thank you for considering."
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
