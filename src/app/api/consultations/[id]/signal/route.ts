import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Consultation } from "@/lib/db/models/Consultation";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { publish } from "@/lib/realtime/bus";

// ---------------------------------------------------------------------------
// POST /api/consultations/[id]/signal — WebRTC signaling relay
//
// Relays SDP offers/answers and ICE candidates between the two call
// participants over the in-memory realtime bus. Each peer subscribes to the
// SSE stream at /api/consultations/[id]/stream and filters out its own
// messages (by `from`). Peer-to-peer media never touches the server; only the
// small signaling payloads pass through here.
// ---------------------------------------------------------------------------

const signalSchema = z.object({
  kind: z.enum(["offer", "answer", "ice", "hangup", "join", "ready"]),
  // SDP description or ICE candidate — opaque to the server. Bounded to keep a
  // single signaling message from being abused as a large relay payload.
  payload: z.unknown().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid consultation ID", 400);
    }

    const consultation = await Consultation.findById(id)
      .select("patientId doctorId status type")
      .lean();
    if (!consultation) return errorResponse("Consultation not found", 404);

    // Only the two participants may exchange signaling messages.
    let role: "patient" | "doctor";
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!patient || String(consultation.patientId) !== String(patient._id)) {
        return errorResponse("Forbidden", 403);
      }
      role = "patient";
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (!doctor || String(consultation.doctorId) !== String(doctor._id)) {
        return errorResponse("Forbidden", 403);
      }
      role = "doctor";
    } else {
      // Admins/security officers are not call participants.
      return errorResponse("Only call participants can signal", 403);
    }

    const raw = await req.json().catch(() => null);
    const parsed = signalSchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse("Invalid signal", 400, parsed.error.issues);
    }

    // Reject oversized payloads (SDP/ICE are small; this guards the relay).
    if (parsed.data.payload !== undefined) {
      const size = JSON.stringify(parsed.data.payload).length;
      if (size > 64_000) return errorResponse("Signal payload too large", 413);
    }

    publish(`consultation:${id}`, "signal", {
      kind: parsed.data.kind,
      payload: parsed.data.payload ?? null,
      from: session.user.id,
      role,
      at: Date.now(),
    });

    return successResponse({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
