import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/connect";
import { NotificationPreference } from "@/lib/db/models/NotificationPreference";

// ---------------------------------------------------------------------------
// GET /api/users/me/notifications — Get notification preferences
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const prefs = await NotificationPreference.findOne({ userId: session.user.id });
  if (!prefs) {
    // Return defaults without persisting
    return NextResponse.json({
      channels: { email: true, sms: false, push: false, inapp: true },
      types: { appointment: true, prescription: true, billing: true, marketing: false },
    });
  }

  return NextResponse.json(prefs);
}

// ---------------------------------------------------------------------------
// PUT /api/users/me/notifications — Upsert notification preferences
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const prefs = await NotificationPreference.findOneAndUpdate(
    { userId: session.user.id },
    { $set: body },
    { new: true, upsert: true }
  );

  return NextResponse.json(prefs);
}
