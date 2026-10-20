export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models/AuditLog";
import { verifyCronAuth } from "@/lib/cron/auth";
import { createAuditLog, verifyAuditChain } from "@/lib/utils/audit";

/**
 * Cron: audit checkpoint
 * Verifies the audit log hash chain and appends a SYSTEM checkpoint entry
 * summarising the verification result.
 */
export async function POST(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  await connectDB();

  const total = await AuditLog.countDocuments();
  const last = await AuditLog.findOne().sort({ createdAt: -1 }).lean();
  const lastHash =
    (last as { currentHash?: string } | null)?.currentHash ?? "GENESIS";

  const result = await verifyAuditChain();

  const details = `Audit checkpoint: total=${total}, verified=${result.totalChecked}, valid=${result.valid}${
    result.brokenAt !== undefined ? `, brokenAt=${result.brokenAt}` : ""
  }, lastHash=${lastHash.slice(0, 16)}…`;

  const entry = await createAuditLog({
    userId: "system",
    action: "CHECKPOINT",
    resource: "AuditLog",
    details,
    ipAddress: "127.0.0.1",
    userAgent: "cron/audit-checkpoint",
    severity: result.valid ? "info" : "critical",
    metadata: {
      total,
      verified: result.totalChecked,
      valid: result.valid,
      brokenAt: result.brokenAt,
    },
  });

  return NextResponse.json({
    ok: true,
    valid: result.valid,
    total,
    verified: result.totalChecked,
    brokenAt: result.brokenAt,
    checkpointId: entry._id.toString(),
  });
}
