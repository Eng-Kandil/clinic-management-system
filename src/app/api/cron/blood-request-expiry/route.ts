export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { BloodRequest } from "@/lib/db/models/BloodRequest";
import { verifyCronAuth } from "@/lib/cron/auth";

/**
 * Cron: blood request expiry
 * Closes open blood requests whose `expiresAt` (or `deadline` fallback)
 * has passed. Sets status to "expired".
 */
export async function POST(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  await connectDB();
  const now = new Date();

  const result = await BloodRequest.updateMany(
    {
      status: { $in: ["open", "partially_fulfilled"] },
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: { $exists: false }, deadline: { $lte: now } },
      ],
    },
    { $set: { status: "expired" } }
  );

  return NextResponse.json({
    ok: true,
    expired: result.modifiedCount,
    matched: result.matchedCount,
  });
}
