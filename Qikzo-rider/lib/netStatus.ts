/**
 * Lightweight network status detector — no @react-native-community/netinfo
 * dependency required. We infer connectivity from three signals:
 *
 *   1. Socket.io `connect` / `disconnect` events (fast, always on when signed in)
 *   2. Fetch failures / recoveries reported by the API client
 *   3. AppState transitions (a fresh foreground → optimistic "online" until
 *      proven otherwise)
 *
 * Screens subscribe via `subscribeNet(cb)` and receive `true`/`false`.
 */
import { getSocket, connectSocket } from './socket';

type Listener = (online: boolean) => void;
let online = true;
const listeners = new Set<Listener>();
let installed = false;

function emit() {
    listeners.forEach((cb) => { try { cb(online); } catch {} });
}

export function setOnline(next: boolean) {
    if (online === next) return;
    online = next;
    emit();
}

export function isOnline(): boolean { return online; }

export function subscribeNet(cb: Listener): () => void {
    listeners.add(cb);
    cb(online);
    return () => { listeners.delete(cb); };
}

export function reportRequest(ok: boolean) {
    if (ok && !online) setOnline(true);
}
export function reportNetworkError() {
    setOnline(false);
    try { connectSocket(); } catch {}
}

export function installNetStatus() {
    if (installed) return;
    installed = true;
    const bind = () => {
        const s = getSocket();
        if (!s) return;
        s.on('connect', () => setOnline(true));
        s.on('disconnect', () => setOnline(false));
        s.on('reconnect', () => setOnline(true));
    };
    bind();
    setInterval(bind, 5000);
}
