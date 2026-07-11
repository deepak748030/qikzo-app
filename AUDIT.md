# Qikzo — Production Rebuild Audit (Phase 0)

_Deliverable for Phase 0 of the approved rebuild plan._
_Scope: `Qikzo-app/` (customer), `Quikzo-rider/` (rider), `qikzo-server/` (API)._
_No code was changed in this phase — this is a discovery report only._

Working defaults locked in for the rest of the rebuild:

| Decision | Choice |
| --- | --- |
| Server language | Convert to **TypeScript** in Phase 1 |
| Redis / queues | Design behind an interface; **required in prod** (refresh-token store, rate limit, BullMQ, cache) |
| Payments | **Ledger-only** for now — provider (Razorpay/Stripe) integrated after core is done |
| File storage | Pluggable `StorageAdapter` — local disk in dev, **S3-compatible in prod** |
| Admin surface | **API routes only** (`role: 'admin'`) — dedicated dashboard app deferred |
| Push | Expo push tokens end-to-end |
| Mobile data layer | `axios` client + `@tanstack/react-query` + `socket.io-client` |

Override any of these in your next message and I'll adjust before Phase 1.

---

## 1. Mock data inventory

Everything in this section must be **deleted** by end of Phase 4. Files listed with the phase in which they get retired.

### 1.1 `Qikzo-app/lib/mockData.ts` (customer) — retired across Phases 4.2, 4.5, 4.6

| Export | Used by | Retires in |
| --- | --- | --- |
| `categories` | `app/(tabs)/index.tsx`, `app/(tabs)/activity.tsx`, `app/book-delivery.tsx`, `app/booking-details.tsx` | 4.2 Catalog |
| `savedPlaces` | `app/(tabs)/index.tsx`, `app/book-delivery.tsx` | 4.3 Profile/Places |
| `promoBanners` | `components/PromoBanners.tsx` | 4.2 Catalog |
| `seedBookings` | `lib/bookingStore.ts` (seeds the store on first load) | 4.5 Booking |
| `pickRider` | `lib/bookingStore.ts:52` (fake rider assignment) | 4.6 Dispatch |
| `estimateTrip` | `app/book-delivery.tsx:39` (client-side pricing) | 4.5 Booking (server already has `POST /bookings/estimate`) |
| `RIDERS` array + `Rider` type | Used by `pickRider` | 4.6 Dispatch |
| `Booking`, `BookingStatus` type | Reused by store + screens | Types move to `lib/api/types.ts` (Phase 3) |

### 1.2 `Quikzo-rider/lib/mockData.ts` — retired across Phases 4.1, 4.6, 4.7, 4.8

| Export | Used by | Retires in |
| --- | --- | --- |
| `myRider` | `lib/authStore.ts:2` (seeds rider identity into store) | 4.1 Auth |
| `stats` | `app/(tabs)/profile.tsx`, `app/(tabs)/activity.tsx`, `app/(tabs)/earnings.tsx` | 4.8 Wallet/Earnings |
| `weeklyEarnings`, `weekDays`, `nextPayout` | `app/(tabs)/earnings.tsx` | 4.8 Wallet/Earnings |
| `incomingJobs`, `nextIncoming()` cycler | `lib/jobStore.ts`, `app/(tabs)/index.tsx:38` (polls fake queue every 2.5s) | 4.6 Dispatch |
| `completedJobs` | `lib/jobStore.ts` seeds `useJobs.completed` | 4.7 Trip lifecycle |
| `documents` | `app/documents.tsx` | 4.11 KYC/Documents |
| `CATEGORY_META` | `components/JobRequestCard.tsx`, active-job screen, activity screen | 4.2 Catalog (moves to server-driven `vehicleTypes`/`categories`) |
| `JOB_STAGES` | `components/StageStepper.tsx`, `app/active-job.tsx` | Kept as a constant enum on server + shared to client via `/api/v1/settings` (constant, no mock) |

### 1.3 Screen-embedded mock arrays

