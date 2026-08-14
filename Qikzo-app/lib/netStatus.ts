/**
 * Device-level network status — NOT server reachability.
 *
 * The API is on a free-tier host that can take ~1 minute to wake. A socket
 * drop or a fetch *timeout* therefore must never flash "No internet".
 *
 * Offline is only reported when the *phone* has no network:
 *   - `navigator.onLine === false` (airplane / data+wifi off)
 *   - an immediate fetch failure (`NETWORK`), never an `AbortError` timeout
 *
 * Screens subscribe via `subscribeNet(cb)` and receive `true`/`false`.
 */
import { AppState } from 'react-native';
import { connectSocket } from './socket';

type Listener = (online: boolean) => void;

/** Optimistic default — never flash the banner before we have proof. */
let online = true;
const listeners = new Set<Listener>();
let installed = false;

function emit() {
    listeners.forEach((cb) => { try { cb(online); } catch {} });
}

function navOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function setOnline(next: boolean) {
    if (online === next) return;
    online = next;
    emit();
    if (next) {
        try { connectSocket(); } catch {}
    }
}

export function isOnline(): boolean { return online; }

export function subscribeNet(cb: Listener): () => void {
    listeners.add(cb);
    cb(online);
    return () => { listeners.delete(cb); };
}

/** Called by API client on request success. Success ⇒ device is online. */
export function reportRequest(ok: boolean) {
    if (ok && !online) setOnline(true);
}

/**
 * Called by the API client when fetch throws.
 * Timeouts = sleeping free-tier server. Do not treat as offline.
 * Immediate network failures = phone radio is down.
 */
export function reportNetworkError(kind?: 'TIMEOUT' | 'NETWORK') {
    if (kind === 'TIMEOUT') return;
    setOnline(false);
}

export function installNetStatus() {
    if (installed) return;
    installed = true;

    // Stay optimistic-online. Never probe a public URL on boot — that
    // false-positives while the free-tier API is still waking.
    if (navOffline()) setOnline(false);

    AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        if (navOffline()) setOnline(false);
    });
}
