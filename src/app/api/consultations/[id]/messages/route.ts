import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Consultation } from "@/lib/db/models/Consultation";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import {
  successResponse,
  errorResponse,
} from "@/lib/utils/api-response";
import { chatMessageSchema } from "@/lib/validators/consultation.schema";
import { publish } from "@/lib/realtime/bus";

// ---------------------------------------------------------------------------
// GET /api/consultations/[id]/messages — Get paginated messages
// ---------------------------------------------------------------------------

export async function GET(
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );

    const consultation = await Consultation.findById(id)
      .select("patientId doctorId messages status")
      .lean();

    if (!consultation) return errorResponse("Consultation not found", 404);

    // Access control
    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !patient ||
        String(consultation.patientId) !== String(patient._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !doctor ||
        String(consultation.doctorId) !== String(doctor._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
    }

    // Paginate messages (newest first for "load older" functionality)
    const allMessages = consultation.messages || [];
    const total = allMessages.length;
    const startIndex = Math.max(0, total - page * limit);
    const endIndex = Math.max(0, total - (page - 1) * limit);
    const messages = allMessages.slice(startIndex, endIndex);

    return successResponse({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: startIndex > 0,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/consultations/[id]/messages — Send a message
// ---------------------------------------------------------------------------

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

    const body = await req.json();
    const validation = chatMessageSchema.safeParse({
      ...body,
      consultationId: id,
      senderId: session.user.id,
    });

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.error.issues);
    }

    const consultation = await Consultation.findById(id)
      .select("patientId doctorId status")
      .lean();

    if (!consultation) return errorResponse("Consultation not found", 404);

    // Only allow messages in active or waiting consultations
    if (consultation.status === "ended") {
      return errorResponse(
        "Cannot send messages to an ended consultation",
        400
      );
    }

    // Access control: only participants can send messages
    let senderId: string | null = null;

    if (session.user.role === "patient") {
      const patient = await Patient.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !patient ||
        String(consultation.patientId) !== String(patient._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
      senderId = session.user.id;
    } else if (session.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: session.user.id })
        .select("_id")
        .lean();
      if (
        !doctor ||
        String(consultation.doctorId) !== String(doctor._id)
      ) {
        return errorResponse("Forbidden", 403);
      }
      senderId = session.user.id;
    } else if (session.user.role === "admin") {
      senderId = session.user.id;
    } else {
      return errorResponse("Forbidden", 403);
    }

    const newMessage = {
      senderId: new mongoose.Types.ObjectId(senderId),
      content: validation.data.content,
      type: validation.data.type || "text",
      fileUrl: validation.data.fileUrl,
      timestamp: new Date(),
    };

    const updated = await Consultation.findByIdAndUpdate(
      id,
      { $push: { messages: newMessage } },
      { new: true }
    )
      .select("messages")
      .lean();

    if (!updated) return errorResponse("Consultation not found", 404);

    // Return the newly added message (last element)
    const addedMessage = updated.messages[updated.messages.length - 1];

    // Best-effort: broadcast over realtime bus to SSE subscribers
    try {
      publish(`consultation:${id}`, "message", addedMessage);
    } catch (pubErr) {
      console.error(
        "[consultations.messages] publish failed",
        pubErr instanceof Error ? pubErr.message : pubErr
      );
    }

    return successResponse(addedMessage, "Message sent successfully", 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
