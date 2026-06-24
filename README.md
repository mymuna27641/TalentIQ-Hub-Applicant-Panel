# TalentIQ Hub — Applicant Panel

A single applicant-facing panel that merges three previously separate apps —
**Applicant Core System**, **CV Resume Analysis System** and **Job Portal
System** — into one React + Vite application, wired to the TalentIQ Hub backend
(`ai_requirement` Postman collection).

## What's inside

One shell (sidebar + header + layout), one router, one design system. The
sidebar groups every feature:

| Group        | Routes                                                        |
|--------------|---------------------------------------------------------------|
| Overview     | `/` Dashboard · `/profile` · `/leaderboard`                   |
| Jobs         | `/jobs` · `/jobs/:id` · `/recommendations` · `/saved` · `/applications` |
| CV Analyzer  | `/cv` · `/cv/upload` · `/cv/analysis` · `/cv/history`         |
| Account      | `/notifications` · `/settings`                                |
| Auth         | `/login` (register + demo mode)                               |

All panel routes are guarded by `ProtectedRoute`; unauthenticated users are
redirected to `/login`.

## API integration

The service layer lives in `src/api/`:

- `client.js` — fetch wrapper with JWT auth, automatic token refresh on 401,
  `FormData` support, and `withFallback()` so pages degrade to mock data when
  the backend is **offline** (real 4xx/5xx errors still surface).
- `auth.js` — `/auth/register`, `/auth/login`, `/auth/me`, `/auth/refresh`.
- `profile.js` — `/profile/applicant`, `/profile/recruiter`.
- `jobs.js` — `/jobs`, `/jobs/:id`, `/jobs/my-jobs`.
- `applications.js` — `/applications/apply`, `/applications/my-applications`, …
- `ai.js` — `/ai/iq-test/*` and `/ai/cv/upload/:jobId`.

Pages wired to live endpoints (with mock fallback): **Browse Jobs**, **Job
Details**, **Apply** modal, **My Applications**, **Profile**. Auth (login /
register / token refresh / `me`) is fully live.

The CV Upload page keeps its self-contained client-side analyzer (its files
"never leave your browser"); the job-scoped `/ai/cv/upload/:jobId` endpoint is
available in `api/ai.js` for the application flow.

### Configure the backend URL

Copy `.env.example` to `.env` and set `VITE_API_BASE`. Defaults to
`http://127.0.0.1:8000/api/v1`.

### Offline / demo mode

If the backend is unreachable, the login screen offers **Continue in demo
mode** and pages render mock data. A "Demo mode" pill appears in the header.

## Run

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```
