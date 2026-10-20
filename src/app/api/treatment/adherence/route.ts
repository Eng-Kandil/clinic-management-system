import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import {
  TreatmentTracking,
} from "@/lib/db/models/TreatmentTracking";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import {
  successResponse,
  errorResponse,
} from "@/lib/utils/api-response";
import { createAuditLog } from "@/lib/utils/audit";
import { auth } from "@/lib/auth/auth.config";
import mongoose from "mongoose";

// ── Lean entry type ──────────────────────────────────────────
interface LeanEntry {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  prescriptionId: mongoose.Types.ObjectId;
  medicationName: string;
  dosage: string;
  scheduledTime: Date;
  takenAt?: Date;
  status: "pending" | "taken" | "missed" | "skipped";
  notes?: string;
}

// ─── POST /api/treatment/adherence ───────────────────────────
// Mark a specific schedule entry as taken/missed/skipped.
// Recalculates adherence rate for that prescription+medication.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    const body = await req.json();
    const { entryId, status, notes } = body as {
      entryId: string;
      status: "taken" | "missed" | "skipped";
      notes?: string;
    };

    if (!entryId || !status) {
      return errorResponse("entryId and status are required", 400);
    }

    if (!["taken", "missed", "skipped"].includes(status)) {
      return errorResponse(
        "Status must be 'taken', 'missed', or 'skipped'",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return errorResponse("Invalid entry ID", 400);
    }

    await connectDB();

    const entry = await TreatmentTracking.findById(entryId);
    if (!entry) {
      return errorResponse("Treatment entry not found", 404);
    }

    // Verify access: patient can mark their own; doctor/admin can mark any
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id });
      if (!patient || String(entry.patientId) !== String(patient._id)) {
        return errorResponse("Access denied", 403);
      }
    }

    // Update the entry
    entry.status = status;
    if (status === "taken") {
      entry.takenAt = new Date();
    } else {
      entry.takenAt = undefined;
    }
    if (notes) {
      entry.notes = notes;
    }

    await entry.save();

    // ── Recalculate adherence rate ───────────────────────────
    // Count all non-pending entries for this prescription + medication
    const allEntries = await TreatmentTracking.find({
      prescriptionId: entry.prescriptionId,
      medicationName: entry.medicationName,
      scheduledTime: { $lte: new Date() },
    }).lean<LeanEntry[]>();

    const resolved = allEntries.filter((e) => e.status !== "pending");
    const takenEntries = resolved.filter((e) => e.status === "taken");
    const adherenceRate =
      resolved.length > 0
        ? Math.round((takenEntries.length / resolved.length) * 100)
        : 100;

    // Audit
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId: session.user.id,
      action: "MARK_DOSE",
      resource: "TreatmentTracking",
      resourceId: entryId,
      details: `Marked ${entry.medicationName} dose as ${status}`,
      ipAddress: ip,
      userAgent: ua,
      severity: "info",
    });

    return successResponse(
      {
        entry: {
          _id: entry._id,
          status: entry.status,
          takenAt: entry.takenAt,
          notes: entry.notes,
        },
        adherenceRate,
        totalResolved: resolved.length,
        totalTaken: takenEntries.length,
      },
      `Dose marked as ${status}`
    );
  } catch (error) {
    console.error("Adherence POST error:", error);
    return errorResponse("Failed to mark dose", 500);
  }
}

// ─── GET /api/treatment/adherence ────────────────────────────
// Adherence statistics: overall rate, streaks, missed count, by medication.
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    await connectDB();

    const url = new URL(req.url);
    const patientIdParam = url.searchParams.get("patientId");
    const days = parseInt(url.searchParams.get("days") || "30");

    // Determine target patientId
    let targetPatientId: string | null = null;

    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id });
      if (!patient) {
        return successResponse(computeAdherenceStats([]), "Adherence statistics");
      }
      targetPatientId = String(patient._id);
    } else if (session.user.role === "doctor") {
      if (patientIdParam) {
        targetPatientId = patientIdParam;
      } else {
        // Return aggregated stats for all the doctor's patients
        const doctor = await Doctor.findOne({ userId: session.user.id });
        if (!doctor) {
          return successResponse(computeAdherenceStats([]), "Doctor adherence stats");
        }
        const { Prescription } = await import(
          "@/lib/db/models/Prescription"
        );
        const doctorPrescriptions = await Prescription.find({
          doctorId: doctor._id,
        })
          .select("_id")
          .lean();
        const prescriptionIds = doctorPrescriptions.map(
          (p: { _id: mongoose.Types.ObjectId }) => p._id
        );

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);

        const entries = await TreatmentTracking.find({
          prescriptionId: { $in: prescriptionIds },
          scheduledTime: { $lte: new Date(), $gte: dateThreshold },
        })
          .sort({ scheduledTime: 1 })
          .lean<LeanEntry[]>();

        const stats = computeAdherenceStats(entries);
        return successResponse(stats, "Doctor adherence stats");
      }
    } else if (session.user.role === "admin") {
      targetPatientId = patientIdParam; // null means all
    } else {
      return errorResponse("Unauthorized role", 403);
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      scheduledTime: { $lte: new Date(), $gte: dateThreshold },
    };
    if (targetPatientId) {
      filter.patientId = new mongoose.Types.ObjectId(targetPatientId);
    }

    const entries = await TreatmentTracking.find(filter)
      .sort({ scheduledTime: 1 })
      .lean<LeanEntry[]>();

    const stats = computeAdherenceStats(entries);

    return successResponse(stats, "Adherence statistics");
  } catch (error) {
    console.error("Adherence GET error:", error);
    return errorResponse("Failed to fetch adherence stats", 500);
  }
}

