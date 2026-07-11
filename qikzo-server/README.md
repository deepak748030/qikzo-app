# Qikzo API Server

Enterprise-grade backend for the **Qikzo** on-demand delivery & ride booking platform.
Powers three clients — the **Customer app** (`Qikzo-app`), the **Rider app** (`Qikzo-rider`) and the **Admin dashboard** (`Qikzo-admin-dashboard`) — over a single versioned REST + WebSocket surface.

> Node.js 18+ · TypeScript · Express 4 · MongoDB (Mongoose 8) · Socket.IO 4 · JWT · Zod · Pino · Sentry

---

## Table of contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Tech stack](#3-tech-stack)
4. [Project structure](#4-project-structure)
5. [Getting started](#5-getting-started)
6. [Environment variables](#6-environment-variables)
7. [Database & migrations](#7-database--migrations)
8. [API surface](#8-api-surface)
9. [Realtime (Socket.IO)](#9-realtime-socketio)
10. [Authentication & authorization](#10-authentication--authorization)
11. [Security hardening](#11-security-hardening)
12. [Observability](#12-observability)
13. [Testing](#13-testing)
14. [Deployment](#14-deployment)
15. [Operational runbook](#15-operational-runbook)
16. [Contributing](#16-contributing)

---

## 1. Overview

Qikzo is a multi-role marketplace: **customers** book deliveries/rides, **riders** accept and fulfil them, and **admins** operate the platform (KYC, payouts, coupons, support, audit). This server is the single source of truth for:

- Identity, sessions and role-based access (customer / rider / admin).
- Catalog: vehicle types, service areas, promo banners, app settings.
- Booking lifecycle: quote → create → dispatch → assign → in-progress → completed / cancelled.
- Rider operations: onboarding, KYC, documents, availability, earnings, payouts.
- Financials: pricing engine, coupons, wallet, payments, payouts.
- Support tickets, ratings/reviews, notifications (in-app + push), audit trail.

## 2. Architecture

```text
                ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐
                │ Customer app │   │  Rider app   │   │  Admin dashboard   │
                │ (Expo/RN)    │   │ (Expo/RN)    │   │  (React + Vite)    │
                └──────┬───────┘   └──────┬───────┘   └──────────┬─────────┘
                       │  REST /api/v1     │  REST /api/v1        │
                       │  Socket.IO        │  Socket.IO           │
                       └──────────┬────────┴──────────┬───────────┘
                                  ▼                   ▼
                        ┌────────────────────────────────────┐
                        │        Express app (this repo)     │
                        │  requestId · helmet · CORS · HPP   │
                        │  mongo-sanitize · rate limits      │
                        │  Zod validators · role guards      │
                        └───────────────┬────────────────────┘
                                        ▼
                        ┌────────────────────────────────────┐
                        │   Services (business logic)        │
                        │  auth / booking / rider / trip     │
                        │  pricing / coupons / payout / ...  │
                        └───────────────┬────────────────────┘
                                        ▼
                        ┌────────────────────────────────────┐
                        │  MongoDB (Mongoose models)         │
                        │  + Socket.IO room broadcaster      │
                        │  + Sentry · Pino · Audit log       │
                        └────────────────────────────────────┘
```

Design principles:

- **Layered**: `routes → controllers → services → models`. Controllers stay thin; business rules live in services; models own persistence.
- **Versioned API**: same router mounted at `/api` (legacy) and `/api/v1` (canonical) for zero-downtime client migration.
- **Serverless-safe**: `connectDB()` runs lazily per request and caches the Mongoose connection, so cold starts on Vercel / Lambda stay fast.
- **Fail closed**: every write route is guarded by `requireAuth` + a role middleware (`requireAdmin` / `requireRider` / `requireRole`).
- **Deterministic errors**: single `errorHandler` emits `{ success, code, message, requestId }` for every failure.

## 3. Tech stack

| Concern            | Library                                                 |
| ------------------ | ------------------------------------------------------- |
| HTTP framework     | Express 4                                               |
| Language / runtime | TypeScript 5, Node 18+                                  |
| Database / ODM     | MongoDB, Mongoose 8                                     |
| Realtime           | Socket.IO 4                                             |
| Auth               | JWT (`jsonwebtoken`), bcryptjs, refresh-token rotation  |
| Validation         | Zod                                                     |
| Security           | helmet, hpp, express-mongo-sanitize, xss, rate-limit    |
| Uploads            | multer (disk / `/tmp` in serverless)                    |
| Logging            | pino + pino-http (pretty in dev, JSON in prod)          |
| Errors / tracing   | Sentry (`@sentry/node`)                                 |
| Dev tooling        | tsx (watch), nodemon, typescript                        |

## 4. Project structure

```text
qikzo-server/
├─ src/
│  ├─ app.ts                  # Express wiring (middleware, routes, error handler)
│  ├─ server.ts               # HTTP + Socket.IO bootstrap
│  ├─ config/
│  │  ├─ env.ts               # Zod-validated env
│  │  └─ db.ts                # Cached Mongoose connection
│  ├─ routes/                 # HTTP routers, one file per resource
│  ├─ controllers/            # Request/response glue
│  ├─ services/               # Business logic (pure, testable)
│  ├─ models/                 # Mongoose schemas (35+ collections)
│  ├─ middleware/             # auth, roles, rate limit, upload, validate
│  ├─ validators/             # Zod schemas per resource
│  ├─ sockets/                # Socket.IO namespaces & room logic
│  ├─ db/migrations/          # Ordered, idempotent migrations
│  ├─ lib/                    # logger, tokens, http, errors, sentry
│  ├─ utils/                  # jwt, otp, pricing, distance
│  └─ seed/seed.ts            # Idempotent dev seed
├─ index.js                   # Prod entrypoint (dist/… loader)
├─ vercel.json                # Serverless deploy config
└─ .env.example
```

## 5. Getting started

**Prerequisites**: Node 18+, MongoDB 6+ (local or Atlas), Bun **or** npm.

```bash
# 1. Install
cd qikzo-server
npm install                    # or: bun install

# 2. Configure
cp .env.example .env
#   → set MONGO_URI, JWT_SECRET, CORS_ORIGIN at minimum

# 3. Migrate + seed
npm run migrate
npm run seed                   # optional: vehicle types, settings, demo users

# 4. Run
npm run dev                    # tsx watch — http://localhost:4000
```

Verify: `curl http://localhost:4000/health` → `{ "ok": true, "uptime": … }`.

### Scripts

| Command             | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Watch mode with tsx                         |
| `npm run build`     | `tsc` → `dist/`                             |
| `npm start`         | Run compiled build (`node index.js`)        |
| `npm run typecheck` | TS project check, no emit                   |
| `npm run migrate`   | Apply pending migrations                    |
| `npm run seed`      | Seed reference data (idempotent)            |

## 6. Environment variables

All env is parsed & validated at boot by `src/config/env.ts`. Missing/invalid values crash on startup — never silently.

| Variable            | Required | Default                       | Notes                                                    |
| ------------------- | :------: | ----------------------------- | -------------------------------------------------------- |
| `PORT`              |          | `4000`                        | HTTP port                                                |
| `NODE_ENV`          |          | `development`                 | `development` \| `production` \| `test`                  |
| `MONGO_URI`         |    ✓     | —                             | Full connection string (Atlas or self-hosted)            |
| `JWT_SECRET`        |    ✓     | —                             | ≥ 32 chars in prod                                       |
| `JWT_EXPIRES_IN`    |          | `30d`                         | Access-token TTL                                         |
| `OTP_DEV_MODE`      |          | `true` (dev), `false` (prod)  | When `true`, accepts `OTP_FIXED_CODE`, no SMS sent       |
| `OTP_FIXED_CODE`    |          | `123456`                      | Dev-only OTP                                             |
| `OTP_TTL_SECONDS`   |          | `300`                         | OTP validity window                                      |
| `CORS_ORIGIN`       |          | `*`                           | Comma-separated origins, or `*`                          |
| `PRICE_BASE`        |          | `25`                          | INR                                                      |
| `PRICE_PER_KM`      |          | `8`                           | INR                                                      |
| `PRICE_MIN`         |          | `40`                          | INR floor                                                |
| `SENTRY_DSN`        |          | —                             | Enables Sentry when set                                  |
| `LOG_LEVEL`         |          | `info`                        | pino level                                               |

## 7. Database & migrations

**Models** (`src/models/`) cover every domain object:

`User`, `Rider`, `Vehicle`, `VehicleType`, `Address`, `SavedPlace`, `Booking`, `RideRequest`, `Trip`, `RideHistory`, `LocationHistory`, `Coupon`, `CouponRedemption`, `Promo`, `PromoBanner`, `Payment`, `Payout`, `Wallet`, `WalletTransaction`, `Rating`, `Review`, `SupportTicket`, `Chat`, `Message`, `Notification`, `Device`, `KYC`, `Document`, `EmergencyContact`, `Otp`, `RefreshToken`, `Settings`, `AppSettings`, `Category`, `AuditLog`, `Migration`.

**Migrations** (`src/db/migrations/`) are ordered, tracked in the `migrations` collection, and idempotent. Add new files as `00N_description.ts` and export `up(db)`.

```bash
npm run migrate     # applies pending migrations only
```

## 8. API surface

Base URL: `http://<host>/api/v1` (or legacy `/api`).

| Prefix               | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `/auth`              | OTP request/verify, refresh, logout                    |
| `/users`             | Profile, addresses, saved places, wallet               |
| `/`                  | Catalog: vehicle types, settings, banners, categories  |
| `/places`            | Geocoding, autocomplete, ETA                           |
| `/bookings`          | Quote, create, list, cancel, track                     |
| `/riders`            | Rider profile, availability, earnings, documents       |
| `/trips`             | Trip lifecycle events, chat, location updates          |
| `/notifications`     | List, mark-read, preferences                           |
| `/devices`           | Push token registration                                |
| `/ratings`           | Post-trip ratings & reviews                            |
| `/coupons`           | Validate, apply, list                                  |
| `/uploads`           | Signed multipart uploads (KYC, avatars, docs)          |
| `/support`           | Ticket create/list/reply, attachments                  |
| `/admin`             | Users, KYC review, payouts, coupons, audit, settings   |
| `/admin-bootstrap`   | One-shot admin bootstrap for fresh installs            |

Every response follows:

```json
{ "success": true,  "data": …, "meta": { "requestId": "…" } }
{ "success": false, "code": "VALIDATION", "message": "…", "requestId": "…" }
```

## 9. Realtime (Socket.IO)

Socket.IO is attached to the same HTTP server. Namespaces & rooms:

- `user:<userId>` — private inbox for a customer.
- `rider:<riderId>` — job offers, cancellations.
- `booking:<bookingId>` — everyone tracking one booking (customer, rider, admin).
- `admin` — ops room (KYC, payouts, alerts).

Auth handshake uses the same JWT (`auth: { token }`). Rejected sockets get `connect_error`.

## 10. Authentication & authorization

- **OTP-first login** (Indian +91 numbers). Access + refresh tokens issued on verify.
- **Refresh rotation** (`RefreshToken` model) — reuse detection revokes the family.
- **Role guards**: `requireAuth`, `requireAdmin`, `requireRider`, `requireRole('admin','ops')`.
- **Password auth** is bcrypt-hashed and used only for admin dashboard sign-in.

## 11. Security hardening

- `helmet` with cross-origin resource policy for `/uploads`.
- `express-mongo-sanitize` strips `$` / `.` operators from payloads.
- `hpp` collapses duplicated query params.
- `xss` for user-generated strings in support/chat.
- Global + route-scoped rate limiters (`src/middleware/rateLimiters.ts`).
- 2 MB JSON/urlencoded cap.
- Maintenance-mode gate (`Settings.maintenanceMode`) that bypasses admin & health only.

## 12. Observability

- **Logging** — `pino` structured JSON, `pino-http` per-request with `requestId`.
- **Tracing / errors** — Sentry initialised in `src/lib/sentry.ts` when `SENTRY_DSN` is set.
- **Health** — `GET /health` (liveness), `GET /ready` (readiness + DB ping).
- **Audit** — write-side services emit `AuditLog` entries; admin dashboard reads them.

## 13. Testing

Add tests under `src/**/__tests__/` and run with your preferred runner (Vitest recommended). Because services are pure, unit-test them against an in-memory Mongo (`mongodb-memory-server`).

## 14. Deployment

The repo ships with `vercel.json` for serverless deploy. Any Node 18 host works (Fly, Render, Railway, ECS).

Checklist:

- [ ] `MONGO_URI` points to a replica set (required for transactions).
- [ ] `JWT_SECRET` ≥ 32 random bytes.
- [ ] `CORS_ORIGIN` set to explicit client origins (no `*`).
- [ ] `OTP_DEV_MODE=false` and SMS provider wired.
- [ ] `SENTRY_DSN` set.
- [ ] `npm run migrate` runs as a post-deploy hook.

## 15. Operational runbook

| Symptom                              | First check                                                     |
| ------------------------------------ | --------------------------------------------------------------- |
| Clients get `503 MAINTENANCE`        | `Settings.maintenanceMode` in DB — unset via admin dashboard    |
| `401` after redeploy                 | `JWT_SECRET` changed — clients must re-login                    |
| Sockets fail to connect              | CORS origin, JWT handshake, sticky sessions on the LB           |
| Cold-start latency on serverless     | DB region vs function region; enable Mongoose connection reuse  |
| Rate-limit false positives           | `trust proxy` set (it is), verify `X-Forwarded-For` upstream    |

## 16. Contributing

1. Branch from `main`, keep PRs small.
2. `npm run typecheck` must pass.
3. New routes require: validator (Zod), controller, service, and role guard.
4. New collections require a migration + index definition on the model.
5. User-facing strings go through i18n keys, never hard-coded.

---

© Qikzo. All rights reserved.
