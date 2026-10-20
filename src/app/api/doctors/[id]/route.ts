import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { z } from "zod";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// GET /api/doctors/[id] — Get doctor detail with user info
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
      return errorResponse("Invalid doctor ID", 400);
    }

    const doctor = await Doctor.findById(id)
      .populate("user", "name email phone avatar")
      .lean();

    if (!doctor) return errorResponse("Doctor not found", 404);

    return successResponse(doctor);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/doctors/[id] — Update doctor profile (self or admin)
// ---------------------------------------------------------------------------

// Availability slot shape MUST match the Doctor model (IAvailableSlot) and the
// slot generator in /api/doctors/[id]/slots: { dayOfWeek, startTime, endTime }.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const availableSlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(HHMM, "startTime must be HH:mm"),
    endTime: z.string().regex(HHMM, "endTime must be HH:mm"),
  })
  .refine((s) => s.startTime < s.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

const updateDoctorSchema = z.object({
  bio: z.string().max(2000).optional(),
  experience: z.number().int().min(0).optional(),
  consultationFee: z.number().min(0).optional(),
  availableSlots: z.array(availableSlotSchema).optional(),
  isAvailableForRemote: z.boolean().optional(),
});

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
      return errorResponse("Invalid doctor ID", 400);
    }

    // Verify the doctor exists
    const existingDoctor = await Doctor.findById(id).lean();
    if (!existingDoctor) return errorResponse("Doctor not found", 404);

    // Only the doctor themselves or an admin can update
    const isSelf = String(existingDoctor.userId) === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isSelf && !isAdmin) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json();
    const validation = updateDoctorSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const updateData: Record<string, unknown> = {};
    const data = validation.data;

    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.experience !== undefined) updateData.experience = data.experience;
    if (data.consultationFee !== undefined) updateData.consultationFee = data.consultationFee;
    if (data.availableSlots !== undefined) updateData.availableSlots = data.availableSlots;
    if (data.isAvailableForRemote !== undefined) updateData.isAvailableForRemote = data.isAvailableForRemote;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("user", "name email phone avatar")
      .lean();

    if (!updatedDoctor) return errorResponse("Doctor not found", 404);

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE_DOCTOR",
      resource: "Doctor",
      resourceId: id,
      details: `Updated doctor profile fields: ${Object.keys(updateData).join(", ")}`,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
    });

    return successResponse(updatedDoctor, "Doctor profile updated successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