| File | Symbol | Notes |
| --- | --- | --- |
| `Qikzo-app/app/notifications.tsx:20` | `SEED: N[]` | 6 hardcoded notifications, `useState(SEED)`, `markAllRead` mutates local only |
| `Quikzo-rider/app/notifications.tsx:12` | `SEED: N[]` | Same pattern |
| `Qikzo-app/app/help-support.tsx:6` | `FAQS = [...]` | Static content — **not a bug**, but move to `AppSettings.faqs` so it's editable server-side |
| `Qikzo-app/app/about-us.tsx`, `privacy-policy.tsx`, `terms-conditions.tsx` | inline strings | Same treatment — expose via `GET /api/v1/settings/legal` |
| `Quikzo-rider/app/about-us.tsx`, `privacy-policy.tsx`, `terms-conditions.tsx` | inline strings | Same |

### 1.4 Fake latency (`setTimeout` masquerading as async work)

All will be **replaced by real HTTP calls with react-query loading states**. The `useInitialLoad(600ms)` shim is fine to keep as a skeleton fallback while an idle query mounts, but it must not gate real data.

| File:line | What it fakes |
| --- | --- |
| `Qikzo-app/app/login.tsx:28` | OTP send |
| `Qikzo-app/app/otp.tsx:49` | OTP verify |
| `Qikzo-app/app/personal-info.tsx:32` | Save profile |
| `Qikzo-app/app/book-delivery.tsx:82` | Create booking |
| `Qikzo-app/app/booking-details.tsx:63,117,132` | Auto-advance status, cancel, delivered animation (some of these are legitimate timeline sim — must move to server events emitted over socket) |
| `Qikzo-app/app/select-location.tsx:71,129` | Geocode search + address confirm |
| `Quikzo-rider/app/login.tsx:27` | OTP send |
| `Quikzo-rider/app/otp.tsx:52` | OTP verify |
| `Quikzo-rider/app/personal-info.tsx:59` | Save profile |
| `Quikzo-rider/app/payout-details.tsx:42` | Save payout |
| `Quikzo-rider/app/vehicle-setup.tsx:68` | Save vehicle |
| `Quikzo-rider/app/(tabs)/index.tsx:38` | `setTimeout(nextIncoming, 2500)` — **worst offender**, replace with socket `job:offer` push |

### 1.5 Client-side randomness that should live on the server

| File:line | What |
| --- | --- |
| `Qikzo-app/lib/bookingStore.ts:59` | `newBookingId()` uses `Math.random` — server already mints `code` in `Booking` create; delete client version |
| `qikzo-server/src/controllers/bookingController.js:8` | `nextCode()` uses `Math.random` too — replace with a proper sequence (counter collection or `nanoid`) so codes never collide |

---

## 2. Client-side state stores — what stays vs what goes

### 2.1 `Qikzo-app/lib/authStore.ts`
- **Keep**: shape of the store (Zustand), `phone`, `name`, `location`, `onboarded` flags.
- **Change**: values come from `GET /api/v1/auth/me` after login; store is a thin cache mirroring the server. Add `accessToken`, `refreshToken`, `deviceId`, `hydrate()`, `rehydrateFromSecureStore()` using `expo-secure-store`. `signOut` calls `POST /api/v1/auth/logout` before clearing.

### 2.2 `Qikzo-app/lib/bookingStore.ts`
- **Delete**: `bookings: seedBookings`, `addBooking`, `updateStatus`, `assignRider`, `getById`, `newBookingId`.
- **Keep**: `draft` (in-progress form state — this is legitimately client-only).
- **Replace**: reads go through react-query (`useBookings()`, `useBooking(id)`), mutations through `useCreateBooking()`, `useCancelBooking()`. Live updates come from socket `booking:update` which invalidates the query.

### 2.3 `Qikzo-app/lib/serviceMode.ts`
- **Keep as-is** — purely UI toggle between ride/delivery, no server involvement.

### 2.4 `Quikzo-rider/lib/authStore.ts`
- Same treatment as customer authStore. Also delete `myRider` seeded defaults (`name`, `vehicle`, `vehicleNo` currently pre-filled from mock). `PersonalDetails`, `PayoutDetails`, `VehicleType` structures move to server `Rider` + `Vehicle` + `KYC` + `Payout` models.

