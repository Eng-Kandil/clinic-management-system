import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { Notification } from "@/lib/db/models/Notification";
import { NotificationPreference } from "@/lib/db/models/NotificationPreference";
import { User } from "@/lib/db/models/User";
import { sendEmail } from "@/lib/email/resend";
import { publish } from "@/lib/realtime/bus";

export type NotificationChannel = "inApp" | "email" | "sms";

export type NotificationType =
  | "appointment"
  | "prescription"
  | "billing"
  | "system"
  | "chat";

interface DispatchParams {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    link?: string;
    email?: { subject: string; html: string; text?: string };
    sms?: { body: string };
    [key: string]: unknown;
  };
  channels?: NotificationChannel[];
}

interface DispatchResult {
  notificationId?: string;
  channels: { inApp: boolean; email: boolean; sms: boolean };
}

function logErr(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(
    JSON.stringify({
      level: "error",
      scope: `notifications.dispatch.${scope}`,
      message,
    })
  );
}

export async function dispatchNotification(
  params: DispatchParams
): Promise<DispatchResult> {
  const { userId, type, title, message, data, channels } = params;
  const result: DispatchResult = {
    channels: { inApp: false, email: false, sms: false },
  };

  try {
    await connectDB();
  } catch (err) {
    logErr("connect", err);
    return result;
  }

  const userObjectId =
    typeof userId === "string"
      ? new mongoose.Types.ObjectId(userId)
      : userId;

  // 1) Always create the in-app notification
  try {
    const doc = await Notification.create({
      userId: userObjectId,
      type,
      title,
      body: message,
      link: data?.link,
    });
    result.notificationId = doc._id.toString();
    result.channels.inApp = true;
  } catch (err) {
    logErr("createNotification", err);
  }

  // 2) Resolve user prefs and target channels
  let pref: Awaited<ReturnType<typeof NotificationPreference.findOne>> | null = null;
  try {
    pref = await NotificationPreference.findOne({ userId: userObjectId });
  } catch (err) {
    logErr("loadPreferences", err);
  }

  const requested: NotificationChannel[] =
    channels && channels.length > 0 ? channels : ["inApp", "email"];

  const enabled = new Set<NotificationChannel>();
  for (const ch of requested) {
    if (ch === "inApp" && (pref?.channels.inapp ?? true)) enabled.add("inApp");
    if (ch === "email" && (pref?.channels.email ?? true)) enabled.add("email");
    if (ch === "sms" && (pref?.channels.sms ?? false)) enabled.add("sms");
  }

  // 3) Email channel
  if (enabled.has("email")) {
    try {
      const user = await User.findById(userObjectId).select("email name").lean();
      if (user?.email) {
        const tpl = data?.email ?? {
          subject: title,
          html: `<p>${message}</p>`,
          text: message,
        };
        const sendArgs: {
          to: string;
          subject: string;
          html: string;
          text?: string;
        } = { to: user.email, subject: tpl.subject, html: tpl.html };
        if (tpl.text !== undefined) sendArgs.text = tpl.text;
        const r = await sendEmail(sendArgs);
        result.channels.email = r.ok;
        if (!r.ok) logErr("sendEmail", r.error ?? "unknown");
      }
    } catch (err) {
      logErr("emailChannel", err);
    }
  }

  // 4) SMS channel — stub
  if (enabled.has("sms")) {
    try {
      // TODO: integrate SMS provider (e.g., Twilio) — Phase 7.x
      console.log(
        JSON.stringify({
          level: "info",
          scope: "notifications.dispatch.sms",
          message: "SMS stub (no provider configured)",
          to: String(userObjectId),
          body: data?.sms?.body ?? message,
        })
      );
      result.channels.sms = true;
    } catch (err) {
      logErr("smsChannel", err);
    }
  }

  // 5) Realtime bus for SSE
  try {
    publish(`notifications:${String(userObjectId)}`, "notification", {
      id: result.notificationId,
      type,
      title,
      message,
      link: data?.link,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    logErr("publishBus", err);
  }

  return result;
}