// ─── Helper: compute adherence statistics ────────────────────
function computeAdherenceStats(entries: LeanEntry[]) {
  const resolved = entries.filter((e) => e.status !== "pending");
  const taken = resolved.filter((e) => e.status === "taken");
  const missed = resolved.filter((e) => e.status === "missed");
  const skipped = resolved.filter((e) => e.status === "skipped");
  const pending = entries.filter((e) => e.status === "pending");

  const overallRate =
    resolved.length > 0
      ? Math.round((taken.length / resolved.length) * 100)
      : 100;

  // ── Streaks ─────────────────────────────────────────────────
  // TODO: Use lastConfirmedAt not createdAt to compute streaks to avoid pending entries near end-of-day resetting streak
  const sortedResolved = [...resolved].sort(
    (a, b) =>
      new Date(a.scheduledTime).getTime() -
      new Date(b.scheduledTime).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (const e of sortedResolved) {
    if (e.status === "taken") {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Current streak: count consecutive "taken" from the end
  for (let i = sortedResolved.length - 1; i >= 0; i--) {
    if (sortedResolved[i]!.status === "taken") {
      currentStreak++;
    } else {
      break;
    }
  }

  // ── By medication ──────────────────────────────────────────
  const byMedication: Record<
    string,
    { total: number; taken: number; missed: number; skipped: number; rate: number }
  > = {};

  for (const e of entries) {
    const medName = e.medicationName;
    if (!byMedication[medName]) {
      byMedication[medName] = {
        total: 0,
        taken: 0,
        missed: 0,
        skipped: 0,
        rate: 100,
      };
    }
    byMedication[medName].total++;
    if (e.status === "taken") byMedication[medName].taken++;
    if (e.status === "missed") byMedication[medName].missed++;
    if (e.status === "skipped") byMedication[medName].skipped++;
  }

  for (const med of Object.keys(byMedication)) {
    const m = byMedication[med]!;
    const resolvedCount = m.taken + m.missed + m.skipped;
    m.rate =
      resolvedCount > 0 ? Math.round((m.taken / resolvedCount) * 100) : 100;
  }

  // ── Daily breakdown ────────────────────────────────────────
  const dailyBreakdown: Array<{
    date: string;
    taken: number;
    missed: number;
    skipped: number;
    total: number;
    rate: number;
  }> = [];

  const dayMap = new Map<
    string,
    { taken: number; missed: number; skipped: number; total: number }
  >();

  for (const e of entries) {
    const day = new Date(e.scheduledTime).toISOString().split("T")[0]!;
    if (!dayMap.has(day)) {
      dayMap.set(day, { taken: 0, missed: 0, skipped: 0, total: 0 });
    }
    const d = dayMap.get(day)!;
    d.total++;
    if (e.status === "taken") d.taken++;
    if (e.status === "missed") d.missed++;
    if (e.status === "skipped") d.skipped++;
  }

  for (const [date, d] of dayMap.entries()) {
    const resolvedCount = d.taken + d.missed + d.skipped;
    dailyBreakdown.push({
      date,
      ...d,
      rate:
        resolvedCount > 0
          ? Math.round((d.taken / resolvedCount) * 100)
          : 100,
    });
  }

  dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

  return {
    overallRate,
    totalEntries: entries.length,
    totalTaken: taken.length,
    totalMissed: missed.length,
    totalSkipped: skipped.length,
    totalPending: pending.length,
    currentStreak,
    longestStreak,
    byMedication,
    dailyBreakdown,
  };
}
