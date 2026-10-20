# ClinicOS — Online Clinic Management System

Graduation project: a full-stack clinic management platform with role-based dashboards for admins, doctors, patients, receptionists and security officers.

**Live demo:** _link added after deployment_ (hosted on a free tier — the first load after a period of inactivity can take ~1 minute while the server wakes up).

## Features

- Appointment booking with real-time slot availability
- Electronic medical records (EMR), prescriptions and treatment tracking
- Video consultations (WebRTC with Server-Sent Events signaling)
- Receptionist queue, check-in and walk-in flows
- Billing and invoices
- Blood Bridge donor / request matching
- Notifications and analytics dashboards
- Security: RBAC, account lockout, hash-chained tamper-evident audit log
- AI-assisted diagnosis and drafting (OpenAI; disabled in the public demo)

## Demo accounts

All demo accounts use the password `Password123!`

| Role | Email |
| --- | --- |
| Admin | admin@clinic.com |
| Doctor | dr.sarah@clinic.com |
| Patient | patient1@clinic.com |
| Receptionist | receptionist@clinic.com |
| Security officer | security@clinic.com |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · MongoDB / Mongoose · NextAuth v5 · TanStack Query · Zustand · Zod · Recharts

## Run locally

```bash
npm install
cp .env.example .env.local   # set MONGODB_URI, NEXTAUTH_SECRET, ENCRYPTION_KEY
npm run seed                 # loads demo data (wipes the target database)
npm run dev
```

## Deployment

Deployed for free on [Render](https://render.com) (see `render.yaml`) with a [MongoDB Atlas](https://www.mongodb.com/atlas) M0 free cluster.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
