export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/connect";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { FileUpload } from "@/lib/db/models/FileUpload";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const MAX_SIZE = 10 * 1024 * 1024;

const PURPOSE_TO_KIND = {
  avatar: "avatar",
  attachment: "chat_attachment",
  "lab-result": "emr_attachment",
} as const;

type Purpose = keyof typeof PURPOSE_TO_KIND;

const Schema = z.object({
  key: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive().max(MAX_SIZE),
  purpose: z.enum(["avatar", "attachment", "lab-result"]),
  sha256: z.string().min(64).max(128).optional(),
});

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

    const { key, contentType, size, purpose, sha256 } = parsed.data;

    if (!ALLOWED_MIME.has(contentType)) {
      return errorResponse("Unsupported content type", 415);
    }

    const kind = PURPOSE_TO_KIND[purpose as Purpose];

    // Sanity check: key prefix should match owner + kind
    const expectedPrefix = `${kind}/${session.user.id}/`;
    if (!key.startsWith(expectedPrefix)) {
      return errorResponse("Key does not match caller scope", 403);
    }

    const doc = await FileUpload.create({
      ownerId: session.user.id,
      kind,
      s3Key: key,
      mime: contentType,
      size,
      ...(sha256 ? { sha256 } : {}),
    });

    return successResponse(
      {
        id: doc._id.toString(),
        kind: doc.kind,
        s3Key: doc.s3Key,
        mime: doc.mime,
        size: doc.size,
      },
      "Upload confirmed",
      201
    );
  } catch (error) {
    // Duplicate key (s3Key unique) → 409
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: number }).code === 11000
    ) {
      return errorResponse("Upload already confirmed for that key", 409);
    }
    console.error("[uploads/confirm]", error);
    return errorResponse("Failed to confirm upload", 500);
  }
}
