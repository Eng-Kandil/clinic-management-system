# Incident Response

This is the on-call playbook for ClinicOS. Follow it in order. Always favour patient safety over uptime.

## Severity

| Level | Definition | Examples |
| --- | --- | --- |
| **SEV-1** | Patient safety risk or PHI exposure | Auth bypass, audit-chain break, AI returning real PHI, prescriptions auto-finalized |
| **SEV-2** | Major feature down | Booking broken, login down for a role, AI completely unavailable |
| **SEV-3** | Degraded experience | Slow pages, partial UI breakage, single non-critical endpoint failing |

## First 15 minutes

1. **Acknowledge** in the on-call channel. State severity and a one-line impact summary.
2. **Stabilize.** If SEV-1 PHI/auth, take the affected route offline (feature flag or deploy a 503 stub) before investigating.
3. **Snapshot** MongoDB and copy the last hour of audit logs to a read-only location.
4. **Open** an incident doc with: timeline, suspected cause, blast radius, current mitigation.

## Triage by symptom

### Auth bypass / unexpected access
- Pull `AuditLog` entries for `LOGIN_SUCCESS`, `LOGIN_FAILED`, and any sensitive `action` in the last 24h.
- Run `pnpm audit:chain` — a break here means tampering, not a bypass bug.
- Force-rotate `NEXTAUTH_SECRET`; this invalidates every session.
- File a SEV-1 even if the impact looks small.

### Audit chain failure (`pnpm audit:chain` reports FAIL)
- Do **not** mutate the `AuditLog` collection.
- Identify the first failing row and the writer (`userId`, `action`, timestamp).
- Restore from the most recent verified-good backup if integrity is required for compliance.
- Treat as SEV-1 until proven to be a benign clock-skew or duplicate write.

### AI returning PHI or unsafe content
- Disable the affected AI route via env flag or temporary 503.
- Capture the offending request/response (with PHI redacted) for the post-mortem.
- Confirm `wrapUserInput()` is being called on the input path — most regressions are a missing wrap.
- Re-enable only after a unit test covers the regression.

### AI returning HTTP 429 / 503 broadly
- 429: a single user is over the rate limit — usually benign. Check `src/lib/ai/rate-limit.ts` limits.
- 503 with `error: "AI service unavailable"` means the monthly budget is exhausted. Decide: raise `OPENAI_MONTHLY_BUDGET_USD`, or hold until next month.

### Booking / appointments broken
- Check for failing time-slot validation (overlap detection in `PATCH /api/appointments/[id]`).
- Inspect MongoDB indexes on `Appointment` — a missing `{ doctorId: 1, dateTime: 1 }` index will time out conflict checks.

### Realtime not delivering events
- The bus is in-process. If running >1 instance, SSE clients only see events from the instance they connected to. Scale to 1 instance or migrate the bus to Redis.

## Communication

- Internal updates every 30 minutes on SEV-1, every 60 minutes on SEV-2.
- Patient-facing status updates only after legal/clinical review on SEV-1.
- Never include PHI in incident channels or status pages.

## Post-incident

Within 48 hours, publish a post-mortem covering: timeline, root cause, contributing factors, what worked, what didn't, and concrete follow-ups with owners and dates. Add a regression test for every root cause that lacked one.