### 2.5 `Quikzo-rider/lib/jobStore.ts`
- **Delete**: `completed: seedCompleted`, `nextIncoming()`, all mock seeding.
- **Keep**: `online` toggle (mirrors server), `active` (mirrors server-owned assigned job), `acceptJob`, `advanceStage`, `cancelActive` — but each becomes an API call + optimistic update. `active` gets pushed via socket `job:assigned`, not chosen locally.

---

## 3. Server audit — architectural findings

### 3.1 Structural

Present layout has controllers → models directly. There is no service or repository layer. Result:
- Business rules live inside HTTP handlers (`assignRider()` inside `bookingController`).
- No place to unit-test business logic without spinning up Express.
- Reused reads (find booking by id + user) get duplicated across cancel/updateStatus.

Fix in Phase 1: move all Mongo access into `repositories/<Entity>Repo.ts`, all business logic into `services/<Feature>Service.ts`, controllers become 5–10 line thin adapters.

### 3.2 Missing models (from your brief, not yet in `src/models/`)

Present: `User`, `Rider`, `Booking`, `Category`, `PromoBanner`, `SavedPlace`, `Otp`. (7)

Missing (24): `Vehicle`, `VehicleType`, `Trip`, `RideRequest`, `RideHistory`, `Wallet`, `WalletTransaction`, `Payment`, `Payout`, `Coupon`, `Promo`, `Notification`, `Device`, `RefreshToken`, `Address`, `LocationHistory`, `Review`, `SupportTicket`, `Chat`, `Message`, `EmergencyContact`, `Document`, `KYC`, `AppSettings`.

All created in Phase 2 with proper indexes:
- 2dsphere on `Rider.currentLocation`, `LocationHistory.point`, `Booking.pickup.location`, `Booking.drop.location`
- TTL on `Otp.expiresAt`, `RefreshToken.expiresAt`, `RideRequest.expiresAt`
- Compound unique on `Wallet(userId, kind)`, `Device(userId, token)`, `Review(bookingId, byUserId)`
- Compound query index on `Booking(user, status, createdAt desc)`, `WalletTransaction(walletId, createdAt desc)`
- Text index on `Category.name`, `Banner.title` (search)

### 3.3 Auth gaps

| Issue | Fix (Phase 1) |
| --- | --- |
| Single long-lived JWT (30d) — cannot revoke | Access token 15m + refresh token 30d, refresh stored hashed in `RefreshToken`, rotated on every refresh |
| No role in token | Add `role: 'customer' \| 'rider' \| 'admin'`, `requireRole()` middleware |
| Dev OTP `123456` leaked as `devCode` in response | Gate strictly behind `NODE_ENV !== 'production'` **and** an explicit `OTP_DEV_MODE` env; add SMS provider adapter (MSG91/Twilio) with a stub for local dev |
| No device tracking | `Device` collection stores Expo push token, platform, model, last-seen; created on login, revoked on logout |
| Same OTP endpoint for customer + rider | Add `?role=customer\|rider` (or split endpoints) — currently a rider phone that also exists as a customer would collide |
| `Otp.attempts` limit 5 but no throttle on OTP _requests_ per phone (only per-IP via express-rate-limit) | Add per-phone throttle: 3 requests / 15 min |

### 3.4 Booking flow — what the current code doesn't do

Your brief spells out: request → nearby riders → broadcast → accept/reject → assignment → arrival → started → completed → payment → wallet → notifications.

Present code:
- `assignRider()` picks `Rider.findOne({ online, available }).sort({ rating: -1 })` — a single global rider, no proximity, no offer window, no accept/reject flow. Rider is auto-assigned server-side with no rider consent.
- No `RideRequest` collection — the offer/expiry/rejection concept doesn't exist.
- Rider app has no server-facing "accept job" endpoint at all.
- `PATCH /bookings/:id/status` accepts any status from the client — customer can mark their own booking as "Delivered". **Security bug**, must be split into rider-side lifecycle endpoints (`/rider/rides/:id/arrived`, `/start`, `/complete`) with `requireRole('rider')`.
- No wallet ledger writes on completion. No payout. No settlement.

All of this is Phase 4.6 + 4.7 + 4.8.

### 3.5 Socket gaps

