# Runbook

Operational procedures for running ClinicOS in dev, staging, and production.

## Prerequisites

- Node 20.11+
- pnpm 9+
- MongoDB 7+ (local or Atlas)
- OpenAI API key

## First-time setup

```bash
pnpm install
cp .env.example .env.local
# Fill in the values described below
pnpm seed                  # Creates demo users, patients, doctors, etc.
pnpm dev                   # http://localhost:3000
```

## Environment variables

All required unless noted. Source: `.env.example`.

| Var | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_URL` | Public origin (e.g. `https://clinic.example.com`) |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret (`openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | AES key for at-rest field encryption |
| `OPENAI_API_KEY` | OpenAI access token |
| `OPENAI_MONTHLY_BUDGET_USD` | AI spend cap, default `50` |
| `EMAIL_FROM` | Outbound `From:` address |
| `RESEND_API_KEY` | Resend transactional email |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Voice/video consultations |
| `CRON_SECRET` | Shared bearer for `/api/cron/*` routes |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Attachment storage |

## Common operations

```bash
pnpm dev                   # Local dev server
pnpm build && pnpm start   # Production build + start
pnpm lint                  # ESLint
pnpm lint:secrets          # gitleaks scan (no-git mode)
pnpm test                  # vitest unit/integration
pnpm test:e2e              # Playwright end-to-end
pnpm seed                  # Re-seed demo data (idempotent for users)
pnpm reset:keep-users      # Drop appointments/consultations/etc., keep users
pnpm audit:chain           # Verify audit-log hash chain integrity
```

## Health check

`GET /api/health` returns `200 OK` when the process is alive and the MongoDB connection is healthy. Wire this into your load balancer / uptime monitor.

## Deployment checklist

1. All env vars above set in the target environment.
2. `pnpm build` succeeds with no type or lint errors.
3. `pnpm test` and `pnpm test:e2e` green on the release commit.
4. `pnpm lint:secrets` clean.
5. `NEXTAUTH_URL` matches the public origin **exactly** (scheme + host).
6. MongoDB user has `readWrite` on the target database, no broader role.
7. Run `pnpm audit:chain` against production before and after the deploy window.

## Rollback

The app is stateless aside from MongoDB. To roll back:

1. Redeploy the previous container/build artifact.
2. If a migration or seed changed schemas, restore the most recent MongoDB backup.
3. Run `pnpm audit:chain` to confirm no in-flight writes corrupted the chain.

## Routine maintenance

- **Weekly:** `pnpm audit:chain`. File any FAIL output as a P1 incident.
- **Monthly:** review `OPENAI_MONTHLY_BUDGET_USD` against actual spend in the telemetry collection.
- **Quarterly:** rotate `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` (key rotation requires a re-encryption migration — plan the window).
