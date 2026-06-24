import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Search, ShoppingBag, ClipboardList, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';
import { useCart } from '@/lib/cartStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const count = useCart((s) => s.count());

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
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 10, fontFamily: fonts.bodyBold, marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Home', tabBarIcon: ({ color, focused }) => (
          <Home size={22} color={color} strokeWidth={focused ? 2.6 : 2} />
        )
      }} />
      <Tabs.Screen name="search" options={{
        title: 'Search', tabBarIcon: ({ color, focused }) => (
          <Search size={22} color={color} strokeWidth={focused ? 2.6 : 2} />
        )
      }} />
      <Tabs.Screen name="cart" options={{
        title: 'Cart', tabBarIcon: ({ color, focused }) => (
          <View>
            <ShoppingBag size={22} color={color} strokeWidth={focused ? 2.6 : 2} />
            {count > 0 ? (
              <View style={styles.badge}><Text style={styles.badgeText}>{count}</Text></View>
            ) : null}
          </View>
        )
      }} />
      <Tabs.Screen name="orders" options={{
        title: 'Orders', tabBarIcon: ({ color, focused }) => (
          <ClipboardList size={22} color={color} strokeWidth={focused ? 2.6 : 2} />
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

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -6, right: -8, minWidth: 15, height: 15, paddingHorizontal: 3,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderRadius: 0,
  },
  badgeText: { color: colors.accentForeground, fontSize: 9, fontFamily: fonts.bodyBold },
});
