import { Server, type Socket } from 'socket.io';
import type http from 'http';
import { verifyAccess } from '../lib/tokens';
import { logger } from '../lib/logger';

let io: Server | null = null;

interface SocketWithUser extends Socket {
    userId?: string;
    role?: string;
}

/**
 * Live booking updates: each customer joins a room keyed by their user id.
 * Rider-specific rooms (rider:{id}) + dispatch events (`job:offer`,
 * `job:assigned`, `location:update`) land in Phase 4.6.
 */
export function initSockets(httpServer: http.Server, opts: { corsOrigin?: string } = {}): Server {
    io = new Server(httpServer, {
        cors: { origin: opts.corsOrigin || '*' },
        // Websocket-only in prod path — mobile clients already skip the
        // long-polling upgrade dance. Keeps polling available as a last-resort
        // fallback for restrictive networks.
        transports: ['websocket', 'polling'],
        serveClient: false,
        // Disable per-message deflate entirely — location pings and job
        // events are tiny JSON payloads; deflate burns 15-20% CPU under load
        // for near-zero bandwidth savings.
        perMessageDeflate: false,
        httpCompression: { threshold: 1024 },
        maxHttpBufferSize: 1e6,
        // Bigger ping interval halves keepalive traffic and CPU wakeups on
        // the event loop when thousands of sockets are idle-connected.
        pingInterval: 25000,
        pingTimeout: 20000,
    });

    io.use((socket: SocketWithUser, next) => {
        try {
            const token = (socket.handshake.auth as any)?.token || (socket.handshake.query as any)?.token;
            if (!token) return next(new Error('unauthorized'));
            const payload = verifyAccess(String(token));
            socket.userId = payload.id;
            socket.role = payload.role;
            return next();
        } catch {
            return next(new Error('unauthorized'));
        }
    });

    io.on('connection', (socket: SocketWithUser) => {
        if (socket.userId) socket.join(`user:${socket.userId}`);
        if (socket.role === 'rider' && socket.userId) {
            socket.join(`rider:${socket.userId}`);
            socket.join('riders'); // broadcast room for open dispatch
        } else if (socket.userId) {
            // Non-rider users (customers) join a shared room so they receive
            // live nearby-vehicle location fanout for the map.
            socket.join('customers');
            // Rider-app users often carry role 'customer' in their JWT (the
            // User record is created as customer; role isn't flipped on rider
            // onboarding). If a Rider record exists for this user, ALSO join
            // the rider rooms — otherwise job:cancelled / trip:update fanout
            // never reaches the rider app and cancellations look stuck.
            const uid = socket.userId;
            void import('../models/Rider')
                .then(({ default: Rider }) => Rider.exists({ user: uid }))
                .then((exists) => {
                    if (exists && socket.connected) {
                        socket.join(`rider:${uid}`);
                        socket.join('riders');
                    }
                })
                .catch(() => {});
        }
        socket.on('booking:subscribe', (bookingId: string) => {
            if (bookingId) socket.join(`booking:${bookingId}`);
        });
        socket.on('booking:unsubscribe', (bookingId: string) => {
            if (bookingId) socket.leave(`booking:${bookingId}`);
        });
    });

    logger.info({ msg: 'sockets:initialised' });
    return io;
}

// ---------- Payload slimmers ----------
// The Mongo Point sub-doc carries `{ address, lat, lng, location: { type, coordinates } }`.
// The map + card UI only needs `{ address, lat, lng }`. Dropping the GeoJSON
// wrapper cuts ~60 bytes per point (2 points per booking × N riders on offer).
function slimPoint(p: any) {
    if (!p) return p;
    return { address: p.address || '', lat: p.lat ?? null, lng: p.lng ?? null };
}
// Populated rider docs are huge (KYC fields, timestamps, docs array). The
// customer app only shows { id, name, vehicle, vehicleNo, rating, trips }.
function slimRider(r: any) {
    if (!r) return null;
    if (typeof r === 'string') return r; // ObjectId — client resolves later
    return {
        _id: r._id ? String(r._id) : undefined,
        name: r.name || '',
        vehicle: r.vehicle || '',
        vehicleNo: r.vehicleNo || '',
        rating: typeof r.rating === 'number' ? r.rating : undefined,
        trips: typeof r.trips === 'number' ? r.trips : undefined,
    };
}

export function emitBookingUpdate(booking: any, riderUserId?: string): void {
    if (!io || !booking) return;
    const payload = {
        id: String(booking._id),
        code: booking.code,
        status: booking.status,
        rider: slimRider(booking.rider),
        paymentStatus: booking.paymentStatus,
        updatedAt: booking.updatedAt,
    };
    io.to(`user:${String(booking.user)}`).emit('booking:update', payload);
    io.to(`booking:${String(booking._id)}`).emit('booking:update', payload);
    let uid: string | null = riderUserId ? String(riderUserId) : null;
    if (!uid && booking.rider && typeof booking.rider === 'object' && booking.rider.user) {
        uid = String(booking.rider.user);
    }
    if (uid) io.to(`rider:${uid}`).emit('booking:update', payload);
}

