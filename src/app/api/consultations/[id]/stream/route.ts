export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { subscribe } from "@/lib/realtime/bus";
import { Consultation } from "@/lib/db/models/Consultation";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new Response("Invalid consultation ID", { status: 400 });
  }

  // Only the two participants (or an admin) may subscribe to a consultation's
  // realtime stream — this carries WebRTC signaling and must not leak.
  await connectDB();
  const consultation = await Consultation.findById(id)
    .select("patientId doctorId")
    .lean();
  if (!consultation) return new Response("Not found", { status: 404 });

  if (session.user.role === "patient") {
    const patient = await Patient.findOne({ userId: session.user.id })
      .select("_id")
      .lean();
    if (!patient || String(consultation.patientId) !== String(patient._id)) {
      return new Response("Forbidden", { status: 403 });
    }
  } else if (session.user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: session.user.id })
      .select("_id")
      .lean();
    if (!doctor || String(consultation.doctorId) !== String(doctor._id)) {
      return new Response("Forbidden", { status: 403 });
    }
  } else if (session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (m: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(m)}\n\n`));

      const off = subscribe(`consultation:${id}`, send);
      const ping = setInterval(
        () => controller.enqueue(enc.encode(": ping\n\n")),
        25_000
      );

      req.signal.addEventListener("abort", () => {
        off();
        clearInterval(ping);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
