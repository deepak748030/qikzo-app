import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth } from '@/lib/authStore';
import Skeleton from '@/components/Skeleton';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { usersApi } from '@/lib/api/endpoints/users';
import { authApi } from '@/lib/api/endpoints/auth';
import { tokenStore } from '@/lib/api/tokenStore';
import { ApiError } from '@/lib/api/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PersonalInfo() {
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const name = useAuth((s) => s.name);
  const phone = useAuth((s) => s.phone);
  const setName = useAuth((s) => s.setName);

  const [fullName, setFullName] = useState(name === 'Guest' ? '' : name);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const initialLoading = useInitialLoad();

  // Hydrate email + latest name from server on mount.
  useEffect(() => {
    const { accessToken } = tokenStore.get();
    if (!accessToken) return;
    authApi.me().then((u) => {
      if (u.name) setFullName(u.name);
      if ((u as any).email) setEmail((u as any).email);
    }).catch(() => { /* ignore */ });
  }, []);

  const save = async () => {
    if (fullName.trim().length < 2) {
      sheet.show({ variant: 'error', title: 'Name required', message: 'Please enter your full name.' });
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      sheet.show({ variant: 'error', title: 'Invalid email', message: 'Enter a valid email address.' });
      return;
    }
    setLoading(true);
    try {
      const { accessToken } = tokenStore.get();
      if (accessToken) {
        const user = await usersApi.updateMe({
          name: fullName.trim(),
          ...(email ? { email: email.trim() } : {}),
        });
        setName(user.name || fullName.trim());
      } else {
        setName(fullName.trim());
      }
      sheet.show({ variant: 'success', title: 'Saved', message: 'Your details have been updated.' });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not save. Please try again.';
      sheet.show({ variant: 'error', title: 'Save failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Personal information" />
      {initialLoading ? (
        <View style={{ padding: 6, gap: 10 }}>
          <Skeleton width={90} height={11} />
          <Skeleton width="100%" height={44} rounded="sm" />
          <Skeleton width={60} height={11} style={{ marginTop: 4 }} />
          <Skeleton width="100%" height={44} rounded="sm" />
          <Skeleton width={110} height={11} style={{ marginTop: 4 }} />
          <Skeleton width="100%" height={44} rounded="sm" />
          <Skeleton width="100%" height={46} rounded="pill" style={{ marginTop: 10 }} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Input label="Full name" placeholder="Your name" value={fullName} onChangeText={setFullName} />
          <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Input label="Mobile number" prefix="" value={phone || ''} editable={false} />
          <Button label="Save changes" loading={loading} onPress={save} style={{ marginTop: 6 }} />
        </View>
      </ScrollView>
      )}
      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
