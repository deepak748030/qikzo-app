import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [loaded] = useFonts({
    Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold,
    Manrope_400Regular, Manrope_500Medium, Manrope_700Bold,
  });

  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => { }); }, [loaded]);
  if (!loaded) return null;

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
