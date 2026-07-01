import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Activity, User } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <View style={styles.tabBg} />
        ),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(240,237,229,0.55)',
        tabBarLabelStyle: { fontSize: 10, fontFamily: fonts.bodyBold, marginTop: 3, letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, focused }) => (
          <TabIcon Icon={Home} color={color} focused={focused} />
        ),
      }} />
      <Tabs.Screen name="activity" options={{
        title: 'Activity',
        tabBarIcon: ({ color, focused }) => (
          <TabIcon Icon={Activity} color={color} focused={focused} />
        ),
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, focused }) => (
          <TabIcon Icon={User} color={color} focused={focused} />
        ),
      }} />
    </Tabs>
  );
}

// Active tab renders a filled Cyprus/gold pill behind a bold-stroke icon.
// Inactive tabs stay minimal so the active one really pops.
function TabIcon({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon
        size={focused ? 20 : 22}
        color={focused ? colors.primary : color}
        strokeWidth={focused ? 2.8 : 2}
        fill={focused ? colors.accent : 'transparent'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Dark Cyprus-tinted glass bar
  tabBg: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceDarkBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: -6 } },
      android: { elevation: 12 },
      default: {},
    }),
  },
  iconWrap: {
    width: 40, height: 30, alignItems: 'center', justifyContent: 'center',
    borderRadius: 999,
  },
  iconWrapActive: {
    backgroundColor: colors.accent,
  },
});
