import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { Doctor } from "@/lib/db/models/Doctor";
import { Appointment } from "@/lib/db/models/Appointment";
import { Consultation } from "@/lib/db/models/Consultation";
import { CLINIC_TIME_ZONE } from "@/lib/utils/datetime";

// ---------------------------------------------------------------------------
// GET /api/dashboard/doctor — live stats for the signed-in doctor's dashboard
// ---------------------------------------------------------------------------

/** Today's calendar date in the clinic timezone, as "YYYY-MM-DD". */
function clinicTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface PopulatedUser {
  user?: { name?: string } | null;
}

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role !== "doctor") {
      return errorResponse("Doctors only", 403);
    }

    const doctor = await Doctor.findOne({ userId: session.user.id })
      .select("_id consultationFee")
      .lean();
    if (!doctor) return errorResponse("Doctor profile not found", 404);
    const doctorId = doctor._id;
    const fee = doctor.consultationFee ?? 0;

    // Appointment times are stored as clinic wall-clock encoded at UTC, so the
    // day/month ranges are built from the clinic-local date with a "Z" suffix.
    const todayStr = clinicTodayStr();
    const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${todayStr}T23:59:59.999Z`);
    const monthStart = new Date(`${todayStr.slice(0, 7)}-01T00:00:00.000Z`);

    const [
      todaysAppts,
      pendingConsults,
      apptPatientIds,
      consultPatientIds,
      completedThisMonth,
      recentAppts,
    ] = await Promise.all([
      Appointment.find({
        doctorId,
        dateTime: { $gte: dayStart, $lte: dayEnd },
        status: { $nin: ["cancelled"] },
      })
        .sort({ dateTime: 1 })
        .populate({ path: "patientId", select: "userId", populate: { path: "user", select: "name" } })
        .lean(),
      Consultation.find({ doctorId, status: "waiting" })
        .sort({ createdAt: -1 })
        .limit(12)
        .populate({ path: "patientId", select: "userId", populate: { path: "user", select: "name" } })
        .lean(),
      Appointment.distinct("patientId", { doctorId }),
      Consultation.distinct("patientId", { doctorId }),
      Appointment.countDocuments({
        doctorId,
        status: "completed",
        dateTime: { $gte: monthStart, $lte: dayEnd },
      }),
      Appointment.find({ doctorId })
        .sort({ dateTime: -1 })
        .limit(20)
        .populate({ path: "patientId", select: "userId", populate: { path: "user", select: "name" } })
        .lean(),
    ]);

    // Distinct patients seen by this doctor (appointments ∪ consultations).
    const patientSet = new Set<string>();
    for (const id of apptPatientIds) patientSet.add(String(id));
    for (const id of consultPatientIds) patientSet.add(String(id));

    const patientName = (p: unknown): string =>
      (p as PopulatedUser)?.user?.name || "Patient";

    const todaySchedule = todaysAppts.map((a) => ({
      id: String(a._id),
      patient: patientName(a.patientId),
      dateTime: a.dateTime,
      type: a.type === "remote" ? "Remote" : "In-person",
      status:
        a.status === "completed"
          ? "completed"
          : a.status === "in-progress"
          ? "in-progress"
          : "scheduled",
      reason: a.reason || "",
    }));

    const pendingConsultations = pendingConsults.map((c) => ({
      id: String(c._id),
      patient: patientName(c.patientId),
      requestedAt: c.createdAt,
      type: c.type,
    }));

    // Recent distinct patients (latest visit first).
    const seen = new Set<string>();
    const recentPatients: {
      id: string;
      name: string;
      lastVisit: Date;
      condition: string;
    }[] = [];
    for (const a of recentAppts) {
      const pid = String((a.patientId as { _id?: unknown })?._id ?? "");
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      recentPatients.push({
        id: pid,
        name: patientName(a.patientId),
        lastVisit: a.dateTime,
        condition: a.reason || "—",
      });
      if (recentPatients.length >= 5) break;
    }

    return successResponse({
      todayAppointmentsCount: todaysAppts.length,
      pendingConsultationsCount: pendingConsults.length,
      totalPatients: patientSet.size,
      monthRevenue: completedThisMonth * fee,
      todaySchedule,
      pendingConsultations,
      recentPatients,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