Present: single default namespace, `user:{id}` room, `booking:{id}` room, one event (`booking:update`).

Missing: rider namespace, `rider:{id}` room, events `job:offer`, `job:cancelled`, `job:assigned`, `location:update` (rider → server), `location:rider` (server → customer), `notification`, `wallet:credit`, `wallet:debit`, `chat:message`.

Fix in Phase 3 (socket layer redesign) with strict payload types and per-event zod validation.

### 3.6 Security cross-check

Present: helmet, cors, mongo-sanitize (need to verify), rate limit on OTP endpoints only, compression.

Missing:
- xss-clean / DOMPurify equivalent on any free-text fields (`notes`, `SupportTicket.body`, `Chat.message`).
- hpp (HTTP parameter pollution).
- Global rate limit + per-route buckets (bookings/create, wallet/topup, uploads).
- Request-id middleware + structured logs (pino) — currently `console.log`.
- CORS is `*` by default — must be an allowlist in production.
- Error handler leaks `err.stack` to clients when not in prod-mode check; consolidate into `errorHandler.ts` with error codes and safe messages.
- No body size limit on non-upload routes (Express default is 100kb but upload routes will need per-route override).
- No `Content-Security-Policy` header tuning for the eventual admin dashboard.

### 3.7 Pricing / business logic living in the wrong place

- `qikzo-server/src/utils/pricing.js` is fine as a pure fn, but hardcoded `PRICE_BASE`/`PRICE_PER_KM` env vars are per-server and cannot vary by vehicle type or city. Move to `VehicleType.pricing = { base, perKm, minFare, surge }` in DB, seeded once, admin-editable.
- Client-side `estimateTrip` in `Qikzo-app/lib/mockData.ts` duplicates the server formula with a **different algorithm** (deterministic hash vs geo distance). This produces different fares in the UI vs on the server — a real bug. Delete client fn, always call `POST /bookings/estimate` (debounced).

---

## 4. Migration order (Phase 4 — one per turn)

Each item = server endpoints + service + repo + validators + socket events (if any) + **both apps** switch over + mock symbols deleted + grep verification.

| # | Feature | Deletes |
| --- | --- | --- |
| 4.1 | Auth (access+refresh, `/me`, device register/revoke, logout) | `myRider` from rider `authStore`; hardcoded `name: 'Guest'` |
| 4.2 | Catalog (`categories`, `banners`, `vehicleTypes`, `appSettings`, `faqs`, `legal`) | `categories`, `promoBanners`, `CATEGORY_META`, hardcoded FAQ/legal strings |
| 4.3 | Profile + Saved places | `savedPlaces`, personal-info fake await |
| 4.4 | Notifications (list + push via Expo tokens + socket fanout) | `SEED` arrays in both notifications screens |
| 4.5 | Booking estimate / create / list / details / cancel | `seedBookings`, client `estimateTrip`, `newBookingId`, `addBooking`, timeline `setTimeout` progression |
| 4.6 | Dispatch: `RideRequest` collection, geo-nearby query, offer window, accept/reject sockets | `pickRider`, `incomingJobs`, `nextIncoming()`, `setTimeout` job polling |
| 4.7 | Trip lifecycle (arrived / start / complete) + live location + ETA | `advanceStage` client-only progression |
| 4.8 | Wallet + WalletTransaction ledger, earnings, payout requests | `stats`, `weeklyEarnings`, `nextPayout`, `completedJobs` |
| 4.9 | Reviews + ratings | (net-new, no mocks) |
| 4.10 | Support tickets + chat/messages | (net-new) |
| 4.11 | KYC + Documents + Vehicle photos | `documents` mock |
| 4.12 | Admin routes (users, riders, bookings, payouts, coupons, banners CRUD, settings) | (net-new, gated by `role: 'admin'`) |

After 4.12 the greps `rg "mockData"`, `rg "SEED"`, `rg "myRider"`, `rg "incomingJobs"`, `rg "seedBookings"` must all return empty across both mobile apps. That gate ends the migration.

---

## 5. Non-goals for this rebuild (explicit, so scope stays honest)

