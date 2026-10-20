import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/connect";
import { Appointment } from "@/lib/db/models/Appointment";

// ---------------------------------------------------------------------------
// GET /api/appointments/[id]/ics — Download appointment as .ics calendar file
// ---------------------------------------------------------------------------

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;

  const appt = await Appointment.findById(id)
    .populate({
      path: "doctorId",
      select: "userId specialization",
      populate: { path: "user", select: "name" },
    })
    .populate({
      path: "patientId",
      select: "userId",
      populate: { path: "user", select: "name" },
    })
    .lean();

  if (!appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doctorDoc = appt.doctorId as unknown as {
    user?: { name?: string };
  } | null;
  const doctorName = doctorDoc?.user?.name ? `Dr. ${doctorDoc.user.name}` : null;
  const reason = (appt.reason as string) || "";

  // Escape per RFC 5545 (commas, semicolons, backslashes, newlines)
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  // Build ICS content
  const dtStart = new Date(appt.dateTime as Date);
  const dtEnd = appt.endTime
    ? new Date(appt.endTime as Date)
    : new Date(dtStart.getTime() + 30 * 60 * 1000); // 30 min default
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `${id}@clinic`;

  const summary = doctorName
    ? `Medical Appointment with ${doctorName}`
    : "Medical Appointment";
  const descriptionParts = [
    appt.type === "remote" ? "Remote (video) consultation" : "In-person visit at the clinic",
  ];
  if (reason) descriptionParts.push(`Reason: ${reason}`);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClinicManagement//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dtStart)}`,
    `DTEND:${fmt(dtEnd)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(descriptionParts.join(" — "))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": `attachment; filename="appointment-${id}.ics"`,
    },
  });
}
