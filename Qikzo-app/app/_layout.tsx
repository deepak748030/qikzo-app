import { useEffect, useState } from 'react';
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
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { registerForPushAsync, unregisterPushAsync } from '@/lib/push';

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

  // Hydrate token cache + persisted profile before rendering routes so gate
  // decisions (login vs tabs) are based on real state, not defaults.
  useEffect(() => {
    hydrate().finally(() => {
      setAuthReady(true);
      try { connectSocket(); } catch {}
      // Fire-and-forget push registration (silent if signed out / denied).
      registerForPushAsync('customer').catch(() => {});
    });
    return () => { try { disconnectSocket(); } catch {} };
  }, [hydrate]);

  // If refresh ultimately fails, the API client clears tokens and fires this;
  // we mirror that into the app store and bounce to /login.
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="book-delivery" />
        <Stack.Screen name="booking-details" />
        <Stack.Screen name="select-location" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="personal-info" />
        <Stack.Screen name="help-support" />
        <Stack.Screen name="about-us" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="terms-conditions" />
      </Stack>
      <StatusBar style="dark" backgroundColor={colors.background} translucent={false} />
    </SafeAreaProvider>
  );
}