- No native module additions beyond what Expo Router / Expo Location / Expo Notifications / Expo Secure Store already provide.
- No web/admin frontend (API routes only per your defaults).
- No online payment provider integration inside this rebuild (ledger only). A follow-on turn wires Razorpay/Stripe after the ledger is solid.
- No i18n / RTL — English + INR only, as the current apps assume.
- No Detox / E2E on mobile. Jest + Supertest on server only.

---

## 6. Ready to proceed

**Next turn = Phase 1: server foundation refactor** (TypeScript conversion, layered directories, response envelope, request-id + pino logging, refresh-token auth, role middleware, versioned `/api/v1`, cors allowlist, per-route rate limiters, centralized error handler). No feature behavior changes yet — every existing endpoint keeps working identically to today, just reshaped.

If you want to change any of the working defaults at the top of this file, or reorder the Phase 4 migration list, tell me before I start Phase 1.

---

## Phase 1 — Server foundation refactor (COMPLETED)

Server converted to TypeScript with layered architecture. No feature/endpoint behavior changes — mobile apps keep working against `/api/*` while `/api/v1/*` is now the canonical path.

### Toolchain
- Added `typescript`, `tsx`, `pino`, `pino-http`, `zod`, `uuid`, `hpp`, `xss`, `@types/*`.
- `tsconfig.json` strict mode, output to `dist/`.
- Scripts: `dev` (tsx watch), `build` (tsc), `start` (node index.js → dist), `typecheck`, `seed`.
- `index.js` prefers compiled `dist/` and falls back to `tsx/cjs` (keeps Vercel entry working).

### New layered layout (`qikzo-server/src/`)
```
config/       env (zod-validated), db
lib/          logger (pino), errors (AppError + codes), http (envelope), tokens (access+refresh)
middleware/   requestId, requireAuth, requireRole, validate (zod), errorHandler, notFound, asyncHandler, rateLimiters
models/       User (+ role), Rider, Otp, Booking, Category, PromoBanner, SavedPlace, Settings, RefreshToken
services/     authService, bookingService, catalogService, placeService, userService, riderService
controllers/  thin adapters — only parse req + call service + envelope
validators/   zod schemas per route group
routes/       versioned; per-route rate limiters where meaningful
sockets/      auth via access token; rider room joined for role=rider
utils/        distance, pricing, otp, jwt (compat shim)
seed/         seed.ts (adds Settings singleton)
```

### Auth upgrade
- Access token + refresh token (rotated on every `/auth/refresh`, hashed at rest in `RefreshToken` collection with TTL cleanup).
- Roles baked into access JWT (`customer` | `rider` | `admin`) — `requireRole()` middleware ready for Phase 4.
- New endpoints: `POST /auth/refresh`, `POST /auth/logout` (single device or `all: true`).
- Response now returns `{ token, accessToken, refreshToken, user }`. `token` kept as alias so existing mobile clients don't break; access-token TTL still defaults to the old `JWT_EXPIRES_IN` (30d) — Phase 4.1 will drop it to 15m when mobile refactors to use refresh.

### Cross-cutting
- Response envelope: `{ success, message, requestId, code?, details?, ...data }`. Backwards-compatible with the old flat-spread shape.
- `requestId` middleware + `pino-http` structured logs (pretty in dev, JSON in prod).
- Central `errorHandler` maps `AppError` → status + code + message; stack only in dev.
- CORS allowlist parsed from `CORS_ORIGIN`; `helmet`, `compression`, `express-mongo-sanitize`, `hpp` all wired.
- Rate limiters: global `/api` (300/min), auth (`otpLimiter` 5/min, `authLimiter` 30/min), booking-create (30/min).
- Both `/api/*` (legacy) and `/api/v1/*` (canonical) mount the same router — safe incremental migration.
- Fixed silent bug: `Settings` model was referenced by the maintenance-mode gate but did not exist. Added as a singleton document.
- Health: `GET /health` (uptime), `GET /ready` (DB reachability).

### Verification
- `npm run typecheck` clean.
- `npm run build` clean.

### Behaviours preserved (mobile apps unaffected)
- OTP request/verify flow, dev code echo when `OTP_DEV_MODE=true`.
- All existing route paths still work under `/api/*` (booking, catalog, places, riders, users).
- Booking auto-assign stub kept (moves to Phase 4.6 with real dispatch).
- Socket `booking:update` fanout to `user:{id}` and `booking:{id}` rooms unchanged.

