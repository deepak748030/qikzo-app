const { Server } = require('socket.io');
const { verify } = require('../utils/jwt');

let io = null;

// Live booking updates: each customer joins a room keyed by their user id.
function initSockets(httpServer, opts = {}) {
    io = new Server(httpServer, {
        cors: { origin: opts.corsOrigin || '*' },
        transports: ['websocket', 'polling'],
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) return next(new Error('unauthorized'));
            const payload = verify(String(token));
            socket.userId = payload.id;
            return next();
        } catch {
            return next(new Error('unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(`user:${socket.userId}`);
        socket.on('booking:subscribe', (bookingId) => {
            if (bookingId) socket.join(`booking:${bookingId}`);
        });
    });

    return io;
}

function emitBookingUpdate(booking) {
    if (!io || !booking) return;
    const payload = {
        id: String(booking._id),
        code: booking.code,
        status: booking.status,
        rider: booking.rider || null,
        updatedAt: booking.updatedAt,
    };
    io.to(`user:${String(booking.user)}`).emit('booking:update', payload);
    io.to(`booking:${String(booking._id)}`).emit('booking:update', payload);
}

module.exports = { initSockets, emitBookingUpdate, getIO: () => io };
