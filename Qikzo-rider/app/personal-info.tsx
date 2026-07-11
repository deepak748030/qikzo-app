import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth, Gender } from '@/lib/authStore';
import { authApi } from '@/lib/api/endpoints/auth';
import { usersApi } from '@/lib/api/endpoints/users';
import { uploadFile } from '@/lib/api/endpoints/uploads';
import { tokenStore } from '@/lib/api/tokenStore';
import { API_BASE_URL } from '@/lib/api/config';
import { ApiError } from '@/lib/api/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOB_RE = /^\d{2}-\d{2}-\d{4}$/;
const PIN_RE = /^\d{6}$/;
const PHONE_RE = /^\d{10}$/;

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
];

function absUrl(u: string): string {
  if (!u) return '';
  return u.startsWith('http') ? u : `${API_BASE_URL}${u}`;
}

export default function PersonalInfo() {
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const name = useAuth((s) => s.name);
  const phone = useAuth((s) => s.phone);
  const personal = useAuth((s) => s.personal);
  const avatarUrl = useAuth((s) => s.avatarUrl);
  const setName = useAuth((s) => s.setName);
  const setPersonal = useAuth((s) => s.setPersonal);
  const setAvatarUrl = useAuth((s) => s.setAvatarUrl);

  const [fullName, setFullName] = useState(name === 'Guest' ? '' : name);
  const [email, setEmail] = useState(personal.email);
  const [dob, setDob] = useState(personal.dob);
  const [gender, setGender] = useState<Gender | null>(personal.gender);
  const [address, setAddress] = useState(personal.address);
  const [city, setCity] = useState(personal.city);
  const [pincode, setPincode] = useState(personal.pincode);
  const [emergencyName, setEmergencyName] = useState(personal.emergencyName);
  const [emergencyPhone, setEmergencyPhone] = useState(personal.emergencyPhone);
  const [photo, setPhoto] = useState<string>(avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const err = (title: string, message: string) => sheet.show({ variant: 'error', title, message });

  const hydrate = useCallback(async () => {
    const { accessToken } = tokenStore.get();
    if (!accessToken) return;
    try {
      const u: any = await authApi.me();
      if (u?.name) { setFullName(u.name); setName(u.name); }
      if (typeof u?.email === 'string') setEmail(u.email);
      if (typeof u?.dob === 'string') setDob(u.dob);
      if (u?.gender && u.gender !== '') setGender(u.gender);
      if (typeof u?.address === 'string') setAddress(u.address);
      if (typeof u?.city === 'string') setCity(u.city);
      if (typeof u?.pincode === 'string') setPincode(u.pincode);
      if (typeof u?.emergencyName === 'string') setEmergencyName(u.emergencyName);
      if (typeof u?.emergencyPhone === 'string') setEmergencyPhone(u.emergencyPhone);
      if (typeof u?.avatarUrl === 'string') { setPhoto(u.avatarUrl); setAvatarUrl(u.avatarUrl); }
      setPersonal({
        email: u?.email || '',
        dob: u?.dob || '',
        gender: (u?.gender && u.gender !== '') ? u.gender : null,
        address: u?.address || '',
        city: u?.city || '',
        pincode: u?.pincode || '',
        emergencyName: u?.emergencyName || '',
        emergencyPhone: u?.emergencyPhone || '',
      });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await hydrate(); } finally { setRefreshing(false); }
  }, [hydrate]);

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return err('Permission needed', 'Please allow photo access to change your picture.');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      setUploading(true);
      const uploaded = await uploadFile({
        localUri: asset.uri,
        name: asset.fileName || `avatar_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      // Persist immediately so the photo survives even if the user backs out.
      const updated = await usersApi.updateMe({ avatarUrl: uploaded.url });
      const finalUrl = (updated as any).avatarUrl || uploaded.url;
      setPhoto(finalUrl);
      setAvatarUrl(finalUrl);
      sheet.show({ variant: 'success', title: 'Photo updated', message: 'Your profile picture has been saved.' });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not update photo.';
      err('Upload failed', msg);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (fullName.trim().length < 2) return err('Name required', 'Please enter your full name.');
    if (!EMAIL_RE.test(email)) return err('Invalid email', 'Enter a valid email address.');
    if (!DOB_RE.test(dob)) return err('Invalid date of birth', 'Use DD-MM-YYYY format.');
    if (!gender) return err('Select gender', 'Please choose one option.');
    if (address.trim().length < 5) return err('Address required', 'Enter your current address.');
    if (city.trim().length < 2) return err('City required', 'Enter your city.');
    if (!PIN_RE.test(pincode)) return err('Invalid PIN code', 'PIN code must be 6 digits.');
    if (emergencyName.trim().length < 2) return err('Emergency contact', 'Enter the name of your emergency contact.');
    if (!PHONE_RE.test(emergencyPhone)) return err('Invalid contact number', 'Emergency phone must be 10 digits.');

    setLoading(true);
    try {
      const { accessToken } = tokenStore.get();
      if (accessToken) {
        const user = await usersApi.updateMe({
          name: fullName.trim(),
          email: email.trim(),
          dob,
          gender: gender!,
          address: address.trim(),
          city: city.trim(),
          pincode,
          emergencyName: emergencyName.trim(),
          emergencyPhone,
        });
        setName(user.name || fullName.trim());
      } else {
        setName(fullName.trim());
      }
      setPersonal({ email, dob, gender, address, city, pincode, emergencyName, emergencyPhone });
      sheet.show({ variant: 'success', title: 'Saved', message: 'Your personal details have been updated.' });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not save. Please try again.';
      sheet.show({ variant: 'error', title: 'Save failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const photoUri = photo ? absUrl(photo) : '';
  const initial = (fullName || 'R').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Personal information" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        {/* Profile photo */}
        <View style={styles.photoWrap}>
          <Pressable onPress={pickAvatar} style={styles.photoBtn} disabled={uploading}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Text style={styles.photoInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              {uploading ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Camera size={14} color={colors.primaryForeground} />}
            </View>
          </Pressable>
          <Text style={styles.photoHint}>{uploading ? 'Uploading…' : 'Tap to change photo'}</Text>
        </View>

        <Text style={styles.section}>Identity</Text>
        <View style={{ gap: 6 }}>
          <Input label="Full name" placeholder="As per driving licence" value={fullName} onChangeText={setFullName} />
          <Input label="Mobile number" value={phone || ''} editable={false} />
          <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Input label="Date of birth" placeholder="DD-MM-YYYY" keyboardType="number-pad" value={dob} onChangeText={(v) => {
            const d = v.replace(/\D/g, '').slice(0, 8);
            let out = d;
            if (d.length > 4) out = `${d.slice(0,2)}-${d.slice(2,4)}-${d.slice(4)}`;
            else if (d.length > 2) out = `${d.slice(0,2)}-${d.slice(2)}`;
            setDob(out);
          }} maxLength={10} />
          <View>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => {
                const active = gender === g.key;
                return (
                  <Pressable key={g.key} onPress={() => setGender(g.key)} style={[styles.genderChip, active && styles.genderChipActive]}>
                    <Text style={[styles.genderText, active && styles.genderTextActive]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.section}>Address</Text>
        <View style={{ gap: 6 }}>
          <Input label="Current address" placeholder="House / street / area" value={address} onChangeText={setAddress} multiline />
          <Input label="City" placeholder="e.g. New Delhi" value={city} onChangeText={setCity} />
          <Input label="PIN code" placeholder="6 digits" keyboardType="number-pad" maxLength={6} value={pincode} onChangeText={setPincode} />
        </View>

        <Text style={styles.section}>Emergency contact</Text>
        <View style={{ gap: 6 }}>
          <Input label="Contact name" placeholder="Full name" value={emergencyName} onChangeText={setEmergencyName} />
          <Input label="Contact number" prefix="+91" placeholder="10-digit mobile" keyboardType="number-pad" maxLength={10} value={emergencyPhone} onChangeText={setEmergencyPhone} />
        </View>

        <Button label="Save details" loading={loading} onPress={save} style={{ marginTop: 16 }} />
      </ScrollView>
      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 6, marginTop: 16, marginBottom: 8 },
  label: { fontSize: 12, color: colors.mutedForeground, marginBottom: 6, fontFamily: fonts.bodyBold },
  genderRow: { flexDirection: 'row', gap: 6 },
  genderChip: { flex: 1, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, paddingVertical: 12, alignItems: 'center', borderRadius: radius.sm },
  genderChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  genderText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
  genderTextActive: { color: colors.primaryForeground },
  photoWrap: { alignItems: 'center', paddingVertical: 14 },
  photoBtn: { position: 'relative' },
  photo: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  photoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  photoInitial: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 32 },
  cameraBadge: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  photoHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 8 },
});
