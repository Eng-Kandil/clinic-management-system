import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { withAuth } from "@/lib/auth/rbac";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response";
import { User } from "@/lib/db/models/User";
import { Doctor } from "@/lib/db/models/Doctor";
import { Appointment } from "@/lib/db/models/Appointment";
import { Consultation } from "@/lib/db/models/Consultation";
import { Invoice } from "@/lib/db/models/Invoice";
import { createAuditLog } from "@/lib/utils/audit";
import { DEFAULT_AVAILABLE_SLOTS } from "@/lib/constants/availability";
import { z } from "zod";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// GET /api/admin/users — Advanced user listing (admin only)
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: NextRequest, { user: admin }) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const status = searchParams.get("status"); // "active" | "inactive"
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;
    const includeStats = searchParams.get("includeStats") === "true";

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (role && ["admin", "doctor", "patient", "security_officer"].includes(role)) {
      filter.role = role;
    }

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }

    if (startDate || endDate) {
      filter.createdAt = {} as Record<string, Date>;
      if (startDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = end;
      }
    }

    // Validate sort field
    const allowedSortFields = ["createdAt", "name", "email", "role", "lastLogin"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ [safeSortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Optionally enrich with related data counts
    type UserStats = {
      appointments: number;
      consultations: number;
      invoices: number;
      totalBilled: number;
    };
    type EnrichedUser = (typeof users)[number] & { _stats?: UserStats };
    let enrichedUsers: EnrichedUser[] = users as EnrichedUser[];
    if (includeStats && users.length > 0) {
      const userIds = users.map((u) => u._id);

      // Use $facet to count each user's appointments from patient and doctor
      // perspectives separately, then merge — avoids double-counting a user
      // who appears as both patientId and doctorId across different appointments.
      const [appointmentCounts, consultationCounts, invoiceCounts] = await Promise.all([
        Appointment.aggregate([
          {
            $facet: {
              asPatient: [
                { $match: { patientId: { $in: userIds } } },
                { $group: { _id: "$patientId", count: { $sum: 1 } } },
              ],
              asDoctor: [
                { $match: { doctorId: { $in: userIds } } },
                { $group: { _id: "$doctorId", count: { $sum: 1 } } },
              ],
            },
          },
          {
            $project: {
              combined: { $concatArrays: ["$asPatient", "$asDoctor"] },
            },
          },
          { $unwind: "$combined" },
          {
            $group: {
              _id: "$combined._id",
              count: { $sum: "$combined.count" },
            },
          },
        ]),

        Consultation.aggregate([
          {
            $facet: {
              asPatient: [
                { $match: { patientId: { $in: userIds } } },
                { $group: { _id: "$patientId", count: { $sum: 1 } } },
              ],
              asDoctor: [
                { $match: { doctorId: { $in: userIds } } },
                { $group: { _id: "$doctorId", count: { $sum: 1 } } },
              ],
            },
          },
          {
            $project: {
              combined: { $concatArrays: ["$asPatient", "$asDoctor"] },
            },
          },
          { $unwind: "$combined" },
          {
            $group: {
              _id: "$combined._id",
              count: { $sum: "$combined.count" },
            },
          },
        ]),

        Invoice.aggregate([
          { $match: { patientId: { $in: userIds } } },
          { $group: { _id: "$patientId", count: { $sum: 1 }, totalAmount: { $sum: "$total" } } },
        ]),
      ]);

      const apptMap = new Map(appointmentCounts.map((a) => [a._id.toString(), a.count]));
      const consultMap = new Map(consultationCounts.map((c) => [c._id.toString(), c.count]));
      const invoiceMap = new Map(
        invoiceCounts.map((i) => [i._id.toString(), { count: i.count, totalAmount: i.totalAmount }])
      );

      enrichedUsers = users.map((user) => {
        const id = user._id.toString();
        return {
          ...user,
          _stats: {
            appointments: apptMap.get(id) ?? 0,
            consultations: consultMap.get(id) ?? 0,
            invoices: invoiceMap.get(id)?.count ?? 0,
            totalBilled: invoiceMap.get(id)?.totalAmount ?? 0,
          },
        };
      }) as EnrichedUser[];
    }

    // Return role/status counts using per-role countDocuments to avoid
    // double-counting users who may appear in multiple related collections.
    const [patientCount, doctorCount, adminCount, securityOfficerCount, statusCounts] =
      await Promise.all([
        User.countDocuments({ role: "patient" }),
        User.countDocuments({ role: "doctor" }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "security_officer" }),
        User.aggregate([{ $group: { _id: "$isActive", count: { $sum: 1 } } }]),
      ]);

    const meta = {
      roleCounts: {
        patient: patientCount,
        doctor: doctorCount,
        admin: adminCount,
        security_officer: securityOfficerCount,
      },
      activeCounts: {
        active: statusCounts.find((s) => s._id === true)?.count ?? 0,
        inactive: statusCounts.find((s) => s._id === false)?.count ?? 0,
      },
    };

    const totalPages = Math.ceil(total / limit);
    return successResponse({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      meta,
    });
  } catch (error: unknown) {
    console.error("[Admin Users GET] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);

// ---------------------------------------------------------------------------
// POST /api/admin/users — Create new user (admin only)
// ---------------------------------------------------------------------------

const createUserSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["admin", "doctor", "patient", "security_officer"]),
    phone: z.string().optional(),
    isActive: z.boolean().optional().default(true),
    // Doctor-only fields (required when role === "doctor", see refinement).
    specialization: z.string().optional(),
    consultationFee: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "doctor") {
      if (!data.specialization || data.specialization.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["specialization"],
          message: "Specialty is required for doctors",
        });
      }
      if (data.consultationFee === undefined || Number.isNaN(data.consultationFee)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["consultationFee"],
          message: "Consultation fee is required for doctors",
        });
      }
    }
  });