### Ready for next
Phase 2 (complete data model — 24 missing collections) or Phase 4.1 (mobile auth cutover). Say which.

---

## Phase 2 — Data model expansion (COMPLETED)

24 new/updated Mongoose models, versioned migrations, and index sync — everything needed to power Phase 4 features. No API changes yet; models are additive.

### New models (25 files)
`Vehicle`, `VehicleType`, `Trip`, `RideRequest`, `RideHistory`, `Wallet`, `WalletTransaction`, `Payment`, `Payout`, `Coupon`, `CouponRedemption`, `Promo`, `Notification`, `Device`, `Address`, `LocationHistory`, `Review`, `SupportTicket`, `Chat`, `Message`, `EmergencyContact`, `Document`, `KYC`, `AppSettings`, `Migration` (migration-audit).

### Updated models
- `User` — added `role` (`customer` | `rider` | `admin`).
- `Rider` — added `user` link, `currentLocation` GeoJSON, `kycStatus`; `2dsphere` on `currentLocation`.
- `Booking` — added `vehicleTypeSlug`, `couponCode`, `discount`; pickup/drop now carry GeoJSON `location`; `2dsphere` on both.
- `Category`, `PromoBanner` — text indexes for search.

### Indexes (all declared, `syncIndexes()` runs on boot in dev)
- `2dsphere`: `Rider.currentLocation`, `Booking.pickup.location`, `Booking.drop.location`, `Address.location`, `LocationHistory.point`.
- TTL: `Otp.expiresAt`, `RefreshToken.expiresAt`, `RideRequest.expiresAt`.
- Compound unique: `Wallet(owner, kind)`, `Device(user, token)`, `Review(booking, byUserId)`, `RideRequest(booking, rider)`, `Vehicle.plateNo`, `Trip.booking`, `RideHistory.booking`, `EmergencyContact(user, phone)`, `CouponRedemption.booking`.
- Partial unique: `WalletTransaction(wallet, refCode)` when `refCode` present (idempotency), `Payment.providerPaymentId` when present.
- Query indexes: `Booking(user, status, createdAt desc)`, `WalletTransaction(wallet, createdAt desc)`, `Notification(user, createdAt desc)`, plus role/status compounds.
- Text search: `Category(name, hint)`, `PromoBanner(title, subtitle)`.

### Migrations runner (`src/db/`)
- `migrator.ts` — `runMigrations()` (idempotent, one-shot per name, records duration in `migrations` collection) + `syncIndexes()`.
- `migrations/index.ts` — ordered list; append-only.
- `runMigrations.ts` — CLI entry (`npm run migrate`).
- `models/Migration.ts` — audit record.

### Migrations shipped
1. `001_seed_vehicle_types` — 4 vehicle types (bike, scooty, auto, mini_truck) with current env-var pricing as defaults, replacing hardcoded pricing.
2. `002_seed_app_settings` — customer + rider `AppSettings` docs with baseline FAQs and legal copy, so the mobile hardcoded strings from AUDIT §1.3 can be retired in Phase 4.2.
3. `003_backfill_booking_geojson` — populates `pickup.location` / `drop.location` for existing bookings from legacy lat/lng.
4. `004_backfill_user_role` — sets `role = 'customer'` on every pre-existing user.

### Boot behaviour
- `server.ts` imports `./models` (side-effect: registers every schema), then in dev — or when `RUN_MIGRATIONS_ON_BOOT=true` in prod — runs `syncIndexes()` + `runMigrations(migrations)` before listening.
- Vercel serverless entry (`index.js` → `src/app`) does NOT run migrations on boot — call `npm run migrate` from CI/CD after deploy.

### New scripts
- `npm run migrate` — apply pending migrations against `MONGO_URI`.

### Verification
- `npm run typecheck` clean.
- `npm run build` clean (all model files emit to `dist/src/models/`).

### Ready for next
Phase 3 (mobile `lib/api/` layer + socket client) or Phase 4.1 (mobile auth cutover — first feature to consume the new refresh-token + role JWT).
