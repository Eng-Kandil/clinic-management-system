export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { Notification } from "@/lib/db/models/Notification";
import { User } from "@/lib/db/models/User";
import { verifyCronAuth } from "@/lib/cron/auth";
import { sendEmail } from "@/lib/email/resend";

/**
 * Cron: notification digest
 * Emails users a daily digest of their unread in-app notifications from the
 * last 24 hours. Only users with at least one unread notification receive a
 * digest. The digest itself does not mark notifications as read.
 */
export async function POST(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  await connectDB();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const unread = await Notification.find({
    readAt: { $exists: false },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();

  const byUser = new Map<string, typeof unread>();
  for (const n of unread) {
    const key = String(n.userId);
    const arr = byUser.get(key) ?? [];
    arr.push(n);
    byUser.set(key, arr);
  }

  let sent = 0;
  let skipped = 0;

  for (const [userId, items] of byUser.entries()) {
    try {
      const user = await User.findById(userId).select("email name").lean();
      const email = (user as { email?: string } | null)?.email;
      const name = (user as { name?: string } | null)?.name ?? "there";
      if (!email) {
        skipped++;
        continue;
      }

      const lines = items
        .slice(0, 10)
        .map((n) => `• [${n.type}] ${n.title} — ${n.body}`)
        .join("\n");
      const more = items.length > 10 ? `\n…and ${items.length - 10} more` : "";
      const subject = `Your daily digest: ${items.length} new notification${
        items.length === 1 ? "" : "s"
      }`;
      const text = `Hi ${name},\n\nHere is your activity from the last 24 hours:\n\n${lines}${more}\n\n--\nClinic Management System (DEMO)`;
      const html = `<h2>Daily Digest</h2><p>Hi ${name},</p><p>Here is your activity from the last 24 hours:</p><pre>${lines}${more}</pre><hr/><p style="color:#888;font-size:12px">Clinic Management System (DEMO)</p>`;

      const r = await sendEmail({ to: email, subject, html, text });
      if (r.ok) sent++;
      else skipped++;
    } catch (err) {
      skipped++;
      console.error(
        "[cron/notification-digest]",
        err instanceof Error ? err.message : err
      );
    }
  }

  return NextResponse.json({
    ok: true,
    users: byUser.size,
    sent,
    skipped,
    notifications: unread.length,
  });
}
