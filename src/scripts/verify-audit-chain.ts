import connectDB from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models/AuditLog";
import { createHash } from "crypto";

/**
 * Recomputes the SHA-256 hash for an audit log entry using the exact same
 * fields and concatenation format as computeHash() in src/lib/utils/audit.ts:
 *
 *   `${userId}${action}${resource}${details}${previousHash}${timestamp}`
 *
 * where timestamp is createdAt.toISOString().
 */
function computeHash(
  userId: string,
  action: string,
  resource: string,
  details: string,
  previousHash: string,
  timestamp: string
): string {
  const data = `${userId}${action}${resource}${details}${previousHash}${timestamp}`;
  return createHash("sha256").update(data).digest("hex");
}

async function verifyAuditChain() {
  await connectDB();

  const logs = await AuditLog.find({}).sort({ createdAt: 1 }).lean();

  if (logs.length === 0) {
    console.log("No audit logs found.");
    process.exit(0);
  }

  let errors = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i] as unknown as Record<string, unknown>;
    const logId = log._id;

    // ── Check prevHash linkage ────────────────────────────────────────
    if (i > 0) {
      const prevLog = logs[i - 1] as unknown as Record<string, unknown>;
      const expectedPreviousHash = prevLog.currentHash as string;

      if (log.previousHash !== expectedPreviousHash) {
        console.error(
          `[BREAK] Log ${logId} (index ${i}): previousHash mismatch.`
        );
        console.error(`  Expected: ${expectedPreviousHash}`);
        console.error(`  Got:      ${log.previousHash}`);
        errors++;
      }
    }

    // ── Recompute hash to verify integrity ────────────────────────────
    const timestamp =
      (log.createdAt as Date)?.toISOString?.() ??
      String(log.createdAt);

    const expectedHash = computeHash(
      String(log.userId),
      log.action as string,
      log.resource as string,
      log.details as string,
      log.previousHash as string,
      timestamp
    );

    if (log.currentHash && log.currentHash !== expectedHash) {
      console.error(
        `[TAMPER] Log ${logId} (index ${i}): currentHash mismatch.`
      );
      console.error(`  Expected: ${expectedHash}`);
      console.error(`  Got:      ${log.currentHash}`);
      errors++;
    }
  }

  if (errors === 0) {
    console.log(
      `✅ Audit chain verified. ${logs.length} entries checked. Chain is intact.`
    );
    process.exit(0);
  } else {
    console.error(
      `❌ Audit chain has ${errors} error(s). Chain is broken.`
    );
    process.exit(1);
  }
}

verifyAuditChain().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
