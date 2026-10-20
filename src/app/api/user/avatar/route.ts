import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { User } from "@/lib/db/models/User";
import { z } from "zod";

// ---------------------------------------------------------------------------
// PATCH /api/user/avatar — Update current user's avatar URL
// ---------------------------------------------------------------------------

// Accepts either a hosted image URL, an inline image data URL (used when no
// object storage is configured — the client resizes to a small thumbnail first),
// or an empty string to remove the current photo. ~1.5MB cap is plenty for a
// compressed avatar while bounding the request size.
const schema = z.object({
  avatarUrl: z
    .string()
    .max(1_500_000)
    .refine(
      (v) =>
        v === "" ||
        /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v) ||
        /^https?:\/\//i.test(v),
      "Must be an image data URL, an http(s) URL, or empty to remove"
    ),
});

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.issues);
    }

    const updated = await User.findByIdAndUpdate(
      session.user.id,
      { $set: { avatar: parsed.data.avatarUrl } },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();

    if (!updated) return errorResponse("User not found", 404);

    return successResponse({ avatar: parsed.data.avatarUrl }, "Avatar updated successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
