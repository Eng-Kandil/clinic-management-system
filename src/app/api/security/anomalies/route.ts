import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { AuditLog } from "@/lib/db/models/AuditLog";
import { errorResponse, successResponse } from "@/lib/utils/api-response";

interface SecurityAnomaly {
  id: string;
  type:
    | "brute_force"
    | "unusual_access"
    | "new_ip"
    | "privilege_escalation"
    | "data_exfiltration"
    | "off_hours_access"
    | "rapid_requests";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  ipAddress: string;
  recommendation: string;
  dismissed: boolean;
}

type AuditSeverity = "info" | "warning" | "critical";

function mapSeverity(severity: AuditSeverity): SecurityAnomaly["severity"] {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "high";
  return "low";
}

function inferType(action: string, details: string): SecurityAnomaly["type"] {
  const text = `${action} ${details}`.toLowerCase();

  if (text.includes("login") && (text.includes("fail") || text.includes("brute"))) {
    return "brute_force";
  }

  if (text.includes("role") || text.includes("privilege")) {
    return "privilege_escalation";
  }

  if (text.includes("export") || text.includes("download") || text.includes("exfil")) {
    return "data_exfiltration";
  }

  if (text.includes("rate") || text.includes("rapid") || text.includes("requests")) {
    return "rapid_requests";
  }

  if (text.includes("new ip") || text.includes("unknown ip") || text.includes("geo")) {
    return "new_ip";
  }

  if (text.includes("off-hours") || text.includes("off hours") || text.includes("midnight")) {
    return "off_hours_access";
  }

  return "unusual_access";
}

function buildRecommendation(type: SecurityAnomaly["type"]): string {
  switch (type) {
    case "brute_force":
      return "Review failed logins and consider account lockout or IP blocking.";
    case "privilege_escalation":
      return "Review permission changes and verify authorized access.";
    case "data_exfiltration":
      return "Review export activity and confirm business justification.";
    case "rapid_requests":
      return "Investigate request spikes and tighten rate limits if needed.";
    case "new_ip":
      return "Verify login location and device with the user.";
    case "off_hours_access":
      return "Confirm that off-hours access was expected.";
    default:
      return "Review this event for unusual access behavior.";
  }
}

type LeanAuditLog = {
  _id: unknown;
  action: string;
  details: string;
  severity: AuditSeverity;
  ipAddress?: string;
  createdAt: Date;
  userId?: { _id?: unknown; name?: string } | unknown;
};

const allowedTypes = new Set<SecurityAnomaly["type"]>([
  "brute_force",
  "unusual_access",
  "new_ip",
  "privilege_escalation",
  "data_exfiltration",
  "off_hours_access",
  "rapid_requests",
]);

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (!["admin", "security_officer"].includes(session.user.role)) {
      return errorResponse("Forbidden — insufficient privileges", 403);
    }

    const { searchParams } = new URL(req.url);
    const severityFilter = searchParams.get("severity");
    const typeFilter = searchParams.get("type");
    const showDismissed = searchParams.get("showDismissed") === "true";

    const logs = await AuditLog.find({ severity: { $in: ["warning", "critical"] } })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean<LeanAuditLog[]>();

    let anomalies: SecurityAnomaly[] = logs.map((log) => {
      const type = inferType(log.action, log.details || "");
      const populatedUser =
        log.userId && typeof log.userId === "object" && "name" in log.userId
          ? (log.userId as { _id?: unknown; name?: string })
          : null;

      return {
        id: String(log._id),
        type,
        severity: mapSeverity(log.severity),
        title: log.action.replace(/_/g, " "),
        description: log.details || "No details provided",
        timestamp: new Date(log.createdAt).toISOString(),
        userId: populatedUser?._id ? String(populatedUser._id) : undefined,
        userName: populatedUser?.name,
        ipAddress: log.ipAddress || "unknown",
        recommendation: buildRecommendation(type),
        dismissed: false,
      };
    });

    if (!showDismissed) {
      anomalies = anomalies.filter((anomaly) => !anomaly.dismissed);
    }

    if (severityFilter && ["low", "medium", "high", "critical"].includes(severityFilter)) {
      anomalies = anomalies.filter((anomaly) => anomaly.severity === severityFilter);
    }

    if (typeFilter && allowedTypes.has(typeFilter as SecurityAnomaly["type"])) {
      anomalies = anomalies.filter((anomaly) => anomaly.type === typeFilter);
    }

    const summary = {
      total: anomalies.length,
      critical: anomalies.filter((a) => a.severity === "critical").length,
      high: anomalies.filter((a) => a.severity === "high").length,
      medium: anomalies.filter((a) => a.severity === "medium").length,
      low: anomalies.filter((a) => a.severity === "low").length,
    };

    return successResponse({ anomalies, summary });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
