import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { User as UserIcon, Mail, Phone, MapPin } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors } from '@/lib/theme';
import { user } from '@/lib/mockData';

export default function PersonalInfoScreen() {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [phone, setPhone] = useState(user.phone);
    const [address, setAddress] = useState('123 Main Street, Mumbai');
    const [loading, setLoading] = useState(false);
    const [sheet, setSheet] = useState(false);

    const onSave = () => {
        setLoading(true);
        setTimeout(() => { setLoading(false); setSheet(true); }, 800);
    };

    const Field = ({ Icon, value, onChangeText, placeholder, keyboardType }: any) => (
        <View style={styles.inputWrap}>
            <Icon size={16} color={colors.mutedForeground} />
            <TextInput
                value={value} onChangeText={onChangeText} placeholder={placeholder}
                placeholderTextColor={colors.mutedForeground} style={styles.input}
                keyboardType={keyboardType}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title="Personal Information" />
            <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}>
                <Text style={styles.label}>Full Name</Text>
                <Field Icon={UserIcon} value={name} onChangeText={setName} placeholder="Full Name" />
                <Text style={styles.label}>Email</Text>
                <Field Icon={Mail} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
                <Text style={styles.label}>Phone</Text>
                <Field Icon={Phone} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
                <Text style={styles.label}>Address</Text>
                <Field Icon={MapPin} value={address} onChangeText={setAddress} placeholder="Address" />

                <Pressable style={styles.saveBtn} onPress={onSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save Changes</Text>}
                </Pressable>
            </ScrollView>

            <BottomSheet
                visible={sheet} variant="success"
                title="Saved Successfully"
                message="Your personal information has been updated."
                confirmText="Done"
                onClose={() => setSheet(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    label: { color: colors.foreground, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg,
        borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, paddingHorizontal: 10, gap: 6,
    },
    input: { flex: 1, color: colors.foreground, fontSize: 13, paddingVertical: 8 },
    saveBtn: {
        backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6,
        alignItems: 'center', justifyContent: 'center', marginTop: 12,
    },
    saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
