import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { withAuth } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { Settings } from "@/lib/db/models/Settings";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const SETTINGS_KEY = "global";

async function getOrCreateSettings() {
  let doc = await Settings.findOne({ key: SETTINGS_KEY });
  if (!doc) {
    doc = await Settings.create({ key: SETTINGS_KEY });
  }
  return doc;
}

// ---------------------------------------------------------------------------
// GET /api/admin/settings — Read global feature flags (admin only)
// ---------------------------------------------------------------------------

export const GET = withAuth(async () => {
  try {
    await connectDB();
    const settings = await getOrCreateSettings();
    return successResponse({
      aiEnabled: settings.aiEnabled,
      registrationOpen: settings.registrationOpen,
      maintenanceMode: settings.maintenanceMode,
      updatedAt: settings.updatedAt,
    });
  } catch (error: unknown) {
    console.error("[Admin Settings GET] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);

// ---------------------------------------------------------------------------
// PATCH /api/admin/settings — Update global feature flags (admin only)
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  aiEnabled: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { user: admin }) => {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.issues);
    }

    if (Object.keys(parsed.data).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const before = await getOrCreateSettings();
    const beforeSnapshot = {
      aiEnabled: before.aiEnabled,
      registrationOpen: before.registrationOpen,
      maintenanceMode: before.maintenanceMode,
    };

    const updated = await Settings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: { ...parsed.data, updatedBy: admin.id } },
      { new: true, upsert: true, runValidators: true }
    );

    if (!updated) return errorResponse("Failed to update settings", 500);

    const changedFields = Object.keys(parsed.data);
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    await createAuditLog({
      userId: admin.id,
      action: "UPDATE_SETTINGS",
      resource: "Settings",
      resourceId: String(updated._id),
      details: JSON.stringify({ changedFields, before: beforeSnapshot, after: parsed.data }),
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "warning",
    });

    return successResponse(
      {
        aiEnabled: updated.aiEnabled,
        registrationOpen: updated.registrationOpen,
        maintenanceMode: updated.maintenanceMode,
        updatedAt: updated.updatedAt,
      },
      "Settings updated successfully"
    );
  } catch (error: unknown) {
    console.error("[Admin Settings PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);
