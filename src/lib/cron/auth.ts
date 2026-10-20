import type { NextRequest } from "next/server";

export interface CronAuthFailure {
  ok: false;
  status: number;
  message: string;
}

export interface CronAuthOk {
  ok: true;
}

/**
 * Verifies an incoming cron request carries `Authorization: Bearer <CRON_SECRET>`.
 * Returns a discriminated union so callers can short-circuit with a 401.
 */
export function verifyCronAuth(req: NextRequest): CronAuthOk | CronAuthFailure {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return {
      ok: false,
      status: 503,
      message: "CRON_SECRET is not configured",
    };
  }

  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1]?.trim();

  if (!provided || provided !== expected) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  return { ok: true };
}
