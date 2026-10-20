export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { TreatmentTracking } from "@/lib/db/models/TreatmentTracking";
import { Patient } from "@/lib/db/models/Patient";
import { verifyCronAuth } from "@/lib/cron/auth";
import { dispatchNotification } from "@/lib/notifications/dispatch";

/**
 * Cron: treatment reminders
 * Notifies patients of pending medication doses scheduled in the next hour.
 * Marks doses as "missed" when they are more than 6 hours overdue.
 */
export async function POST(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  await connectDB();

  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 60 * 1000);
  const missedCutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  // 1) Mark long-overdue pending doses as missed
  const missed = await TreatmentTracking.updateMany(
    { status: "pending", scheduledTime: { $lt: missedCutoff } },
    { $set: { status: "missed" } }
  );

  // 2) Find pending doses in the next hour and notify the patient (one digest per patient)
  const upcoming = await TreatmentTracking.find({
    status: "pending",
    scheduledTime: { $gte: now, $lte: horizon },
  })
    .limit(500)
    .lean();

  const byPatient = new Map<string, typeof upcoming>();
  for (const dose of upcoming) {
    const key = String(dose.patientId);
    const arr = byPatient.get(key) ?? [];
    arr.push(dose);
    byPatient.set(key, arr);
  }

  let notified = 0;
  let failed = 0;

  for (const [patientId, doses] of byPatient.entries()) {
    try {
      const patient = await Patient.findById(patientId)
        .populate({ path: "user", select: "_id name email" })
        .lean();
      const view = patient as unknown as {
        user?: { _id?: unknown; name?: string } | null;
      } | null;
      const userId = view?.user?._id;
      if (!userId) {
        failed++;
        continue;
      }
      const name = view?.user?.name ?? "there";
      const lines = doses
        .slice(0, 5)
        .map(
          (d) =>
            `• ${d.medicationName} (${d.dosage}) at ${new Date(
              d.scheduledTime
            ).toLocaleTimeString()}`
        )
        .join("\n");
      const more = doses.length > 5 ? `\n…and ${doses.length - 5} more` : "";
      const subject = `Medication reminder: ${doses.length} dose${
        doses.length === 1 ? "" : "s"
      } due soon`;
      const text = `Hi ${name},\n\nYou have ${doses.length} medication dose(s) coming up:\n\n${lines}${more}\n\n--\nClinic Management System (DEMO)`;
      const html = `<h2>Medication Reminder</h2><p>Hi ${name},</p><p>You have <strong>${doses.length}</strong> medication dose(s) coming up:</p><pre>${lines}${more}</pre><hr/><p style="color:#888;font-size:12px">Clinic Management System (DEMO)</p>`;

      await dispatchNotification({
        userId: String(userId),
        type: "prescription",
        title: subject,
        message: `${doses.length} medication dose(s) due in the next hour.`,
        data: {
          link: `/dashboard/treatment`,
          email: { subject, html, text },
        },
      });
      notified++;
    } catch (err) {
      failed++;
      console.error(
        "[cron/treatment-reminders]",
        err instanceof Error ? err.message : err
      );
    }
  }

  return NextResponse.json({
    ok: true,
    upcomingDoses: upcoming.length,
    patientsNotified: notified,
    failed,
    markedMissed: missed.modifiedCount,
  });
}
