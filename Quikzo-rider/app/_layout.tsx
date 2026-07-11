import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { colors } from '@/lib/theme';
import { tokenStore } from '@/lib/api/tokenStore';
import { onUnauthorized } from '@/lib/api/client';
import { useAuth } from '@/lib/authStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { registerForPushAsync, unregisterPushAsync } from '@/lib/push';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [loaded] = useFonts({
    Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold,
    Manrope_400Regular, Manrope_500Medium, Manrope_700Bold,
  });
  const [ready, setReady] = useState(false);

  // Hydrate access/refresh tokens before any authenticated request fires.
  useEffect(() => {
    tokenStore.hydrate().finally(() => {
      setReady(true);
      try { connectSocket(); } catch {}
      registerForPushAsync('rider').catch(() => {});
    });
    return () => { try { disconnectSocket(); } catch {} };
  }, []);

  // Bounce to /login when refresh terminally fails.
  useEffect(() => {
    const off = onUnauthorized(() => {
      try { useAuth.getState().signOut(); } catch { /* noop */ }
      try { disconnectSocket(); } catch { /* noop */ }
      unregisterPushAsync().catch(() => {});
      try { router.replace('/login'); } catch { /* noop */ }
    });
    return off;
  }, []);

  useEffect(() => { if (loaded && ready) SplashScreen.hideAsync().catch(() => { }); }, [loaded, ready]);
  if (!loaded || !ready) return null;


  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="vehicle-setup" />
        <Stack.Screen name="active-job" />
        <Stack.Screen name="documents" />
        <Stack.Screen name="payout-details" />
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
