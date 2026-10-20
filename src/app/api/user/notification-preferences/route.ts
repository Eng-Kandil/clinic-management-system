import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { NotificationPreference } from "@/lib/db/models/NotificationPreference";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mapping layer
// ---------------------------------------------------------------------------
//
// External API surface (flat, frontend-friendly):
//   emailAppointments, emailReminders, smsReminders, pushNotifications
//
// Internal storage (channels/types matrix on NotificationPreference):
//   channels.{email, sms, push, inapp}
//   types.{appointment, prescription, billing, marketing}
//
// Mapping:
//   emailAppointments  → channels.email && types.appointment
//   emailReminders     → channels.email && types.billing
//   smsReminders       → channels.sms
//   pushNotifications  → channels.push
//

interface FlatPrefs {
  emailAppointments: boolean;
  emailReminders: boolean;
  smsReminders: boolean;
  pushNotifications: boolean;
}

interface StoredPrefs {
  channels: { email: boolean; sms: boolean; push: boolean; inapp: boolean };
  types: { appointment: boolean; prescription: boolean; billing: boolean; marketing: boolean };
}

function toFlat(stored: StoredPrefs): FlatPrefs {
  return {
    emailAppointments: stored.channels.email && stored.types.appointment,
    emailReminders: stored.channels.email && stored.types.billing,
    smsReminders: stored.channels.sms,
    pushNotifications: stored.channels.push,
  };
}

function mergeFlatIntoStored(stored: StoredPrefs, flat: Partial<FlatPrefs>): StoredPrefs {
  const next: StoredPrefs = {
    channels: { ...stored.channels },
    types: { ...stored.types },
  };

  if (flat.smsReminders !== undefined) next.channels.sms = flat.smsReminders;
  if (flat.pushNotifications !== undefined) next.channels.push = flat.pushNotifications;

  // Email channel stays on if any email-bearing flag is on.
  const hasEmailAppt = flat.emailAppointments ?? toFlat(stored).emailAppointments;
  const hasEmailRemind = flat.emailReminders ?? toFlat(stored).emailReminders;
  next.channels.email = hasEmailAppt || hasEmailRemind;

  if (flat.emailAppointments !== undefined) next.types.appointment = flat.emailAppointments;
  if (flat.emailReminders !== undefined) next.types.billing = flat.emailReminders;

  return next;
}

// ---------------------------------------------------------------------------
// GET /api/user/notification-preferences
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    let pref = await NotificationPreference.findOne({ userId: session.user.id }).lean<StoredPrefs | null>();
    if (!pref) {
      const created = await NotificationPreference.create({ userId: session.user.id });
      pref = created.toObject();
    }

    return successResponse(toFlat(pref));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/user/notification-preferences
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  emailAppointments: z.boolean().optional(),
  emailReminders: z.boolean().optional(),
  smsReminders: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.issues);
    }

    if (Object.keys(parsed.data).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const existing =
      (await NotificationPreference.findOne({ userId: session.user.id }).lean<StoredPrefs | null>()) ?? {
        channels: { email: true, sms: false, push: true, inapp: true },
        types: { appointment: true, prescription: true, billing: true, marketing: false },
      };

    const merged = mergeFlatIntoStored(existing, parsed.data);

    const updated = await NotificationPreference.findOneAndUpdate(
      { userId: session.user.id },
      { $set: { channels: merged.channels, types: merged.types } },
      { new: true, upsert: true, runValidators: true }
    ).lean<StoredPrefs>();

    return successResponse(toFlat(updated), "Preferences updated successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
