import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { Prescription } from "@/lib/db/models/Prescription";
import { MedicalRecord } from "@/lib/db/models/MedicalRecord";
import { Doctor } from "@/lib/db/models/Doctor";
import { Patient } from "@/lib/db/models/Patient";
import { TreatmentTracking } from "@/lib/db/models/TreatmentTracking";
import { successResponse, errorResponse, paginatedResponse } from "@/lib/utils/api-response";
import { createPrescriptionSchema } from "@/lib/validators/prescription.schema";
import { createAuditLog } from "@/lib/utils/audit";
import { auth } from "@/lib/auth/auth.config";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { prescriptionReady } from "@/lib/email/templates/prescription-ready";

// ─── Helper: parse frequency to doses per day ────────────────────────────────
function parseFrequencyToDosesPerDay(frequency: string): number {
  const lower = frequency.toLowerCase().trim();
  if (lower.includes("once daily") || lower === "daily" || lower === "1x daily" || lower === "od") return 1;
  if (lower.includes("twice daily") || lower === "bid" || lower === "2x daily") return 2;
  if (lower.includes("three times") || lower === "tid" || lower === "3x daily") return 3;
  if (lower.includes("four times") || lower === "qid" || lower === "4x daily") return 4;
  if (lower.includes("every 8 hours")) return 3;
  if (lower.includes("every 6 hours")) return 4;
  if (lower.includes("every 12 hours")) return 2;
  if (lower.includes("every 4 hours")) return 6;
  // Try to extract a number
  const match = lower.match(/(\d+)\s*(?:times|x)/);
  if (match && match[1]) return parseInt(match[1], 10);
  return 1; // default
}

