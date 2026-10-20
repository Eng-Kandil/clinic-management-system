import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { verifyAuditChain, createAuditLog } from "@/lib/utils/audit";
import { errorResponse, successResponse } from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// POST /api/security/verify-chain — Verify SHA-256 audit chain integrity
// ---------------------------------------------------------------------------
// Admin / security_officer only. Optional body: { startDate, endDate } ISO strings.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (!["admin", "security_officer"].includes(session.user.role)) {
      return errorResponse("Forbidden — insufficient privileges", 403);
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    try {
      const body = (await req.json().catch(() => ({}))) as {
        startDate?: string;
        endDate?: string;
      };
      if (body.startDate) startDate = new Date(body.startDate);
      if (body.endDate) endDate = new Date(body.endDate);
    } catch {
      // No body / invalid JSON — fall through with full-range verification
    }

    const result = await verifyAuditChain(startDate, endDate);

    // Audit the verification action itself (tamper-evident)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId: session.user.id,
      action: "AUDIT_CHAIN_VERIFIED",
      resource: "AuditLog",
      details: JSON.stringify({
        valid: result.valid,
        totalChecked: result.totalChecked,
        brokenAt: result.brokenAt,
      }),
      ipAddress: ip,
      userAgent,
      severity: result.valid ? "info" : "critical",
    });

    return successResponse(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
