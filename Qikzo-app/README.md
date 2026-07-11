# Qikzo — Customer App

Cross-platform (iOS · Android · Web) **customer** application for the Qikzo on-demand delivery & ride booking platform. Built with **Expo Router**, **React Native** and a Zustand-based state layer that talks to the shared [Qikzo API server](../qikzo-server/README.md).

> Expo SDK 54 · React Native 0.81 · React 19 · TypeScript · Expo Router 6 · Zustand · Socket.IO client · Leaflet map (WebView)

---

## Table of contents

1. [Overview](#1-overview)
2. [Feature set](#2-feature-set)
3. [Tech stack](#3-tech-stack)
4. [Project structure](#4-project-structure)
5. [Getting started](#5-getting-started)
6. [Environment configuration](#6-environment-configuration)
7. [Architecture](#7-architecture)
8. [API layer](#8-api-layer)
9. [Realtime & maps](#9-realtime--maps)
10. [Design system](#10-design-system)
11. [Push notifications](#11-push-notifications)
12. [Building & releasing](#12-building--releasing)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

The customer app lets end users:

- Sign up / sign in with **+91 phone + OTP**.
- Pick a service (delivery / ride), set pickup + drop-off on the map, apply coupons, and confirm.
- Watch the booking flow in real time — quote → looking-for-rider → assigned → picked-up → completed.
- Track the rider live, chat, cancel, and rate the trip.
- Manage profile, saved places, notifications, wallet, and support tickets.

## 2. Feature set

- **OTP auth** (India, +91) with token refresh and secure device-bound storage.
- **Booking flow** with live pricing, coupon validation, ETA, and confirmation sheet.
- **Realtime tracking** via Socket.IO rooms (`booking:<id>`, `user:<id>`).
- **Leaflet-in-WebView** map (no Google key required) with custom markers.
- **Push notifications** through Expo Notifications + FCM/APNs.
- **Bottom-sheet UX** everywhere — never system alerts.
- **Offline-first UI states**: skeletons, retry banners, cached last-known locations.
- **Zero-radius, minimal black/white + orange** design language.

## 3. Tech stack

| Concern             | Library                                            |
| ------------------- | -------------------------------------------------- |
| Framework           | Expo SDK 54, Expo Router 6                         |
| UI runtime          | React 19, React Native 0.81                        |
| State               | Zustand                                            |
| Networking          | Native `fetch` wrapper (`lib/api/`)                |
| Realtime            | `socket.io-client`                                 |
| Maps                | Leaflet inside `react-native-webview`              |
| Auth storage        | `@react-native-async-storage/async-storage`        |
| Notifications       | `expo-notifications` + Firebase                    |
| Media               | `expo-image-picker`, `expo-camera`, `expo-av`      |
| Typography          | Sora (display) + Manrope (body) via Google Fonts   |
| Icons               | `lucide-react-native`, `@expo/vector-icons`        |

## 4. Project structure

```text
Qikzo-app/
├─ app/                     # Expo Router — file-based routes
│  ├─ (tabs)/               # Bottom-tab shell (index, activity, profile)
│  ├─ login.tsx             # +91 phone entry
│  ├─ otp.tsx               # OTP verification
│  ├─ onboarding.tsx
│  ├─ book-delivery.tsx     # Booking flow
│  ├─ booking-details.tsx
│  ├─ select-location.tsx   # Map picker
│  ├─ notifications.tsx
│  ├─ personal-info.tsx
│  ├─ help-support.tsx
│  ├─ about-us.tsx
│  ├─ privacy-policy.tsx
│  ├─ terms-conditions.tsx
│  ├─ splash.tsx / index.tsx / _layout.tsx
├─ components/              # Reusable UI (Button, Input, BottomSheet, LeafletMap, …)
├─ lib/
│  ├─ api/                  # HTTP client + endpoint modules
│  │  ├─ client.ts          # fetch wrapper (auth, retry, error normalisation)
│  │  ├─ config.ts          # BASE_URL, timeouts
│  │  ├─ tokenStore.ts      # AsyncStorage-backed token store
│  │  ├─ errors.ts          # Typed error classes
│  │  ├─ endpoints/         # auth, bookings, trips, catalog, coupons, …
│  │  └─ index.ts
│  ├─ authStore.ts          # Zustand — session & user
│  ├─ bookingStore.ts       # Zustand — current booking, ETA, stage
│  ├─ serviceMode.ts        # delivery vs ride selector
│  ├─ socket.ts             # Singleton Socket.IO client
│  ├─ push.ts               # Notification registration
│  ├─ theme.ts              # Colors, spacing, typography tokens
│  ├─ iconMap.ts            # Lucide icon registry
│  └─ useInitialLoad.ts     # Fonts + session bootstrap
├─ app.json                 # Expo config
├─ eas.json                 # EAS build profiles
└─ google-services.json     # Firebase (Android)
```

## 5. Getting started

**Prerequisites**: Node 18+, Bun or npm, Xcode (iOS) / Android Studio (Android), a running [Qikzo API server](../qikzo-server/README.md).

```bash
cd Qikzo-app
npm install
# point EXPO_PUBLIC_API_URL at your local server (see below)
npm run dev            # expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), `w` (web) or scan the QR with Expo Go.

### Scripts

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | `expo start` (Metro + dev menu)            |
| `npm run android`   | `expo run:android` (native build)          |
| `npm run ios`       | `expo run:ios`                             |
| `npm run build`     | `expo export --platform web`               |
| `npm run typecheck` | `tsc --noEmit`                             |
| `npm run lint`      | `expo lint`                                |

## 6. Environment configuration

Expo reads `EXPO_PUBLIC_*` variables from your shell / `.env`. At minimum:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.10:4000
```

Use your machine's LAN IP (not `localhost`) when running on a physical device.

Firebase for push: place `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) at repo root and update `app.json` accordingly.

## 7. Architecture

```text
 UI (Expo Router screens)
   │
   ▼
 Zustand stores (authStore, bookingStore, …)   ◄── Socket.IO events
   │
   ▼
 lib/api (typed client + endpoints)  ─────────►  Qikzo API server (REST)
```

- **Screens are dumb**: they read from stores and dispatch actions.
- **Stores own async**: they call `lib/api` and update state; components subscribe with selectors.
- **The socket layer** feeds the same stores, so UI reacts uniformly to REST responses and push updates.

## 8. API layer

`lib/api/client.ts` wraps `fetch` with:

- Automatic `Authorization: Bearer <token>` injection.
- 401 → refresh-token flow → single retry.
- Timeout + `AbortController`.
- Typed error normalisation (`ApiError`, `NetworkError`, `ValidationError`).

Endpoint modules (`lib/api/endpoints/*.ts`) return typed data and never leak `Response` objects.

## 9. Realtime & maps

- `lib/socket.ts` — singleton Socket.IO client, JWT handshake, auto-reconnect.
- On booking creation the app joins `booking:<id>` and updates the map + stage overlay from events.
- `components/LeafletMap.tsx` renders a WebView that boots Leaflet with a minimal tile set and a JS bridge for markers / route polylines.

## 10. Design system

Non-negotiable rules (see project memory):

- Horizontal padding **always 6**.
- Border radius **0** everywhere.
- **No system alerts** — use `components/BottomSheet.tsx`.
- `FlatList` separators: 1 px line, **no vertical gaps**.
- **Infinite scroll**, never pagination buttons.
- Debounced search **400 ms**.
- Buttons show **spinner, not text** while loading.
- Outlined inputs, small vertical padding.
- Colors: minimal black/white + **orange** accent.
- Fonts: **Sora** (display), **Manrope** (body).

## 11. Push notifications

- `lib/push.ts` requests permission, obtains an Expo push token, and registers it via `POST /devices`.
- Server sends via FCM (Android) and APNs (iOS) using stored device tokens.
- Foreground notifications are surfaced inside a bottom-sheet toast.

## 12. Building & releasing

```bash
# One-off native builds via EAS
eas build --profile preview  --platform android
eas build --profile production --platform ios
```

Profiles are declared in `eas.json`. Update `app.json` `version` / `runtimeVersion` for each release. OTA updates ship via EAS Update.

## 13. Troubleshooting

| Symptom                                          | Fix                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `Network request failed` on device               | Use LAN IP in `EXPO_PUBLIC_API_URL`, not `localhost`                  |
| OTP never arrives in dev                         | Server `OTP_DEV_MODE=true` → use `123456`                             |
| Map is blank                                     | WebView blocked; check `expo-build-properties` for cleartext HTTP     |
| Push token not registered                        | Grant notification permission; ensure Firebase files are in place     |
| Fonts flash system font on cold start            | `useInitialLoad` gates render; keep splash until fonts resolve        |

---

© Qikzo. All rights reserved.
