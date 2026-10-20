import crypto from "crypto";
import connectDB from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models/AuditLog";

type AuditSeverity = "info" | "warning" | "critical";

interface CreateAuditLogParams {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: AuditSeverity;
  metadata?: Record<string, unknown>;
}

function computeHash(
  userId: string,
  action: string,
  resource: string,
  details: string,
  previousHash: string,
  timestamp: string
): string {
  const data = `${userId}${action}${resource}${details}${previousHash}${timestamp}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function createAuditLog(params: CreateAuditLogParams) {
  await connectDB();

  const {
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent,
    severity,
    metadata,
  } = params;

  // Get the last audit log entry for hash chaining
  const lastEntry = await AuditLog.findOne().sort({ createdAt: -1 }).lean();
  const previousHash = (lastEntry as { currentHash?: string } | null)?.currentHash ?? "GENESIS";

  const timestamp = new Date().toISOString();
  const currentHash = computeHash(userId, action, resource, details, previousHash, timestamp);

  const auditEntry = await AuditLog.create({
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent,
    severity,
    metadata,
    currentHash,
    previousHash,
  });

  return auditEntry;
}

interface VerifyChainResult {
  valid: boolean;
  brokenAt?: number;
  totalChecked: number;
}

export async function verifyAuditChain(
  startDate?: Date,
  endDate?: Date
): Promise<VerifyChainResult> {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) (filter.createdAt as Record<string, Date>).$gte = startDate;
    if (endDate) (filter.createdAt as Record<string, Date>).$lte = endDate;
  }

  const logs = await AuditLog.find(filter).sort({ createdAt: 1 }).lean();

  if (logs.length === 0) {
    return { valid: true, totalChecked: 0 };
  }

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i] as unknown as Record<string, unknown>;
    const expectedPreviousHash =
      i === 0
        ? (log.previousHash as string) // First entry: trust its previousHash (could be GENESIS or from prior chain)
        : (logs[i - 1] as unknown as Record<string, unknown>).currentHash as string;

    // Verify previous hash linkage (skip for first entry in filtered range)
    if (i > 0 && log.previousHash !== expectedPreviousHash) {
      return { valid: false, brokenAt: i, totalChecked: logs.length };
    }

    // Recompute and verify hash
    const expectedHash = computeHash(
      log.userId as string,
      log.action as string,
      log.resource as string,
      log.details as string,
      log.previousHash as string,
      ((log.createdAt as Date)?.toISOString?.() ?? log.createdAt) as string
    );

    if (log.currentHash !== expectedHash) {
      return { valid: false, brokenAt: i, totalChecked: logs.length };
    }
  }

  return { valid: true, totalChecked: logs.length };
}
