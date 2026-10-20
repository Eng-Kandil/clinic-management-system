# Contributing

Thanks for working on ClinicOS. This is a healthcare app — clarity, safety, and auditability beat cleverness every time.

## Setup

```bash
pnpm install
cp .env.example .env.local      # fill in values; see docs/RUNBOOK.md
pnpm seed
pnpm dev
```

Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) before opening your first PR.

## Branching

- `main` is always deployable.
- Branch names: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`, `docs/<scope>`.
- One concern per PR. Refactors land separately from feature work.

## Code style

- TypeScript strict mode. No `any`. If unavoidable at a third-party boundary, prefix the line with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` and a one-line justification.
- Prefer `unknown` + a narrow type guard over `as` casts.
- Server logic lives in `src/app/api/**` or `src/lib/**`. Never import server-only modules from client components.
- React components: function components only, named exports for shared components, default exports for page/route components per Next.js convention.
- Use the existing `src/lib/utils/api-response.ts` helpers (`successResponse`, `errorResponse`) for API shape consistency.
- Navigation entries go in `src/lib/nav/menus.ts`, never inline in `Sidebar.tsx` or `MobileNav.tsx`.

## Database changes

- Add or modify Mongoose models under `src/lib/db/models/`.
- Update `src/scripts/seed.ts` so a fresh `pnpm seed` produces a working demo.
- If your change is destructive on existing data, write a migration script under `src/scripts/` and document it in the PR.

## AI changes

Anything touching `src/lib/ai/**` or an AI route handler:

- Read [docs/AI_SAFETY.md](./docs/AI_SAFETY.md).
- Wrap every user-supplied string with `wrapUserInput()` before sending to OpenAI.
- Add or update a rate limit in `src/lib/ai/rate-limit.ts` for new features.
- Call `writeUsage(...)` after every successful model call.
- Render `MEDICAL_DISCLAIMER` on every AI surface in the UI.

## Tests

- Unit/integration: `pnpm test` (vitest). Co-locate tests as `*.test.ts` next to the code they cover.
- E2E: `pnpm test:e2e` (Playwright). Add a smoke test for any new user-facing flow.
- New API routes need at least: 401 path, 403 path, happy path, and one validation-error path.

## Pre-PR checklist

```bash
pnpm lint
pnpm lint:secrets
pnpm test
pnpm build
pnpm audit:chain     # if you touched anything that writes audit logs
```

All five must pass locally before review.

## PR description

- **What** changed and **why** (link the issue).
- **Risk:** auth, PHI, billing, or AI? Call it out explicitly.
- **Test evidence:** commands run, screenshots for UI, before/after for behaviour changes.
- **Rollback plan:** for anything beyond a docs change.

## Reporting security issues

Do not file a public issue. Email security@clinicos.example with details and we will respond within 2 business days.
