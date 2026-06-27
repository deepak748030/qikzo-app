import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Activity, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 10, fontFamily: fonts.bodyBold, marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Home', tabBarIcon: ({ color, focused }) => (
          <Home size={22} color={color} strokeWidth={focused ? 2.6 : 2} />
        )
      }} />
      <Tabs.Screen name="activity" options={{
        title: 'Activity', tabBarIcon: ({ color, focused }) => (
          <Activity size={22} color={color} strokeWidth={focused ? 2.6 : 2} />
        )
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile', tabBarIcon: ({ color, focused }) => (
          <User size={22} color={color} strokeWidth={focused ? 2.6 : 2} />
        )
      }} />
    </Tabs>
  );
}
