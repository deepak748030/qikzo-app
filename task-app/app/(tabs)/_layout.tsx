import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, ClipboardList, Wallet, Users, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Home', tabBarIcon: ({ color, focused }) => (
          <Home size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.5 : 2} />
        )
      }} />
      <Tabs.Screen name="tasks" options={{
        title: 'Tasks', tabBarIcon: ({ color, focused }) => (
          <ClipboardList size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.5 : 2} />
        )
      }} />
      <Tabs.Screen name="wallet" options={{
        title: 'Wallet', tabBarIcon: ({ color, focused }) => (
          <Wallet size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.5 : 2} />
        )
      }} />
      <Tabs.Screen name="refer" options={{
        title: 'Refer', tabBarIcon: ({ color, focused }) => (
          <Users size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.5 : 2} />
        )
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile', tabBarIcon: ({ color, focused }) => (
          <User size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.5 : 2} />
        )
      }} />
    </Tabs>
  );
}
