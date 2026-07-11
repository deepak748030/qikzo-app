# Qikzo Admin Dashboard

Production admin console for the Qikzo platform. Vite + React + TS + Tailwind, TanStack Query, cursor pagination, skeletons, OTP login gated to admins only.

## Setup

```bash
cd Qikzo-admin-dashboard
npm install
cp .env.example .env   # set VITE_API_URL to your qikzo-server URL
npm run dev            # http://localhost:5174
```

Backend must have a user with `role=admin` in Mongo. Login via phone + OTP; non-admins are rejected.

## Pages
Dashboard · Riders · KYC · Bookings · Payouts · Coupons · Support · Audit
