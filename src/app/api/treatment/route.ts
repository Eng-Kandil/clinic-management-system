import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/connect";
import { TreatmentSchema } from "@/lib/validations/treatment.schema";

// ─── GET /api/treatment ───────────────────────────────────────
// Returns treatment tracking entries scoped by role.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const { TreatmentTracking } = await import("@/lib/db/models");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filter: Record<string, any> = {};

    if (session.user.role === "patient") {
      const { Patient } = await import("@/lib/db/models");
      const patient = await Patient.findOne({ userId: session.user.id });
      if (!patient) {
        return NextResponse.json([]);
      }
      filter = { patientId: patient._id };
    } else if (session.user.role === "doctor") {
      const { Doctor, Prescription } = await import("@/lib/db/models");
      const doctor = await Doctor.findOne({ userId: session.user.id });
      if (!doctor) {
        return NextResponse.json([]);
      }
      const prescriptions = await Prescription.find({ doctorId: doctor._id })
        .select("_id")
        .lean();
      const prescriptionIds = prescriptions.map(
        (p: { _id: unknown }) => p._id
      );
      filter = { prescriptionId: { $in: prescriptionIds } };
    }
    // admin: no filter — sees all

    const treatments = await TreatmentTracking.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(treatments);
  } catch {
    return NextResponse.json({ treatments: [] });
  }
}

// ─── POST /api/treatment ──────────────────────────────────────
// Create a new treatment entry (doctor/admin only).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["doctor", "admin"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = TreatmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { TreatmentTracking } = await import("@/lib/db/models");
    const treatment = await TreatmentTracking.create(parsed.data);
    return NextResponse.json(treatment, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
