import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { Patient } from "@/lib/db/models/Patient";
import { passwordSchema } from "@/lib/validations/auth.schema";

// ---------------------------------------------------------------------------
// Validation schema — role is intentionally excluded to prevent role injection
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // ---- Parse & validate body ----
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    // ---- Check for existing user ----
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // ---- Create user — role is always "patient" for public registration ----
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: "patient",
    });

    // ---- Create Patient document (always created for public registrations) ----
    await Patient.create({
      userId: user._id,
      dateOfBirth: new Date("2000-01-01"),
      gender: "other",
      allergies: [],
      chronicConditions: [],
      emergencyContact: {
        name: "N/A",
        phone: "N/A",
        relation: "N/A",
      },
      address: {
        city: "N/A",
        country: "N/A",
      },
    });

    // ---- Return success (omit password) ----
    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    return NextResponse.json(
      { message: "User registered successfully", user: userResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Handle Mongoose duplicate key error (race condition)
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
