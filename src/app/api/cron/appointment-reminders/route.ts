export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { Appointment } from "@/lib/db/models/Appointment";
import { verifyCronAuth } from "@/lib/cron/auth";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { appointmentReminder } from "@/lib/email/templates/appointment-reminder";

/**
 * Cron: appointment reminders
 * Sends a reminder for appointments scheduled in the next 24 hours that
 * have not yet had a reminder sent. Idempotent via `reminderSentAt`.
 */
export async function POST(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  await connectDB();

  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const due = await Appointment.find({
    status: { $in: ["scheduled", "confirmed"] },
    dateTime: { $gte: now, $lte: horizon },
    $or: [{ reminderSentAt: { $exists: false } }, { reminderSentAt: null }],
  })
    .populate({
      path: "patientId",
      populate: { path: "user", select: "_id name email" },
    })
    .populate({
      path: "doctorId",
      populate: { path: "user", select: "_id name email" },
    })
    .limit(200);

  let sent = 0;
  let failed = 0;

  for (const appt of due) {
    try {
      const view = appt as unknown as {
        _id: { toString(): string };
        dateTime: Date;
        type: "in-person" | "remote";
        patientId?: { user?: { _id?: unknown; name?: string } | null } | null;
        doctorId?: { user?: { name?: string } | null } | null;
      };
      const patientUser = view.patientId?.user;
      const doctorName = view.doctorId?.user?.name ?? "your doctor";
      const patientName = patientUser?.name ?? "there";
      const recipient = patientUser?._id;
      if (!recipient) {
        failed++;
        continue;
      }
      const location = view.type === "remote" ? "Video consultation" : "Clinic";
      const tpl = appointmentReminder({
        patientName,
        doctorName,
        dateTime: view.dateTime,
        location,
      });

      await dispatchNotification({
        userId: String(recipient),
        type: "appointment",
        title: tpl.subject,
        message: `Upcoming appointment with ${doctorName} on ${new Date(
          view.dateTime
        ).toLocaleString()}.`,
        data: {
          link: `/dashboard/appointments/${view._id.toString()}`,
          email: { subject: tpl.subject, html: tpl.html, text: tpl.text },
        },
      });

      await Appointment.updateOne(
        { _id: appt._id },
        { $set: { reminderSentAt: new Date() } }
      );
      sent++;
    } catch (err) {
      failed++;
      console.error(
        "[cron/appointment-reminders]",
        err instanceof Error ? err.message : err
      );
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: due.length,
    sent,
    failed,
  });
}
