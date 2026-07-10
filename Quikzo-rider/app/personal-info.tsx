import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth, Gender } from '@/lib/authStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOB_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const PIN_RE = /^\d{6}$/;
const PHONE_RE = /^\d{10}$/;

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
];

// Personal information — captures the rider's identity + contact details needed
// for verification, payouts, insurance, and emergency contact.
export default function PersonalInfo() {
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const name = useAuth((s) => s.name);
  const phone = useAuth((s) => s.phone);
  const personal = useAuth((s) => s.personal);
  const setName = useAuth((s) => s.setName);
  const setPersonal = useAuth((s) => s.setPersonal);

  const [fullName, setFullName] = useState(name === 'Guest' ? '' : name);
  const [email, setEmail] = useState(personal.email);
  const [dob, setDob] = useState(personal.dob);
  const [gender, setGender] = useState<Gender | null>(personal.gender);
  const [address, setAddress] = useState(personal.address);
  const [city, setCity] = useState(personal.city);
  const [pincode, setPincode] = useState(personal.pincode);
  const [emergencyName, setEmergencyName] = useState(personal.emergencyName);
  const [emergencyPhone, setEmergencyPhone] = useState(personal.emergencyPhone);
  const [loading, setLoading] = useState(false);

  const err = (title: string, message: string) => sheet.show({ variant: 'error', title, message });

  const save = () => {
    if (fullName.trim().length < 2) return err('Name required', 'Please enter your full name.');
    if (!EMAIL_RE.test(email)) return err('Invalid email', 'Enter a valid email address.');
    if (!DOB_RE.test(dob)) return err('Invalid date of birth', 'Use DD/MM/YYYY format.');
    if (!gender) return err('Select gender', 'Please choose one option.');
    if (address.trim().length < 5) return err('Address required', 'Enter your current address.');
    if (city.trim().length < 2) return err('City required', 'Enter your city.');
    if (!PIN_RE.test(pincode)) return err('Invalid PIN code', 'PIN code must be 6 digits.');
    if (emergencyName.trim().length < 2) return err('Emergency contact', 'Enter the name of your emergency contact.');
    if (!PHONE_RE.test(emergencyPhone)) return err('Invalid contact number', 'Emergency phone must be 10 digits.');

    setLoading(true);
    setTimeout(() => {
      setName(fullName.trim());
      setPersonal({ email, dob, gender, address, city, pincode, emergencyName, emergencyPhone });
      setLoading(false);
      sheet.show({ variant: 'success', title: 'Saved', message: 'Your personal details have been updated.' });
    }, 700);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Personal information" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Identity</Text>
        <View style={{ gap: 6 }}>
          <Input label="Full name" placeholder="As per driving licence" value={fullName} onChangeText={setFullName} />
          <Input label="Mobile number" value={phone || ''} editable={false} />
          <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Input label="Date of birth" placeholder="DD/MM/YYYY" keyboardType="number-pad" value={dob} onChangeText={setDob} maxLength={10} />
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
});
