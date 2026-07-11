/**
 * DTOs shared between the mobile client and server routes.
 *
 * These mirror the response envelope produced by `qikzo-server/src/lib/http.ts`
 * (`{ success, message, requestId, ...data }`) plus the domain models. Keep
 * them narrow — screens depend on this surface being stable.
 */

// ---------- Envelope ----------
export type ApiEnvelope<T> = T & {
    success: true;
    message: string;
    requestId?: string;
};

// ---------- Auth ----------
export type AuthUser = {
    id: string;
    _id?: string;
    phone: string;
    name?: string;
    role?: 'customer' | 'rider' | 'admin';
    onboarded?: boolean;
    location?: string | null;
};

export type AuthTokens = {
    /** Legacy alias — same value as `accessToken`. */
    token?: string;
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
};

// ---------- Booking ----------
export type BookingMode = 'ride' | 'delivery';
export type PaymentMode = 'cash' | 'upi';

export type Point = {
    address: string;
    lat?: number | null;
    lng?: number | null;
};

export type BookingStatus =
    | 'Searching rider'
    | 'Rider accepted'
    | 'Rider arriving'
    | 'Rider arrived'
    | 'Picked up'
    | 'In transit'
    | 'Delivered'
    | 'Cancelled';

export type BookingHistoryItem = {
    status: BookingStatus;
    note?: string;
    at?: string;
};

export type Booking = {
    _id: string;
    id?: string;
    code: string;
    user: string;
    rider?: Rider | string | null;
    mode: BookingMode;
    categorySlug: string;
    vehicleTypeSlug?: string;
    pickup: Point;
    drop: Point;
    notes?: string;
    recipientPhone?: string;
    payment: PaymentMode;
    distanceKm: number;
    etaMin: number;
    price: number;
    pricing?: { base: number; perKm: number };
    couponCode?: string;
    discount?: number;
    status: BookingStatus;
    history: BookingHistoryItem[];
    cancelledReason?: string;
    createdAt: string;
    updatedAt: string;
};

export type BookingEstimate = {
    distanceKm: number;
    etaMin: number;
    price: number;
    base: number;
    perKm: number;
};

export type CreateBookingInput = {
    mode?: BookingMode;
    categorySlug: string;
    pickup: Point;
    drop: Point;
    notes?: string;
    recipientPhone?: string;
    payment?: PaymentMode;
};

// ---------- Rider ----------
export type Rider = {
    _id: string;
    name: string;
    phone?: string;
    vehicle: string;
    vehicleNo: string;
    rating: number;
    trips: number;
    online: boolean;
    available: boolean;
    kycStatus?: 'not_started' | 'submitted' | 'in_review' | 'approved' | 'rejected';
    currentLocation?: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
        updatedAt?: string | null;
    };
};

// ---------- Trip ----------
export type TripStage = 'assigned' | 'arriving' | 'arrived' | 'started' | 'completed' | 'cancelled';

export type TripPathPoint = {
    lat: number;
    lng: number;
    at?: string;
    speedKph?: number | null;
};

export type Trip = {
    _id: string;
    booking: Booking | string;
    rider: Rider | string;
    user: string;
    vehicle?: string | null;
    stage: TripStage;
    assignedAt?: string;
    arrivingAt?: string | null;
    arrivedAt?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    cancelledAt?: string | null;
    cancelReason?: string;
    distanceKm: number;
    durationMin: number;
    fare: number;
    path: TripPathPoint[];
    createdAt: string;
    updatedAt: string;
};
