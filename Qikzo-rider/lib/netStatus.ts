/**
 * Device-level network status — NOT server reachability.
 *
 * The API is hosted on a free-tier host that can take ~1 minute to wake
 * on the first request. Socket.io `disconnect` and fetch timeouts therefore
 * do NOT mean the phone has no internet, and must not flash the banner.
 *
 * "Offline" is only reported when the *device* cannot reach the public
 * internet (airplane mode, mobile data / Wi-Fi off, captive portal).
 *
 * Screens subscribe via `subscribeNet(cb)` and receive `true`/`false`.
 */
import { AppState, Platform } from 'react-native';
import { connectSocket } from './socket';

type Listener = (online: boolean) => void;

/** Optimistic default — never flash the banner before we have proof. */
let online = true;
const listeners = new Set<Listener>();
let installed = false;
let probeInFlight: Promise<boolean> | null = null;
let offlinePoll: ReturnType<typeof setInterval> | null = null;

function emit() {
    listeners.forEach((cb) => { try { cb(online); } catch {} });
}

export function setOnline(next: boolean) {
    if (online === next) return;
    online = next;
    emit();
    syncOfflinePoll();
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
 * Called by API client when fetch throws / times out.
 * That is often a sleeping free-tier server — verify the *device* first.
 */
export function reportNetworkError() {
    void verifyDeviceInternet();
}

const PROBE_TIMEOUT_MS = 3000;
const PROBE_URLS = [
    'https://connectivitycheck.gstatic.com/generate_204',
    'https://www.gstatic.com/generate_204',
];

async function probeDeviceInternet(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return false;
    }
    if (Platform.OS === 'web') {
        return typeof navigator === 'undefined' ? true : navigator.onLine;
    }

    for (const base of PROBE_URLS) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
            const res = await fetch(`${base}?_=${Date.now()}`, {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal,
                headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
            });
            clearTimeout(timer);
            if (res.status === 204 || res.status === 200 || res.ok) return true;
        } catch {
            // try the next probe
        }
    }
    return false;
}

function verifyDeviceInternet(): Promise<boolean> {
    if (probeInFlight) return probeInFlight;
    probeInFlight = (async () => {
        const ok = await probeDeviceInternet();
        setOnline(ok);
        return ok;
    })().finally(() => { probeInFlight = null; });
    return probeInFlight;
}

function syncOfflinePoll() {
    if (online) {
        if (offlinePoll) { clearInterval(offlinePoll); offlinePoll = null; }
        return;
    }
    if (offlinePoll) return;
    offlinePoll = setInterval(() => { void verifyDeviceInternet(); }, 4000);
}

export function installNetStatus() {
    if (installed) return;
    installed = true;
    void verifyDeviceInternet();
    const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void verifyDeviceInternet();
    });
    void sub;
}
