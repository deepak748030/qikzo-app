# Qikzo — On-Demand Delivery & Ride Booking Platform

Qikzo is a full-stack, multi-app platform for **on-demand delivery and ride booking** in India (+91). This monorepo contains everything needed to run the product end-to-end: a shared API server, two mobile apps (customer + rider), and a web operations dashboard for admins.

> Monorepo · TypeScript across all apps · Shared REST + Socket.IO surface · Enterprise-grade security, observability and design system

---

## Table of contents

1. [What's in this repo](#1-whats-in-this-repo)
2. [High-level architecture](#2-high-level-architecture)
3. [Tech stack at a glance](#3-tech-stack-at-a-glance)
4. [Repository layout](#4-repository-layout)
5. [Quick start (all apps)](#5-quick-start-all-apps)
6. [Environment matrix](#6-environment-matrix)
7. [End-to-end flows](#7-end-to-end-flows)
8. [Shared conventions](#8-shared-conventions)
9. [Design system](#9-design-system)
10. [Security posture](#10-security-posture)
11. [Deployment topology](#11-deployment-topology)
12. [Operational runbook](#12-operational-runbook)
13. [Roadmap ideas](#13-roadmap-ideas)
14. [Per-project READMEs](#14-per-project-readmes)
15. [License](#15-license)

---

## 1. What's in this repo

| Project                                     | Type                                | Purpose                                                              |
| ------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| [`qikzo-server`](./qikzo-server)            | Node · Express · MongoDB · Socket.IO | REST + realtime API — single source of truth for all clients        |
| [`Qikzo-app`](./Qikzo-app)                  | Expo · React Native (iOS/Android/Web) | **Customer** app — book deliveries/rides, track, pay, rate         |
| [`Qikzo-rider`](./Qikzo-rider)              | Expo · React Native (iOS/Android)   | **Rider** app — go online, accept jobs, run trips, view earnings     |
| [`Qikzo-admin-dashboard`](./Qikzo-admin-dashboard) | React · Vite · Tailwind · TS       | **Admin** console — users, KYC, bookings, coupons, payouts, support  |

All four projects speak the same versioned API (`/api/v1`) and the same Socket.IO event vocabulary.

## 2. High-level architecture

```text
 ┌────────────────┐   ┌────────────────┐   ┌───────────────────────┐
 │  Qikzo-app     │   │  Qikzo-rider   │   │ Qikzo-admin-dashboard │
 │  (customers)   │   │  (drivers)     │   │  (operators)          │
 │  Expo / RN     │   │  Expo / RN     │   │  React + Vite         │
 └───────┬────────┘   └───────┬────────┘   └───────────┬───────────┘
         │  REST /api/v1      │  REST /api/v1          │  REST /admin/*
         │  Socket.IO         │  Socket.IO             │
         └──────────┬─────────┴──────────┬─────────────┘
                    ▼                    ▼
              ┌──────────────────────────────────────┐
              │            qikzo-server              │
              │  Express · Zod · JWT · Sentry · Pino │
              │  helmet · rate-limit · role guards   │
              └───────────────────┬──────────────────┘
                                  ▼
                     ┌────────────────────────┐
                     │   MongoDB (Mongoose)   │
                     │  35+ collections       │
                     │  audit log · migrations│
                     └────────────────────────┘
```

**Design principles**

- **One backend, three clients** — no duplicated business logic.
- **Layered server**: `routes → controllers → services → models`.
- **Realtime by default**: room-scoped Socket.IO for bookings, riders and admin ops.
- **Fail closed**: every write is guarded by `requireAuth` + a role middleware.
- **Serverless-safe**: cached DB connection for cold-start friendliness.
- **Versioned API**: same router mounted at `/api` (legacy) and `/api/v1` (canonical) for zero-downtime client migration.

## 3. Tech stack at a glance

| Layer         | Backend                        | Mobile (customer + rider)                     | Admin dashboard              |
| ------------- | ------------------------------ | --------------------------------------------- | ---------------------------- |
| Language      | TypeScript                     | TypeScript                                    | TypeScript                   |
| Framework     | Express 4                      | Expo SDK 54 · React Native 0.81 · React 19   | React 18 · Vite 5            |
| Data          | MongoDB · Mongoose 8           | Zustand + native `fetch`                      | TanStack Query 5 + `fetch`   |
| Realtime      | Socket.IO 4                    | `socket.io-client`                            | `socket.io-client`           |
| Auth          | JWT + refresh rotation, OTP    | AsyncStorage-backed token store               | JWT in localStorage          |
| Validation    | Zod                            | —                                             | —                            |
| Styling       | —                              | Custom theme (Sora + Manrope, orange accent)  | Tailwind CSS 3               |
| Realtime map  | —                              | Leaflet in WebView (no Google key)            | —                            |
| Observability | Pino · Sentry                  | Expo error reporting                          | Sentry (optional)            |

## 4. Repository layout

```text
.
├─ qikzo-server/            # Express + MongoDB + Socket.IO API
├─ Qikzo-app/               # Customer mobile app (Expo)
├─ Qikzo-rider/             # Rider mobile app (Expo)
├─ Qikzo-admin-dashboard/   # Admin web console (Vite + React)
├─ AUDIT.md                 # Cross-cutting security & code audit notes
├─ lovable.toml             # Lovable dev/build task config (dashboard preview)
└─ README.md                # ← you are here
```

## 5. Quick start (all apps)

**Prerequisites**: Node 18+, MongoDB 6+ (local or Atlas), Xcode / Android Studio for mobile.

```bash
# 1. Backend
cd qikzo-server
cp .env.example .env         # set MONGO_URI, JWT_SECRET, CORS_ORIGIN
npm install
npm run migrate
npm run seed                 # optional: reference data + demo users
npm run dev                  # http://localhost:4000

# 2. Admin dashboard (in a new terminal)
cd Qikzo-admin-dashboard
cp .env.example .env         # VITE_API_URL=http://localhost:4000/api/v1
npm install
npm run dev                  # http://localhost:5174

# 3. Customer app (new terminal)
cd Qikzo-app
npm install
EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000/api/v1 npm run dev

# 4. Rider app (new terminal)
cd Qikzo-rider
npm install
EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000/api/v1 npm run dev
```

> On physical devices use your machine's **LAN IP** (not `localhost`) for `EXPO_PUBLIC_API_URL`.
> In dev, OTPs default to **`123456`** (see `OTP_DEV_MODE` in server env).

## 6. Environment matrix

| App               | Key variables                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `qikzo-server`    | `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `OTP_DEV_MODE`, `OTP_FIXED_CODE`, `CORS_ORIGIN`, `PRICE_*`, `SENTRY_DSN` |
| `Qikzo-app`       | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL`, Firebase files (`google-services.json`, `GoogleService-Info.plist`) |
| `Qikzo-rider`     | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL`, Firebase files                                        |
| `Qikzo-admin-dashboard` | `VITE_API_URL`                                                                                   |

Full details live in each project's README.

## 7. End-to-end flows

### 7.1 Customer books a delivery

1. Customer signs in with `+91` OTP → tokens stored in AsyncStorage.
2. Picks pickup + drop on the map (`select-location.tsx`), applies a coupon.
3. `POST /bookings/quote` → live price + ETA.
4. `POST /bookings` → server writes `Booking`, broadcasts on `bookings:new` to eligible riders.
5. Client joins `booking:<id>` room; UI advances through `looking → assigned → arriving → picked_up → completed`.
6. On completion, customer rates trip (`POST /ratings`) and receives receipt.

### 7.2 Rider fulfils a job

1. Rider is KYC-approved and toggles **Online**.
2. Server emits `job_offer` to `rider:<id>` — `JobRequestCard` shows countdown.
3. Accept → `POST /trips/:id/accept` → joins `booking:<id>` room and streams location.
4. Pickup handshake via **OTP verify sheet** → `POST /trips/:id/pickup`.
5. Complete → `POST /trips/:id/complete` → earnings accrue, payout queues.

### 7.3 Admin manages the platform

1. Operator signs into the dashboard (`/login`).
2. Reviews **KYC** queue, approves/rejects with reason (writes `AuditLog`).
3. Monitors **Bookings**, cancels/refunds if needed.
4. Approves **Payouts**, manages **Coupons**, handles **Support** tickets, inspects **Audit** log.

## 8. Shared conventions

- **API responses**
  ```json
  { "success": true,  "data": …, "meta": { "requestId": "…" } }
  { "success": false, "code": "VALIDATION", "message": "…", "requestId": "…" }
  ```
- **Socket rooms**: `user:<id>`, `rider:<id>`, `booking:<id>`, `admin`.
- **Auth**: JWT access + refresh rotation; refresh reuse revokes the family.
- **Roles**: `customer`, `rider`, `admin` (+ ops sub-roles), enforced server-side only.
- **Pagination**: cursor-based; clients render with **infinite scroll**, never numbered pages.
- **Search**: debounced **400 ms** before any request.
- **File names**: page components are **PascalCase** to avoid case-sensitivity issues on Vercel/Linux.
- **Alerts**: never use system alerts — always bottom-sheet dialogs.

## 9. Design system

Uniform across all three clients:

- Horizontal padding **6**, border radius **0**, 1 px separators, **no vertical gaps** in lists.
- Buttons show a **spinner (not text)** while loading.
- Outlined inputs with small vertical padding.
- Palette: minimal **black / white** with an **orange** action colour.
- Typography: **Sora** (display) + **Manrope** (body).

## 10. Security posture

- OTP-only login for consumers/riders; bcrypt-hashed passwords for admins.
- JWT + rotating refresh tokens with reuse detection.
- `helmet`, `express-mongo-sanitize`, `hpp`, `xss`, and per-route rate limits on the server.
- Zod-validated payloads on every write route.
- Role guards (`requireAuth`, `requireAdmin`, `requireRider`, `requireRole`) applied at the router level.
- 2 MB JSON body cap; multipart uploads scoped and stored under `/uploads` with `Cross-Origin-Resource-Policy: cross-origin`.
- `AuditLog` collection records every privileged mutation with actor, target and diff.
- Maintenance-mode gate that bypasses only admin and health routes.

## 11. Deployment topology

| Component               | Recommended target                                   |
| ----------------------- | ---------------------------------------------------- |
| `qikzo-server`          | Vercel (serverless, `vercel.json` included), Fly, Render, Railway, ECS |
| `Qikzo-admin-dashboard` | Vercel / Netlify / S3 + CloudFront (static)          |
| `Qikzo-app`             | EAS Build → App Store / Play Store; OTA via EAS Update |
| `Qikzo-rider`           | EAS Build → App Store / Play Store; OTA via EAS Update |
| MongoDB                 | MongoDB Atlas (replica set required for transactions) |

Production checklist:

- [ ] `MONGO_URI` on a replica set, region-colocated with the API.
- [ ] `JWT_SECRET` ≥ 32 random bytes; rotated on incident.
- [ ] `CORS_ORIGIN` restricted to explicit client origins (no `*`).
- [ ] `OTP_DEV_MODE=false` and SMS provider wired.
- [ ] `SENTRY_DSN` set on server (and optionally admin).
- [ ] `npm run migrate` runs as a post-deploy hook.
- [ ] Firebase config committed for both mobile apps; APNs key uploaded to EAS.

## 12. Operational runbook

| Symptom                                | First check                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Clients get `503 MAINTENANCE`          | `Settings.maintenanceMode` in DB — toggle via admin dashboard              |
| Everyone gets `401` after a deploy     | `JWT_SECRET` changed — clients need to re-login                             |
| Sockets fail to connect                | CORS, JWT handshake, sticky sessions on the load balancer                   |
| Cold-start latency on serverless       | Colocate DB and function region; ensure Mongoose connection reuse           |
| Mobile app can't reach dev server      | Use LAN IP, not `localhost`, in `EXPO_PUBLIC_API_URL`                       |
| Vercel deploy 404s on a page           | Rename the page file to **PascalCase**                                      |
| No job offers reach a rider            | Rider must be `online` and KYC-approved; verify socket auth                 |
| Payout stuck in `pending`              | Admin must approve/mark-paid from **Payouts** page                          |

## 13. Roadmap ideas

- Wallet top-ups + Razorpay/UPI payments end-to-end.
- Multi-language (Hindi + regional) via i18n keys.
- Rider heatmaps and surge pricing in admin.
- Background location for riders on Android with foreground service.
- CI: shared type package generated from Zod validators, consumed by all clients.
- E2E tests via Playwright (dashboard) and Detox/Maestro (mobile).

## 14. Per-project READMEs

Each project ships its own deep-dive documentation:

- **Server** — [`qikzo-server/README.md`](./qikzo-server/README.md)
- **Customer app** — [`Qikzo-app/README.md`](./Qikzo-app/README.md)
- **Rider app** — [`Qikzo-rider/README.md`](./Qikzo-rider/README.md)
- **Admin dashboard** — [`Qikzo-admin-dashboard/README.md`](./Qikzo-admin-dashboard/README.md)

Additional context lives in [`AUDIT.md`](./AUDIT.md).

## 15. License

Proprietary © Qikzo. All rights reserved. Redistribution or use of any part of this codebase without written permission is prohibited.
