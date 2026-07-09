# Qikzo API

Lightning-fast Node/Express + MongoDB + Socket.io backend for the Qikzo on-demand delivery/ride app.

## Stack
- **Node 18+**, Express 4, Mongoose 8
- **JWT** auth (Bearer tokens)
- **Socket.io** live booking updates (auth via JWT handshake)
- Helmet, compression, mongo-sanitize, rate limits — production hardened
- Cached Mongo connection for fast serverless cold starts (Vercel-ready)

## Quick start
```bash
cd qikzo-server
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET
npm install
npm run seed               # populate categories / banners / riders
npm run dev                # http://localhost:4000
```

## Environment
See `.env.example`. Dev-mode OTP defaults to `123456` (no SMS needed). Flip `OTP_DEV_MODE=false` and wire an SMS provider inside `controllers/authController.js` (comment marks the spot).

## REST endpoints

| Method | Path                             | Auth | Description                              |
| ------ | -------------------------------- | ---- | ---------------------------------------- |
| GET    | `/health`                        | –    | Liveness                                 |
| POST   | `/api/auth/request-otp`          | –    | `{ phone }` → sends OTP                  |
| POST   | `/api/auth/verify-otp`           | –    | `{ phone, code }` → `{ token, user }`    |
| GET    | `/api/auth/me`                   | ✅   | Current user                             |
| PATCH  | `/api/users/me`                  | ✅   | Update name/email/location/onboarded     |
| DELETE | `/api/users/me`                  | ✅   | Delete account                           |
| GET    | `/api/categories`                | –    | Delivery categories                      |
| GET    | `/api/banners`                   | –    | Promo banners                            |
| GET    | `/api/places`                    | ✅   | User's saved places                      |
| POST   | `/api/places`                    | ✅   | Add a saved place                        |
| DELETE | `/api/places/:id`                | ✅   | Remove a saved place                     |
| POST   | `/api/bookings/estimate`         | ✅   | Fare/ETA/distance estimate               |
| POST   | `/api/bookings`                  | ✅   | Create a booking                         |
| GET    | `/api/bookings`                  | ✅   | List my bookings                         |
| GET    | `/api/bookings/:id`              | ✅   | One booking                              |
| PATCH  | `/api/bookings/:id/status`       | ✅   | Advance status                           |
| POST   | `/api/bookings/:id/cancel`       | ✅   | Cancel                                   |
| GET    | `/api/riders/available`          | –    | Online + available riders                |

Auth: send `Authorization: Bearer <token>`.

## Socket.io

```js
import { io } from 'socket.io-client';
const socket = io(API_URL, { auth: { token: jwt } });
socket.on('booking:update', (b) => console.log(b.status));
socket.emit('booking:subscribe', bookingId); // extra room for a specific booking
```

## Deploy on Vercel
`vercel.json` is included. Set env vars in the Vercel dashboard (`MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `OTP_DEV_MODE`).
