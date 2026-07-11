import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api/config';
import { tokenStore } from './api/tokenStore';

/**
 * Rider-app realtime channel.
 *
 * Auto-connects when an access token is available and re-connects on token
 * rotation. Screens/stores register listeners via `subscribe(event, cb)` and
 * receive an unsubscribe function.
 */
let socket: Socket | null = null;
let currentToken: string | null = null;

type Listener = (payload: any) => void;
const listeners = new Map<string, Set<Listener>>();

function attachListeners() {
    if (!socket) return;
    for (const [event, set] of listeners.entries()) {
        socket.off(event);
        socket.on(event, (payload) => set.forEach((cb) => { try { cb(payload); } catch {} }));
    }
}

export function connectSocket() {
    const { accessToken } = tokenStore.get();
    if (!accessToken) return null;
    if (socket && currentToken === accessToken && socket.connected) return socket;
    if (socket) { try { socket.disconnect(); } catch {} socket = null; }
    currentToken = accessToken;
    socket = io(API_BASE_URL, {
        transports: ['websocket'],
        auth: { token: accessToken },
        reconnection: true,
        reconnectionDelay: 1500,
    });
    attachListeners();
    return socket;
}

export function disconnectSocket() {
    if (socket) { try { socket.disconnect(); } catch {} socket = null; }
    currentToken = null;
}

export function subscribe(event: string, cb: Listener): () => void {
    let set = listeners.get(event);
    if (!set) { set = new Set(); listeners.set(event, set); }
    set.add(cb);
    if (socket) {
        socket.off(event);
        socket.on(event, (payload) => set!.forEach((fn) => { try { fn(payload); } catch {} }));
    }
    return () => {
        set!.delete(cb);
    };
}

export function emit(event: string, payload?: any) {
    if (!socket) return;
    socket.emit(event, payload);
}

export function getSocket(): Socket | null { return socket; }
