# Qikzo — Rider App

Cross-platform (iOS · Android) **rider / driver** application for the Qikzo on-demand delivery & ride booking platform. Built with **Expo Router**, **React Native**, a Zustand job state machine, and a Socket.IO channel to the shared [Qikzo API server](../qikzo-server/README.md).

> Expo SDK 54 · React Native 0.81 · React 19 · TypeScript · Expo Router 6 · Zustand · Socket.IO client

---

## Table of contents

1. [Overview](#1-overview)
2. [Feature set](#2-feature-set)
3. [Tech stack](#3-tech-stack)
4. [Project structure](#4-project-structure)
5. [Getting started](#5-getting-started)
6. [Environment configuration](#6-environment-configuration)
7. [Job lifecycle](#7-job-lifecycle)
8. [Realtime & location](#8-realtime--location)
9. [KYC & onboarding](#9-kyc--onboarding)
10. [Earnings & payouts](#10-earnings--payouts)
11. [Design system](#11-design-system)
12. [Push notifications](#12-push-notifications)
13. [Building & releasing](#13-building--releasing)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Overview

The rider app puts a driver online, receives job offers in real time, and guides them through pickup → drop-off → payment collection → rating. It shares the same auth model, design language and networking primitives as the customer app but runs an entirely different job-oriented UI and background location loop.

## 2. Feature set

- **+91 OTP auth** with token refresh.
- **Onboarding**: personal info, vehicle setup, document upload, KYC review status.
- **Availability toggle** (Online / Offline) with server sync.
- **Job offers** delivered over Socket.IO with countdown + accept/decline.
- **Stage stepper**: `assigned → arriving → arrived → picked_up → completed`.
- **OTP verification sheet** for pickup handshake.
- **Live location broadcasting** to the assigned booking room.
- **Earnings dashboard**: daily/weekly totals, trip breakdown, incentives.
- **Payout details**: bank account / UPI, payout history, status.
- **Support tickets** and **notifications**.

## 3. Tech stack

| Concern             | Library                                            |
| ------------------- | -------------------------------------------------- |
| Framework           | Expo SDK 54, Expo Router 6                         |
| UI runtime          | React 19, React Native 0.81                        |
| State               | Zustand (`jobStore`, `authStore`)                  |
| Networking          | Native `fetch` wrapper (`lib/api/`)                |
| Realtime            | `socket.io-client`                                 |
| Maps                | Leaflet inside `react-native-webview`              |
| Location            | `expo-location` (foreground; background where set) |
| Auth storage        | `@react-native-async-storage/async-storage`        |
| Notifications       | `expo-notifications` + Firebase                    |
| Typography          | Sora (display) + Manrope (body)                    |

## 4. Project structure

```text
Qikzo-rider/
├─ app/                     # Expo Router
│  ├─ (tabs)/               # index (home), activity, earnings, profile
│  ├─ login.tsx / otp.tsx
│  ├─ onboarding.tsx
│  ├─ vehicle-setup.tsx
│  ├─ documents.tsx         # KYC uploads
│  ├─ active-job.tsx        # Job lifecycle screen
│  ├─ payout-details.tsx
│  ├─ notifications.tsx
│  ├─ personal-info.tsx
│  ├─ help-support.tsx
│  ├─ about-us.tsx / privacy-policy.tsx / terms-conditions.tsx
│  ├─ splash.tsx / index.tsx / _layout.tsx
├─ components/
│  ├─ JobRequestCard.tsx    # Incoming offer with timer + actions
│  ├─ StageStepper.tsx      # Visual pipeline for the job
│  ├─ OtpVerifySheet.tsx    # Pickup handshake
│  ├─ BottomSheet.tsx, Button.tsx, Input.tsx, ScreenHeader.tsx, LeafletMap.tsx, …
├─ lib/
│  ├─ api/                  # client + endpoints (auth, riders, bookings, trips, earnings, payouts, documents, …)
│  ├─ authStore.ts
│  ├─ jobStore.ts           # Current offer + active job state machine
│  ├─ socket.ts             # Singleton Socket.IO client
│  ├─ push.ts               # Notification registration
│  ├─ theme.ts / iconMap.ts / useInitialLoad.ts / useSheet.ts / mockData.ts
├─ app.json / eas.json / google-services.json
```

## 5. Getting started

**Prerequisites**: Node 18+, Xcode / Android Studio, running Qikzo API server.

```bash
cd Qikzo-rider
npm install
npm run dev                # expo start
```

### Scripts

| Command             | Purpose                        |
| ------------------- | ------------------------------ |
| `npm run dev`       | `expo start`                   |
| `npm run android`   | `expo run:android`             |
| `npm run ios`       | `expo run:ios`                 |
| `npm run build`     | Web export                     |
| `npm run typecheck` | `tsc --noEmit`                 |
| `npm run lint`      | `expo lint`                    |

## 6. Environment configuration

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.10:4000
```

Use your LAN IP (not `localhost`) on physical devices. Provide `google-services.json` / `GoogleService-Info.plist` for push.

## 7. Job lifecycle

```text
 offline ──toggle──► online
                       │
                       ▼
                 [waiting]  ◄── socket: job_offer
                       │
                (accept | decline)
                       │
                       ▼
   assigned → arriving → arrived → picked_up → completed → rated
                                            │
                                            └── OTP verify at pickup
```

State lives in `lib/jobStore.ts`. Server events on `rider:<riderId>` and `booking:<bookingId>` drive transitions; user actions call the matching REST endpoints (`/trips/:id/*`).

## 8. Realtime & location

- Socket.IO joins `rider:<riderId>` at login and `booking:<bookingId>` on assignment.
- While a job is active the app publishes location fixes at a throttled cadence (see `expo-location` watch options) to the server, which fans out to the customer's `booking:<id>` room.
- The Leaflet WebView renders the route polyline and pickup/drop pins.

## 9. KYC & onboarding

- Riders complete personal info → vehicle setup → document upload (`documents.tsx`).
- Documents (RC, DL, insurance, PAN, selfie) are uploaded via `POST /uploads` and linked to the rider's KYC record.
- KYC status (`pending / approved / rejected`) gates the ability to go online.

## 10. Earnings & payouts

- `earnings` tab reads from `GET /riders/me/earnings` — daily/weekly aggregates and trip-level breakdown.
- `payout-details` manages bank/UPI destination and shows payout history from `GET /riders/me/payouts`.
- Payouts are dispatched by admins from the dashboard.

## 11. Design system

Same rules as the customer app: padding 6, radius 0, no alerts (bottom sheets only), 1 px separators, infinite scroll, debounced search 400 ms, spinner-only loading buttons, outlined inputs, black/white + orange, Sora + Manrope.

## 12. Push notifications

- `lib/push.ts` registers the Expo push token via `POST /devices`.
- Server pushes new job offers when the socket connection is unavailable (backgrounded app).

## 13. Building & releasing

```bash
eas build --profile preview   --platform android
eas build --profile production --platform ios
```

## 14. Troubleshooting

| Symptom                                    | Fix                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| No job offers arrive                       | Rider must be `online` and KYC-approved; check socket auth handshake   |
| Location updates stop                      | Foreground permission was revoked; re-request in `personal-info`       |
| OTP sheet won't confirm pickup             | Customer OTP mismatch — regenerate from server logs (dev mode)         |
| Earnings show 0                            | Ensure trips reached `completed`; cancelled trips don't accrue         |
| Payout stuck in `pending`                  | Admin must approve from dashboard → Payouts                            |

---

© Qikzo. All rights reserved.
