import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { BloodDonor } from "@/lib/db/models/BloodDonor";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";
import { registerDonorSchema } from "@/lib/validators/blood-bridge.schema";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/blood-bridge/donors — List blood donors (filtered)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);

    // ── myProfile shortcut: return only the caller's donor profile ──────────
    if (searchParams.get("myProfile") === "true") {
      const profile = await BloodDonor.findOne({
        userId: new mongoose.Types.ObjectId(session.user.id),
      })
        .populate("userId", "name email phone avatar")
        .lean();

      if (!profile) {
        return errorResponse("Donor profile not found", 404);
      }

      return successResponse(profile);
    }

    const bloodType = searchParams.get("bloodType");
    const isAvailable = searchParams.get("isAvailable");
    const lng = searchParams.get("lng");
    const lat = searchParams.get("lat");
    const maxDistance = searchParams.get("maxDistance"); // in km
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );
    const skip = (page - 1) * limit;

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (bloodType) {
      filter.bloodType = bloodType;
    }

    if (isAvailable !== null && isAvailable !== undefined && isAvailable !== "") {
      filter.isAvailable = isAvailable === "true";
    }

    // Geo-proximity search
    if (lng && lat) {
      const longitude = parseFloat(lng);
      const latitude = parseFloat(lat);
      const distanceKm = parseFloat(maxDistance || "50");

      if (!isNaN(longitude) && !isNaN(latitude)) {
        filter.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: distanceKm * 1000, // convert km to meters
          },
        };
      }
    }

    const [donors, total] = await Promise.all([
      BloodDonor.find(filter)
        .populate("userId", "name email phone avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BloodDonor.countDocuments(
        // $near doesn't work with countDocuments, so strip it
        filter.location ? { ...filter, location: undefined } : filter
      ),
    ]);

    return paginatedResponse(donors, page, limit, total);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/blood-bridge/donors — Register as blood donor
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const validation = registerDonorSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    // Check if user is already registered as a donor
    const existingDonor = await BloodDonor.findOne({
      userId: new mongoose.Types.ObjectId(session.user.id),
    }).lean();

    if (existingDonor) {
      return errorResponse(
        "You are already registered as a blood donor",
        409
      );
    }

    const { bloodType, lastDonationDate, isAvailable } = validation.data;

    // Calculate next eligible date (56 days after last donation)
    let nextEligibleDate: Date | undefined;
    if (lastDonationDate) {
      const lastDate = new Date(lastDonationDate);
      nextEligibleDate = new Date(lastDate);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + 56);
    }

    // Build location from body (accept coordinates or address)
    const location = body.location || {
      type: "Point" as const,
      coordinates: [0, 0] as [number, number],
      address: body.address || "",
    };

    const donor = await BloodDonor.create({
      userId: new mongoose.Types.ObjectId(session.user.id),
      bloodType,
      isAvailable: isAvailable ?? true,
      lastDonationDate: lastDonationDate
        ? new Date(lastDonationDate)
        : undefined,
      nextEligibleDate,
      location,
      healthConditions: body.medicalConditions || [],
      donationCount: 0,
    });

    const populatedDonor = await BloodDonor.findById(donor._id)
      .populate("userId", "name email phone avatar")
      .lean();

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "REGISTER_BLOOD_DONOR",
      resource: "BloodDonor",
      resourceId: donor._id.toString(),
      details: `Registered as blood donor with blood type ${bloodType}`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    return successResponse(
      populatedDonor,
      "Successfully registered as blood donor",
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
