# Qikzo — Admin Dashboard

Enterprise-grade **operations console** for the Qikzo delivery & ride platform. A single-page React app (Vite + TypeScript) that fronts the [Qikzo API server](../qikzo-server/README.md) admin endpoints for user management, KYC review, bookings oversight, coupons, payouts, support, and audit.

> React 18 · Vite 5 · TypeScript 5 · Tailwind CSS 3 · TanStack Query 5 · React Router 6 · Sonner · Lucide

---

## Table of contents

1. [Overview](#1-overview)
2. [Feature modules](#2-feature-modules)
3. [Tech stack](#3-tech-stack)
4. [Project structure](#4-project-structure)
5. [Getting started](#5-getting-started)
6. [Environment configuration](#6-environment-configuration)
7. [Architecture](#7-architecture)
8. [Authentication & roles](#8-authentication--roles)
9. [Data & pagination patterns](#9-data--pagination-patterns)
10. [Design system](#10-design-system)
11. [Deployment](#11-deployment)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview

The dashboard is used by internal operators to run the platform day-to-day. It talks exclusively to the `/api/v1/admin/*` surface of the Qikzo server (plus a few read-only catalog endpoints) and never bypasses server-side authorization — every capability is gated by the operator's role on the server.

## 2. Feature modules

| Page                  | File                             | Capabilities                                                                 |
| --------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| **Login**             | `pages/LoginPage.tsx`            | Admin email/password sign-in, session persistence                            |
| **Dashboard**         | `pages/DashboardPage.tsx`        | KPIs, active bookings, live counters                                         |
| **Bookings**          | `pages/BookingsPage.tsx`         | Search, filter, drill-down, cancel/refund actions                            |
| **Riders**            | `pages/RidersPage.tsx`           | List, availability, suspension, document viewer                              |
| **KYC**               | `pages/KycPage.tsx`              | Review pending KYCs, approve/reject with reason                              |
| **Coupons**           | `pages/CouponsPage.tsx`          | Create/edit coupons, usage caps, targeting                                   |
| **Payouts**           | `pages/PayoutsPage.tsx`          | Approve/reject payouts, mark paid, export                                    |
| **Support**           | `pages/SupportPage.tsx` + detail | Ticket queue, reply, close, attachment preview                               |
| **Audit**             | `pages/AuditPage.tsx`            | Immutable action log with actor/target/diff                                  |

## 3. Tech stack

| Concern            | Library                              |
| ------------------ | ------------------------------------ |
| Build              | Vite 5                               |
| UI runtime         | React 18                             |
| Routing            | React Router 6                       |
| Data fetching      | TanStack Query 5                     |
| Styling            | Tailwind CSS 3 + `tailwind-merge`    |
| Icons              | `lucide-react`                       |
| Toasts             | `sonner`                             |
| Date formatting    | `date-fns`                           |
| Language           | TypeScript 5                         |

## 4. Project structure

```text
Qikzo-admin-dashboard/
├─ index.html
├─ src/
│  ├─ main.tsx                # React root + providers
│  ├─ App.tsx                 # Router + auth gate
│  ├─ styles.css              # Tailwind entry
│  ├─ components/
│  │  ├─ Layout.tsx           # Shell: sidebar, topbar, content
│  │  ├─ DataTable.tsx        # Generic sortable/paginated table
│  │  └─ ui.tsx               # Buttons, inputs, badges, modals
│  ├─ pages/                  # One file per admin module (PascalCase)
│  │  ├─ LoginPage.tsx
│  │  ├─ DashboardPage.tsx
│  │  ├─ BookingsPage.tsx
│  │  ├─ RidersPage.tsx
│  │  ├─ KycPage.tsx
│  │  ├─ CouponsPage.tsx
│  │  ├─ PayoutsPage.tsx
│  │  ├─ SupportPage.tsx
│  │  ├─ SupportDetailPage.tsx
│  │  └─ AuditPage.tsx
│  └─ lib/
│     ├─ api.ts               # fetch wrapper (auth, error normalisation)
│     ├─ auth.tsx             # AuthProvider + useAuth hook
│     ├─ usePaginated.ts      # Cursor pagination hook
│     ├─ useInfiniteScroll.ts # IntersectionObserver-based loader
│     └─ utils.ts             # cn(), formatters
├─ tailwind.config.ts
├─ postcss.config.js
├─ vite.config.ts
├─ tsconfig.json
└─ .env.example
```

> Page filenames **must be PascalCase** (e.g. `AdminPurchasePage.tsx`) to avoid case-sensitivity breakage on Vercel deploys.

## 5. Getting started

**Prerequisites**: Node 18+, running Qikzo API server.

```bash
cd Qikzo-admin-dashboard
npm install
cp .env.example .env          # set VITE_API_URL
npm run dev                   # http://localhost:5174
```

### Scripts

| Command           | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Vite dev server on port 5174                  |
| `npm run build`   | Type-check (`tsc -b`) + production bundle     |
| `npm run preview` | Preview built assets locally                  |

## 6. Environment configuration

```bash
VITE_API_URL=http://localhost:4000/api
```

For production point at `https://api.your-domain.com/api/v1`. All `VITE_*` variables are inlined at build time.

## 7. Architecture

```text
 React Router routes
   │
   ▼
 AuthProvider (lib/auth.tsx)  ── persists JWT in localStorage
   │
   ▼
 TanStack Query hooks  ─────►  lib/api.ts  ─────►  Qikzo API /admin/*
   │
   ▼
 Pages render tables, forms and modals via components/ui.tsx
```

- **Server is source of truth**: every mutation calls the API, then invalidates the affected query key.
- **Optimistic UI** only for cheap toggles (e.g. rider suspension); everything financial waits for the server.
- **Zero client-side authorisation logic** — the server enforces roles; the UI merely hides controls the operator can't use.

## 8. Authentication & roles

- Sign-in exchanges email/password for an admin JWT.
- `AuthProvider` stores the token, hydrates the current admin, and exposes `signIn`, `signOut`, `user`.
- Protected routes render via a `<RequireAuth>` wrapper in `App.tsx`.
- Role enforcement lives on the server. **Never** trust client-side flags for privileged actions.

## 9. Data & pagination patterns

- `usePaginated.ts` — cursor-based lists (bookings, riders, audit).
- `useInfiniteScroll.ts` — appends pages as the sentinel scrolls into view. No pagination buttons.
- Search inputs are debounced 400 ms before firing.
- Tables render in `components/DataTable.tsx` with a fixed 1 px row separator (no vertical gaps).

## 10. Design system

Consistent with the mobile apps:

- Horizontal padding **6**.
- Border radius **0** across every element.
- No modal alerts — use bottom-sheet-style dialogs from `components/ui.tsx`.
- Infinite scroll, never numbered pagination.
- Buttons show a spinner (not text) while a mutation is in flight.
- Outlined inputs with small vertical padding.
- Palette: minimal black/white with an **orange** action colour.
- Fonts: **Sora** for display, **Manrope** for body.

Tailwind tokens are defined in `tailwind.config.ts`; add new colours/spacing there and reference them by name in components — never inline hex.

## 11. Deployment

Any static host works (Vercel, Netlify, S3+CloudFront, Nginx). Recommended:

```bash
npm run build                 # outputs dist/
```

Set env at build time:

- `VITE_API_URL=https://api.your-domain.com/api/v1`

On Vercel, framework preset is **Vite**, output directory `dist`. Ensure page filenames use PascalCase (Linux build agents are case-sensitive).

## 12. Troubleshooting

| Symptom                                       | Fix                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `401` immediately after login                 | `VITE_API_URL` version mismatch (server upgraded, client cached)        |
| CORS error in browser console                 | Add dashboard origin to server `CORS_ORIGIN`                            |
| Blank page after Vercel deploy                | Page file was `bookingsPage.tsx` — rename to `BookingsPage.tsx`         |
| Query never refetches after action            | Missing `queryClient.invalidateQueries({ queryKey: […] })` in mutation  |
| Tailwind classes not applied                  | Ensure the file path is included in `content` of `tailwind.config.ts`   |

---

© Qikzo. All rights reserved.
