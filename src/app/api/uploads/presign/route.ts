export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/connect";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { getPresignedPutUrl } from "@/lib/storage/s3";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const PURPOSE_TO_KIND = {
  avatar: "avatar",
  attachment: "chat_attachment",
  "lab-result": "emr_attachment",
} as const;

type Purpose = keyof typeof PURPOSE_TO_KIND;

const Schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  size: z.number().int().positive().max(MAX_SIZE),
  purpose: z.enum(["avatar", "attachment", "lab-result"]),
});

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    await connectDB();

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors
      );
    }

    const { contentType, size, purpose } = parsed.data;

    if (!ALLOWED_MIME.has(contentType)) {
      return errorResponse(
        "Unsupported content type. Allowed: image/jpeg, image/png, application/pdf",
        415
      );
    }

    const kind = PURPOSE_TO_KIND[purpose as Purpose];
    const ext = extFromMime(contentType);
    const random = crypto.randomBytes(16).toString("hex");
    const key = `${kind}/${session.user.id}/${Date.now()}-${random}.${ext}`;

    try {
      const url = await getPresignedPutUrl({
        key,
        contentType,
        expiresIn: 300,
      });
      return successResponse(
        {
          key,
          uploadUrl: url,
          method: "PUT",
          headers: { "Content-Type": contentType },
          expiresIn: 300,
          maxSize: MAX_SIZE,
          size,
        },
        "Presigned upload URL created",
        201
      );
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 500;
      const message = err instanceof Error ? err.message : "Storage error";
      return errorResponse(message, status === 503 ? 503 : 500);
    }
  } catch (error) {
    console.error("[uploads/presign]", error);
    return errorResponse("Failed to create upload URL", 500);
  }
}
