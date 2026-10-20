import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { AuditLog } from "@/lib/db/models/AuditLog";
import { verifyAuditChain } from "@/lib/utils/audit";
import { errorResponse, successResponse } from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// GET /api/security/stats — Security dashboard statistics
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (!["admin", "security_officer"].includes(session.user.role)) {
      return errorResponse("Forbidden — insufficient privileges", 403);
    }

    const { searchParams } = new URL(req.url);
    const verifyChain = searchParams.get("verifyChain") === "true";

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Parallel aggregate queries ───────────────────────────
    const [
      totalLogs,
      severityCounts,
      actionCounts,
      recentCritical,
      failedLogins24h,
      failedLogins7d,
      failedLogins30d,
      logsOverTime,
      recentCriticalEvents,
    ] = await Promise.all([
      // Total audit log count
      AuditLog.countDocuments(),

      // Logs by severity
      AuditLog.aggregate([
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),

      // Logs by action type (top 10)
      AuditLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Recent critical events (last 24h)
      AuditLog.countDocuments({
        severity: "critical",
        createdAt: { $gte: twentyFourHoursAgo },
      }),

      // Failed logins — last 24h
      AuditLog.countDocuments({
        action: { $regex: /login.*fail|failed.*login|LOGIN_FAILED/i },
        createdAt: { $gte: twentyFourHoursAgo },
      }),

      // Failed logins — last 7d
      AuditLog.countDocuments({
        action: { $regex: /login.*fail|failed.*login|LOGIN_FAILED/i },
        createdAt: { $gte: sevenDaysAgo },
      }),

      // Failed logins — last 30d
      AuditLog.countDocuments({
        action: { $regex: /login.*fail|failed.*login|LOGIN_FAILED/i },
        createdAt: { $gte: thirtyDaysAgo },
      }),

      // Logs over time (last 30 days, grouped by day)
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            total: { $sum: 1 },
            critical: {
              $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
            },
            warning: {
              $sum: { $cond: [{ $eq: ["$severity", "warning"] }, 1, 0] },
            },
            info: {
              $sum: { $cond: [{ $eq: ["$severity", "info"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Recent critical events (last 10)
      AuditLog.find({ severity: "critical" })
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // ── Normalize severity counts ────────────────────────────
    const severityMap: Record<string, number> = { info: 0, warning: 0, critical: 0 };
    for (const s of severityCounts) {
      if (s._id) severityMap[s._id as string] = s.count;
    }

    // ── Normalize action counts ──────────────────────────────
    const actionMap = actionCounts.map((a) => ({
      name: a._id as string,
      value: a.count as number,
    }));

    // ── Chain integrity (optional, can be expensive) ─────────
    let chainIntegrity: {
      valid: boolean;
      totalChecked: number;
      brokenAt?: number;
    } | null = null;

    if (verifyChain) {
      chainIntegrity = await verifyAuditChain();
    }

    // ── Active sessions ──────────────────────────────────────
    // No session store is configured in this project (JWT strategy), so we
    // avoid synthetic values and report 0.
    const activeSessions = 0;

    // ── Threat level computation ─────────────────────────────
    let threatLevel: "low" | "medium" | "high" | "critical" = "low";
    const factors: string[] = [];

    if (recentCritical > 5) {
      threatLevel = "critical";
      factors.push(`${recentCritical} critical events in the last 24h`);
    } else if (recentCritical > 2) {
      threatLevel = "high";
      factors.push(`${recentCritical} critical events in the last 24h`);
    } else if (recentCritical > 0) {
      threatLevel = "medium";
      factors.push(`${recentCritical} critical event(s) in the last 24h`);
    }

    if (failedLogins24h > 10) {
      threatLevel =
        threatLevel === "critical"
          ? "critical"
          : threatLevel === "high"
          ? "high"
          : "high";
      factors.push(`${failedLogins24h} failed login attempts in 24h`);
    } else if (failedLogins24h > 3) {
      if (threatLevel === "low") threatLevel = "medium";
      factors.push(`${failedLogins24h} failed login attempts in 24h`);
    }

    if (factors.length === 0) {
      factors.push("No significant threats detected");
    }

    // ── System health indicators ─────────────────────────────
    const systemHealth = {
      database: "healthy" as const,
      authService: "healthy" as const,
      auditPipeline: totalLogs > 0 ? ("healthy" as const) : ("degraded" as const),
      encryption: "healthy" as const,
    };

    // ── Response ─────────────────────────────────────────────
    return successResponse({
      overview: {
        totalLogs,
        severityBreakdown: severityMap,
        recentCritical,
        activeSessions,
        threatLevel,
        threatFactors: factors,
      },
      failedLogins: {
        last24h: failedLogins24h,
        last7d: failedLogins7d,
        last30d: failedLogins30d,
      },
      actionBreakdown: actionMap,
      logsOverTime,
      recentCriticalEvents,
      chainIntegrity,
      systemHealth,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