/**
 * Generate a unique-enough license number for an auto-created doctor profile.
 * Format: MD-<base36 timestamp>-<4 random chars>. The Doctor.licenseNumber
 * field has a unique index; collisions are astronomically unlikely.
 */
function generateLicenseNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MD-${ts}-${rand}`;
}

export const POST = withAuth(async (req: NextRequest, { user: admin }) => {
  try {
    await connectDB();

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const { name, email, password, role, phone, isActive, specialization, consultationFee } =
      validation.data;

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse("A user with this email already exists", 409);
    }

    // Create user (password will be hashed by pre-save hook)
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      phone,
      isActive,
    });

    // For doctors, auto-create the linked Doctor profile so the doctor is
    // immediately bookable. Department is derived from the specialty and a
    // license number is generated. Best-effort cleanup of the user if the
    // doctor profile fails to persist, to avoid orphaned doctor users.
    if (role === "doctor") {
      try {
        await Doctor.create({
          userId: newUser._id,
          specialization,
          department: specialization,
          licenseNumber: generateLicenseNumber(),
          experience: 0,
          consultationFee: consultationFee ?? 0,
          // New doctors are bookable for remote (video/voice) consultations by
          // default with a standard Mon–Fri 09:00–17:00 schedule. They can
          // change both from their Availability page.
          isAvailableForRemote: true,
          availableSlots: DEFAULT_AVAILABLE_SLOTS,
        });
      } catch (doctorError) {
        // Roll back the user so we never leave a doctor account without a profile.
        await User.findByIdAndDelete(newUser._id).catch(() => {});
        console.error("[Admin Users POST] Doctor profile creation failed:", doctorError);
        if (doctorError instanceof mongoose.Error.ValidationError) {
          return errorResponse("Doctor profile validation failed", 400, doctorError.errors);
        }
        return errorResponse("Failed to create the linked doctor profile", 500);
      }
    }

    // Audit log
    await createAuditLog({
      userId: admin.id,
      action: "CREATE_USER",
      resource: "User",
      resourceId: newUser._id.toString(),
      details: `Admin created user: ${name} (${email}) with role ${role}`,
      ipAddress:
        req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "warning",
    });

    // Return user without password
    const userObj = newUser.toJSON();

    return successResponse(userObj, "User created successfully", 201);
  } catch (error: unknown) {
    console.error("[Admin Users POST] Error:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return errorResponse("Validation failed", 400, error.errors);
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);
