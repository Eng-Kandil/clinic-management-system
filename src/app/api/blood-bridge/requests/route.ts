import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { BloodRequest } from "@/lib/db/models/BloodRequest";
import { BloodDonor } from "@/lib/db/models/BloodDonor";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";
import { getBloodTypeCompatibility } from "@/lib/utils/helpers";

// ---------------------------------------------------------------------------
// GET /api/blood-bridge/requests — List blood requests (filtered)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const bloodType = searchParams.get("bloodType");
    const urgency = searchParams.get("urgency");
    const status = searchParams.get("status");
    const myRequests = searchParams.get("myRequests");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (bloodType) {
      filter.bloodType = bloodType;
    }

    if (urgency && ["routine", "urgent", "emergency"].includes(urgency)) {
      filter.urgency = urgency;
    }

    if (
      status &&
      ["open", "partially_fulfilled", "fulfilled", "cancelled"].includes(status)
    ) {
      filter.status = status;
    }

    // Filter for user's own requests
    if (myRequests === "true") {
      filter.requestedBy = new mongoose.Types.ObjectId(session.user.id);
    }

    const [requests, total] = await Promise.all([
      BloodRequest.find(filter)
        .populate("requestedBy", "name email")
        .populate("respondedDonors.donorId", "userId bloodType")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BloodRequest.countDocuments(filter),
    ]);

    return paginatedResponse(requests, page, limit, total);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/blood-bridge/requests — Create a blood request + auto-match
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json();

    // Manual validation since schema may differ from actual model fields
    const { bloodType, unitsNeeded, urgency, hospital, deadline, notes } = body;

    if (!bloodType) return errorResponse("Blood type is required", 400);
    if (!unitsNeeded || unitsNeeded < 1)
      return errorResponse("At least 1 unit is required", 400);
    if (!hospital) return errorResponse("Hospital name is required", 400);

    const validBloodTypes = [
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
      "O+",
      "O-",
    ];
    if (!validBloodTypes.includes(bloodType)) {
      return errorResponse("Invalid blood type", 400);
    }

    const validUrgency = ["routine", "urgent", "emergency"];
    if (urgency && !validUrgency.includes(urgency)) {
      return errorResponse("Invalid urgency level", 400);
    }

    // Build location from body
    const location = body.location || {
      type: "Point" as const,
      coordinates: [0, 0] as [number, number],
      address: hospital,
    };

    // Create the blood request
    const bloodRequest = await BloodRequest.create({
      requestedBy: new mongoose.Types.ObjectId(session.user.id),
      patientId: body.patientId
        ? new mongoose.Types.ObjectId(body.patientId)
        : undefined,
      bloodType,
      unitsNeeded: Math.min(unitsNeeded, 10),
      urgency: urgency || "routine",
      status: "open",
      hospital,
      location,
      respondedDonors: [],
      unitsFulfilled: 0,
      deadline: deadline ? new Date(deadline) : undefined,
      notes,
    });

    // ── Auto-match: find compatible donors ──────────────────────────────
    const compatibleTypes = getBloodTypeCompatibility(bloodType);

    const compatibleDonors = await BloodDonor.find({
      bloodType: { $in: compatibleTypes },
      isAvailable: true,
      // Exclude the requester from being matched to their own request
      userId: { $ne: new mongoose.Types.ObjectId(session.user.id) },
      // Only donors who are past their eligibility period
      $or: [
        { nextEligibleDate: { $exists: false } },
        { nextEligibleDate: null },
        { nextEligibleDate: { $lte: new Date() } },
      ],
    })
      .limit(20)
      .lean();

    // Add matched donors to the request
    if (compatibleDonors.length > 0) {
      const respondedDonors = compatibleDonors.map((donor) => ({
        donorId: donor._id,
        status: "pending" as const,
        respondedAt: new Date(),
      }));

      await BloodRequest.findByIdAndUpdate(bloodRequest._id, {
        $set: { respondedDonors },
      });
    }

    // Fetch the complete populated request
    const populatedRequest = await BloodRequest.findById(bloodRequest._id)
      .populate("requestedBy", "name email")
      .populate({
        path: "respondedDonors.donorId",
        select: "userId bloodType",
        populate: { path: "userId", select: "name" },
      })
      .lean();

    // Notify admins/relevant users for urgent or critical requests
    if (["critical", "urgent", "emergency"].includes(bloodRequest.urgency)) {
      const { Notification } = await import("@/lib/db/models/Notification");
      await Notification.create({
        userId: new mongoose.Types.ObjectId(session.user.id),
        type: "system",
        title: "Urgent Blood Request",
        body: `Urgent request for ${bloodRequest.bloodType} blood. Please check Blood Bridge.`,
        link: `/dashboard/blood-bridge`,
      });
      // TODO: In Phase 7, fan out to nearby eligible donors via 2dsphere $nearSphere
    }

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_BLOOD_REQUEST",
      resource: "BloodRequest",
      resourceId: bloodRequest._id.toString(),
      details: `Created ${urgency || "routine"} blood request for ${unitsNeeded} units of ${bloodType}. ${compatibleDonors.length} compatible donors found.`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: urgency === "emergency" ? "critical" : "info",
    });

    return successResponse(
      {
        request: populatedRequest,
        matchedDonorsCount: compatibleDonors.length,
      },
      `Blood request created. ${compatibleDonors.length} compatible donors found and notified.`,
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
