import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ridersApi } from './api/endpoints/riders';
import { tokenStore } from './api/tokenStore';

/**
 * Background location for the rider app.
 *
 * Uses expo-task-manager + expo-location's startLocationUpdatesAsync so the OS
 * keeps delivering GPS to the app even when it's backgrounded or the screen is
 * locked. On Android this runs as a foreground service (persistent
 * notification, required by API 34+). On iOS UIBackgroundModes=location + the
 * "Always Allow" permission keep it alive.
 *
 * Config in app.json:
 *  - expo-location plugin: isAndroidBackgroundLocationEnabled +
 *    isIosBackgroundLocationEnabled + locationAlwaysAndWhenInUsePermission
 *  - Android: ACCESS_BACKGROUND_LOCATION + FOREGROUND_SERVICE +
 *    FOREGROUND_SERVICE_LOCATION
 *  - iOS: NSLocationAlwaysAndWhenInUseUsageDescription +
 *    UIBackgroundModes: ["location","fetch"]
 *
 * Requires a native rebuild (EAS build / prebuild). It will NOT work in
 * Expo Go — Expo Go doesn't include the background-location entitlements.
 */
export const BACKGROUND_LOCATION_TASK = 'qikzo-rider-background-location';

type LocEvent = { locations?: Location.LocationObject[] };

// Define the task at module load so RN can rehydrate it when the OS
// wakes the app up in the background. Safe to call multiple times.
if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;
    const locs = (data as LocEvent)?.locations;
    if (!locs?.length) return;
    // Only send when we still have a valid session (otherwise 401 spam).
    if (!tokenStore.get().accessToken) return;
    const last = locs[locs.length - 1];
    try {
      await ridersApi.updateLocation({
        lat: last.coords.latitude,
        lng: last.coords.longitude,
      });
    } catch {
      /* swallow — next tick will retry */
    }
  });
}

/**
 * Ask for "Always Allow" background permission. Must be called AFTER
 * foreground permission is granted (OS requirement on both platforms).
 */
export async function ensureBackgroundPermission(): Promise<boolean> {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== 'granted') return false;
    }
    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.status === 'granted') return true;
    const asked = await Location.requestBackgroundPermissionsAsync();
    return asked.status === 'granted';
  } catch {
    return false;
  }
}

export async function startBackgroundLocation(): Promise<boolean> {
  try {
    const ok = await ensureBackgroundPermission();
    if (!ok) return false;
    const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (already) return true;
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,
      distanceInterval: 20,
      showsBackgroundLocationIndicator: true, // iOS blue pill
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      foregroundService: Platform.OS === 'android' ? {
        notificationTitle: 'Qikzo Partner is online',
        notificationBody: 'Sharing your location so you can receive nearby jobs.',
        notificationColor: '#F1592A',
      } : undefined,
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundLocation(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    /* ignore */
  }
}
