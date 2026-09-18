import { useEffect, useState } from 'react';
import { View, AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/authStore';
import { onUnauthorized } from '@/lib/api/client';
import { connectSocket, disconnectSocket, installSocketTokenWatcher } from '@/lib/socket';
import { registerForPushAsync, unregisterPushAsync, installPushDeepLinks } from '@/lib/push';
import { installNetStatus } from '@/lib/netStatus';
import { useBooking } from '@/lib/bookingStore';
import OfflineBanner from '@/components/OfflineBanner';
import ErrorBoundary from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [loaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
  });
  const [authReady, setAuthReady] = useState(false);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate().finally(() => {
      setAuthReady(true);
      try { connectSocket(); } catch {}
      installNetStatus();
      installSocketTokenWatcher();
      registerForPushAsync('customer').catch(() => {});
    });
    return () => { try { disconnectSocket(); } catch {} };
  }, [hydrate]);

  // Resume-on-foreground: when the user brings the app back after being
  // backgrounded (screen locked, switched apps), refetch the active booking
  // and reconnect the socket. This is the single biggest UX fix for
  // "why is my ride showing old status".
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        try { connectSocket(); } catch {}
        try { useBooking.getState().hydrateFromServer(); } catch {}
      }
    });
    return () => sub.remove();
  }, []);

  // Route into /booking-details when the user taps a push notification.
  useEffect(() => installPushDeepLinks((path, params) => {
    try { router.push({ pathname: path as any, params }); } catch {}
  }), []);

  useEffect(() => {
    const off = onUnauthorized(() => {
      useAuth.getState().setSession(null);
      try { disconnectSocket(); } catch { /* noop */ }
      unregisterPushAsync().catch(() => {});
      try { router.replace('/login'); } catch { /* noop */ }
    });
    return off;
  }, []);

  useEffect(() => {
    if (loaded && authReady) SplashScreen.hideAsync().catch(() => { });
  }, [loaded, authReady]);

  if (!loaded || !authReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="splash" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="login" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="book-delivery" />
            <Stack.Screen name="booking-details" />
            <Stack.Screen name="category-banners" />
            <Stack.Screen name="banner-detail" />
            <Stack.Screen name="select-location" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="personal-info" />
            <Stack.Screen name="addresses" />
            <Stack.Screen name="help-support" />
            <Stack.Screen name="about-us" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="terms-conditions" />
          </Stack>
        </View>
      </ErrorBoundary>
      <StatusBar style="dark" backgroundColor={colors.background} translucent={false} />
    </SafeAreaProvider>
  );
}