/**
 * Trip lifecycle broadcast — pushed to the customer (via user room), the
 * booking room, and the rider's own room so the rider app can reconcile
 * server-authoritative state.
 */
export function emitTripUpdate(trip: any): void {
    if (!io || !trip) return;
    const payload = {
        id: String(trip._id),
        booking: typeof trip.booking === 'object' ? String(trip.booking._id) : String(trip.booking),
        rider: typeof trip.rider === 'object' ? String(trip.rider._id) : String(trip.rider),
        stage: trip.stage,
        updatedAt: trip.updatedAt,
    };
    io.to(`user:${String(trip.user)}`).emit('trip:update', payload);
    io.to(`booking:${payload.booking}`).emit('trip:update', payload);
    // rider:{userId} room — resolve the rider's user id if the rider doc is populated
    const riderUserId = typeof trip.rider === 'object' ? trip.rider.user : null;
    if (riderUserId) io.to(`rider:${String(riderUserId)}`).emit('trip:update', payload);
}

/**
 * Push a new booking to nearby online riders. Targets each rider by their
 * user room (rider:{userId}) when a list is provided; otherwise broadcasts
 * to the shared `riders` room.
 */
export function emitJobOffer(booking: any, riderUserIds: string[] = []): void {
    if (!io || !booking) return;
    const payload = {
        id: String(booking._id),
        code: booking.code,
        categorySlug: booking.categorySlug,
        // Slim pickup/drop — drop the GeoJSON `location` wrapper (rider app
        // uses only address + lat + lng).
        pickup: slimPoint(booking.pickup),
        extraPickups: Array.isArray(booking.extraPickups) ? booking.extraPickups.map(slimPoint) : [],
        drop: slimPoint(booking.drop),
        distanceKm: booking.distanceKm,
        etaMin: booking.etaMin,
        price: booking.price,
        payment: booking.payment,
        notes: booking.notes || '',
        recipientPhone: booking.recipientPhone || '',
        createdAt: booking.createdAt,
    };
    if (riderUserIds.length) {
        for (const uid of riderUserIds) io.to(`rider:${String(uid)}`).emit('job:offer', payload);
    } else {
        io.to('riders').emit('job:offer', payload);
    }
}

/** Withdraw a job offer once accepted/cancelled so other rider apps clear it.
 *  When `riderUserId` is provided, the specific assigned rider is also targeted
 *  directly — critical when a customer cancels after acceptance and that rider
 *  may not be listening on the shared `riders` room anymore. */
export function emitJobCancelled(bookingId: string, riderUserId?: string): void {
    if (!io || !bookingId) return;
    io.to('riders').emit('job:cancelled', { id: String(bookingId) });
    if (riderUserId) io.to(`rider:${String(riderUserId)}`).emit('job:cancelled', { id: String(bookingId) });
}

/**
 * Fanout a rider's live location to the customer(s) watching an active
 * booking. Rider apps POST /riders/me/location every few seconds while
 * online — the service layer calls this if the rider currently owns a
 * non-terminal trip so the customer's map can move a marker.
 */
export function emitRiderLocation(params: {
    bookingId: string;
    tripId: string;
    riderUserId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    at?: Date;
}): void {
    if (!io) return;
    const payload = {
        bookingId: String(params.bookingId),
        tripId: String(params.tripId),
        lat: params.lat,
        lng: params.lng,
        heading: params.heading ?? null,
        speed: params.speed ?? null,
        at: (params.at || new Date()).toISOString(),
    };
    io.to(`booking:${payload.bookingId}`).emit('location:update', payload);
    // Also to the customer's user room so a fresh subscribe isn't required.
    io.to(`rider:${String(params.riderUserId)}`).emit('location:update', payload);
}

/**
 * Fanout a rider's KYC status change so the rider app updates in real time
 * without a manual refresh. Called from admin approve/reject and any place
 * that mutates `rider.kycStatus` (e.g. document upload sets it to submitted).
 */
export function emitKycUpdate(riderUserId: string, kycStatus: string, extra: Record<string, any> = {}): void {
    if (!io || !riderUserId) return;
    const payload = { kycStatus, ...extra, at: new Date().toISOString() };
    io.to(`rider:${String(riderUserId)}`).emit('kyc:update', payload);
    io.to(`user:${String(riderUserId)}`).emit('kyc:update', payload);
}

/**
 * Broadcast a rider's live location to all connected customers so their
 * map markers move in real time. Payload includes vehicle info so the
 * customer app can pick the right icon (bike / auto / cab).
 */
export function emitNearbyRider(params: {
    riderId: string;
    vehicle?: string;
    online: boolean;
    lat: number;
    lng: number;
}): void {
    if (!io) return;
    io.to('customers').emit('rider:location', {
        id: String(params.riderId),
        vehicle: params.vehicle || '',
        online: params.online,
        lat: params.lat,
        lng: params.lng,
        at: new Date().toISOString(),
    });
}

export function emitRiderOffline(riderId: string): void {
    if (!io) return;
    io.to('customers').emit('rider:offline', { id: String(riderId) });
}

export const getIO = (): Server | null => io;



