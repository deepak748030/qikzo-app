import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F7FB' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task-details" />
        <Stack.Screen name="withdraw" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="transaction-history" />
        <Stack.Screen name="kyc-verification" />
        <Stack.Screen name="personal-info" />
        <Stack.Screen name="payment-details" />
        <Stack.Screen name="help-support" />
        <Stack.Screen name="about-us" />
        <Stack.Screen name="add-money" />
        <Stack.Screen name="bank-details" />
        <Stack.Screen name="upi-details" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="terms-conditions" />
      </Stack>
      <StatusBar style="light" backgroundColor={colors.primary} translucent={false} />
    </SafeAreaProvider>
  );
}