// ─── Helper: generate scheduled times for a day ──────────────────────────────
function getScheduledTimesForDay(date: Date, dosesPerDay: number): Date[] {
  const times: Date[] = [];
  const baseHours = [8, 12, 18, 22, 6, 10]; // morning, noon, evening, night, early, mid-morning
  const hoursToUse = baseHours.slice(0, dosesPerDay);

  for (const hour of hoursToUse) {
    const scheduledTime = new Date(date);
    scheduledTime.setHours(hour, 0, 0, 0);
    times.push(scheduledTime);
  }

  return times;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    await connectDB();

    const url = new URL(req.url);
    let patientId = url.searchParams.get("patientId");
    const status = url.searchParams.get("status");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    // IDOR: enforce caller-scoped filtering
    const role = session.user.role;
    if (role === "patient") {
      // Force patientId to caller's own Patient record — ignore query param
      const callerPatient = await Patient.findOne({ userId: session.user.id }).lean();
      if (!callerPatient) return errorResponse("Patient profile not found", 404);
      patientId = callerPatient._id.toString();
    }

    // Build filter
    const filter: Record<string, unknown> = {};
    if (patientId) filter.patientId = patientId;
    if (role === "doctor") {
      // Doctors only see prescriptions they authored
      const callerDoctor = await Doctor.findOne({ userId: session.user.id }).lean();
      if (!callerDoctor) return errorResponse("Doctor profile not found", 404);
      filter.doctorId = callerDoctor._id;
    }
    if (status) filter.status = status;

    const total = await Prescription.countDocuments(filter);

    const prescriptions = await Prescription.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "doctorId",
        populate: { path: "user", select: "name email avatar" },
      })
      .populate({
        path: "patientId",
        populate: { path: "user", select: "name email" },
      })
      .lean();

    return paginatedResponse(prescriptions, page, limit, total);
  } catch (error) {
    console.error("Prescriptions GET error:", error);
    return errorResponse("Failed to fetch prescriptions", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Authentication required", 401);
    }

    if (session.user.role !== "doctor") {
      return errorResponse("Only doctors can create prescriptions", 403);
    }

    const body = await req.json();
    const validation = createPrescriptionSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.flatten().fieldErrors);
    }

    const data = validation.data;

    await connectDB();

    // Find doctor profile
    const doctor = await Doctor.findOne({ userId: session.user.id });
    if (!doctor) {
      return errorResponse("Doctor profile not found", 404);
    }

    // Verify patient exists
    const patient = await Patient.findById(data.patientId);
    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Verify the medical record exists when one is supplied. Prescribing
    // standalone (quick "add medication") is allowed without a record.
    if (data.medicalRecordId) {
      const medicalRecord = await MedicalRecord.findById(data.medicalRecordId);
      if (!medicalRecord) {
        return errorResponse("Medical record not found", 404);
      }
    }

    // TODO: Call /api/ai/prescription-draft?patientId=X to check interactions before save

    // Create the prescription
    const prescription = await Prescription.create({
      patientId: data.patientId,
      doctorId: doctor._id,
      ...(data.medicalRecordId ? { medicalRecordId: data.medicalRecordId } : {}),
      medications: data.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        startDate: new Date(m.startDate),
        endDate: new Date(m.endDate),
      })),
      notes: data.notes,
      status: "active",
    });

    // Generate TreatmentTracking entries for each medication
    const trackingEntries: Array<{
      patientId: string;
      prescriptionId: string;
      medicationName: string;
      dosage: string;
      scheduledTime: Date;
      status: "pending";
    }> = [];

    for (const med of data.medications) {
      const dosesPerDay = parseFrequencyToDosesPerDay(med.frequency);
      const startDate = new Date(med.startDate);
      const endDate = new Date(med.endDate);

      // Generate entries from startDate to endDate
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const scheduledTimes = getScheduledTimesForDay(new Date(currentDate), dosesPerDay);

        for (const scheduledTime of scheduledTimes) {
          trackingEntries.push({
            patientId: data.patientId,
            prescriptionId: prescription._id.toString(),
            medicationName: med.name,
            dosage: med.dosage,
            scheduledTime,
            status: "pending",
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Bulk insert treatment tracking entries (limit to prevent runaway)
    if (trackingEntries.length > 0) {
      const maxEntries = trackingEntries.slice(0, 5000);
      await TreatmentTracking.insertMany(maxEntries);
    }

    // Update the MedicalRecord's prescriptions array (only when linked).
    if (data.medicalRecordId) {
      await MedicalRecord.findByIdAndUpdate(data.medicalRecordId, {
        $push: { prescriptions: prescription._id },
      });
    }

    // Create audit log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "Prescription",
      resourceId: prescription._id.toString(),
      details: `Created prescription with ${data.medications.length} medication(s) for patient ${data.patientId}`,
      ipAddress: ip,
      userAgent: ua,
      severity: "info",
      metadata: {
        patientId: data.patientId,
        medicalRecordId: data.medicalRecordId,
        medicationCount: data.medications.length,
        trackingEntriesCreated: trackingEntries.length,
      },
    });

    // Populate and return
    const populated = await Prescription.findById(prescription._id)
      .populate({
        path: "doctorId",
        populate: { path: "user", select: "name email avatar" },
      })
      .populate({
        path: "patientId",
        populate: { path: "user", select: "name email" },
      });

    // Best-effort: notify the patient that a prescription is ready
    try {
      const populatedView = populated as unknown as {
        doctorId?: { user?: { name?: string } | null } | null;
        patientId?: { user?: { _id?: unknown; name?: string } | null } | null;
      } | null;
      const patientUser = populatedView?.patientId?.user;
      const doctorName = populatedView?.doctorId?.user?.name ?? "Your doctor";
      const patientName = patientUser?.name ?? "there";
      const recipientUserId = patientUser?._id;
      if (recipientUserId) {
        const tpl = prescriptionReady({ patientName, doctorName });
        await dispatchNotification({
          userId: String(recipientUserId),
          type: "prescription",
          title: tpl.subject,
          message: `${doctorName} has issued a new prescription for you.`,
          data: {
            link: `/dashboard/prescriptions/${prescription._id.toString()}`,
            email: { subject: tpl.subject, html: tpl.html, text: tpl.text },
          },
        });
      }
    } catch (notifyErr) {
      console.error(
        "[prescriptions] dispatchNotification failed",
        notifyErr instanceof Error ? notifyErr.message : notifyErr
      );
    }

    return successResponse(populated, "Prescription created successfully", 201);
  } catch (error) {
    console.error("Prescriptions POST error:", error);
    return errorResponse("Failed to create prescription", 500);
  }
}
