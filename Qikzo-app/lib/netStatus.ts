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

/** Called by API client on request success/failure. */
export function reportRequest(ok: boolean) {
    if (ok && !online) setOnline(true);
    // We do NOT flip to offline on a single failure — the socket signal is
    // authoritative. This avoids false positives on 5xx errors.
}
export function reportNetworkError() {
    setOnline(false);
    // Nudge socket to reconnect so the recovery path kicks in.
    try { connectSocket(); } catch {}
}

/** Install socket-based online detection once at app start. */
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
    // Rebind periodically in case socket was replaced (token rotation).
    setInterval(bind, 5000);
}
