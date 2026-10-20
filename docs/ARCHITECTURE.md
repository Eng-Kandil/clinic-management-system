# Architecture

ClinicOS is a Next.js 16 (App Router) monolith on Node 20+, MongoDB via Mongoose, NextAuth v5 sessions, and OpenAI for clinical AI features. Server-only logic lives in `src/app/api/**` route handlers; UI is React 19 components under `src/app/(dashboard)/**`.

## High-level flow

```
Browser ──▶ middleware.ts (auth gate) ──▶ App Router page / route handler
                                              │
                                              ├─▶ MongoDB (Mongoose models in src/lib/db/models)
                                              ├─▶ OpenAI (src/lib/ai/openai.ts)
                                              ├─▶ Audit log (src/lib/utils/audit.ts)
                                              └─▶ Realtime bus (src/lib/realtime/bus.ts → SSE)
```

## Layout

| Path | Purpose |
| --- | --- |
| `src/app/` | App Router pages, layouts, API route handlers |
| `src/components/` | UI components grouped by feature (`appointments/`, `admin/`, `treatment/`, `layout/`, `ui/`) |
| `src/lib/auth/` | NextAuth config (`auth.config.ts`) and `rbac.ts` Role union |
| `src/lib/db/` | `connect.ts` cached Mongoose connection + `models/` |
| `src/lib/ai/` | `openai`, `models`, `safety`, `redact`, `rate-limit`, `telemetry` |
| `src/lib/utils/audit.ts` | Hash-chained audit log writer |
| `src/lib/realtime/bus.ts` | In-process EventEmitter for SSE fan-out |
| `src/lib/nav/menus.ts` | Single source of truth for sidebar/mobile nav |
| `src/scripts/` | `seed.ts`, `reset-keep-users.ts`, `verify-audit-chain.ts` |

## Auth & authorization

NextAuth v5 (beta) with the Credentials provider. Passwords hashed with bcrypt. On repeated failures the user document's `lockedUntil` is set; `LOGIN_FAILED` is audited. `src/middleware.ts` re-exports `auth` and matches `["/dashboard/:path*", "/api/((?!auth).*)"]`, so every dashboard route and every non-auth API call requires a session.

Authorization is role-based. `Role` is the union exported from `src/lib/auth/rbac.ts`: `"admin" | "doctor" | "patient" | "security_officer" | "receptionist"`. Route handlers check `session.user.role` directly.

## Data access

`src/lib/db/connect.ts` caches a single Mongoose connection across hot reloads. Models live in `src/lib/db/models/*.ts` and use `_id: mongoose.Types.ObjectId`. Route handlers always `await connectDB()` before any query.

## AI subsystem

See [AI_SAFETY.md](./AI_SAFETY.md). Every AI route:

1. `assertWithinLimit(userId, feature)` — per-feature rate limit.
2. `checkBudget()` — monthly USD budget guard.
3. `wrapUserInput(...)` — PHI redaction + prompt-injection markers.
4. OpenAI call with `MODELS.chat | MODELS.reasoning | MODELS.fast`.
5. `writeUsage({...})` — token + latency telemetry.

## Audit chain

`createAuditLog()` in `src/lib/utils/audit.ts` writes a SHA-256 hash chain: each entry hashes `userId + action + resource + details + previousHash + timestamp`. The first entry uses `GENESIS`. Verify integrity offline with `pnpm audit:chain` (runs `tsx src/scripts/verify-audit-chain.ts`). Tampering with any historical row breaks the chain at that row and every row after.

## Realtime

`src/lib/realtime/bus.ts` is a Node `EventEmitter` with `setMaxListeners(0)`. API routes call `publish(room, event, data)`; SSE handlers call `subscribe(room, onMsg)` to stream events to the browser. This is single-process only — horizontal scaling requires swapping the bus for Redis pub/sub.

## Build & deploy

`pnpm build` runs `next build`. The output is a standard Next.js Node server (no static export). Required runtime env vars are listed in [RUNBOOK.md](./RUNBOOK.md).
