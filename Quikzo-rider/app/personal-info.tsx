import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth } from '@/lib/authStore';

export default function PersonalInfo() {
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const name = useAuth((s) => s.name);
  const phone = useAuth((s) => s.phone);
  const setName = useAuth((s) => s.setName);

  const [fullName, setFullName] = useState(name === 'Guest' ? '' : name);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const save = () => {
    if (fullName.trim().length < 2) {
      sheet.show({ variant: 'error', title: 'Name required', message: 'Please enter your full name.' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setName(fullName.trim());
      setLoading(false);
      sheet.show({ variant: 'success', title: 'Saved', message: 'Your details have been updated.' });
    }, 700);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Personal information" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Input label="Full name" placeholder="Your name" value={fullName} onChangeText={setFullName} />
          <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Input label="Mobile number" prefix="" value={phone || ''} editable={false} />
          <Button label="Save changes" loading={loading} onPress={save} style={{ marginTop: 6 }} />
        </View>
      </ScrollView>
      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
