import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { devicesApi } from './api/endpoints/devices';
import { tokenStore } from './api/tokenStore';

/**
 * Expo push registration for the customer app.
 *
 *  1. Ensures the Android "default" channel exists (required for heads-up).
 *  2. Asks permission the first time (best-effort — silent if the user denies).
 *  3. Fetches the Expo push token and POSTs to /devices so the server can
 *     push booking/trip updates.
 *
 * Safe to call more than once; server-side registration is idempotent.
 */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

let lastToken: string | null = null;

export async function registerForPushAsync(audience: 'customer' | 'rider' = 'customer'): Promise<string | null> {
    try {
        if (!Device.isDevice) return null;
        if (!tokenStore.get().accessToken) return null;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 200, 100, 200],
                lightColor: '#F1592A',
            });
        }

        const perm = await Notifications.getPermissionsAsync();
        let status = perm.status;
        if (status !== 'granted') {
            const asked = await Notifications.requestPermissionsAsync();
            status = asked.status;
        }
        if (status !== 'granted') return null;

        const projectId =
            (Constants.expoConfig as any)?.extra?.eas?.projectId ||
            (Constants as any)?.easConfig?.projectId;
        const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        const expoToken = tokenResp.data;
        if (!expoToken || expoToken === lastToken) return expoToken;

        lastToken = expoToken;
        await devicesApi.register({
            token: expoToken,
            platform: (Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'),
            audience,
            model: Device.modelName || undefined,
            appVersion: (Constants.expoConfig?.version as string) || undefined,
        });
        return expoToken;
    } catch {
        return null;
    }
}

export async function unregisterPushAsync(): Promise<void> {
    try {
        if (!lastToken) return;
        await devicesApi.unregister(lastToken);
    } catch { /* ignore */ } finally {
        lastToken = null;
    }
}

/**
 * Deep-link routing on notification tap. Server pushes carry `data.bookingId`
 * for booking events; we route the user straight into `/booking-details` so
 * they don't have to hunt for the trip in Activity.
 *
 * Returns an unsubscribe fn. Call once in the root layout.
 */
export function installPushDeepLinks(navigate: (path: string, params?: any) => void): () => void {
    // Cold-start: app launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((resp) => {
        const data = resp?.notification?.request?.content?.data as any;
        if (data?.bookingId) {
            setTimeout(() => navigate('/booking-details', { id: String(data.bookingCode || data.bookingId) }), 200);
        }
    }).catch(() => {});
    // Warm: user tapped notification while app is running / backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
        const data = resp?.notification?.request?.content?.data as any;
        if (data?.bookingId) {
            navigate('/booking-details', { id: String(data.bookingCode || data.bookingId) });
        }
    });
    return () => { try { sub.remove(); } catch {} };
}
