import { create } from 'zustand';
import { myRider } from './mockData';

export type VehicleType = 'bike' | 'auto' | 'sedan';

export type PayoutDetails = {
    accountHolder: string;
    accountNumber: string; // full number, mask when displaying
    ifsc: string;
    bankName: string;
    upiId?: string;
};

export type Gender = 'male' | 'female' | 'other';

export type PersonalDetails = {
    email: string;
    dob: string;           // DD/MM/YYYY
    gender: Gender | null;
    address: string;
    city: string;
    pincode: string;
    emergencyName: string;
    emergencyPhone: string;
};

const EMPTY_PERSONAL: PersonalDetails = {
    email: '', dob: '', gender: null, address: '', city: '', pincode: '',
    emergencyName: '', emergencyPhone: '',
};

// Rider-side auth + profile.
type AuthState = {
    phone: string | null;
    name: string;
    avatarUrl: string;
    vehicleType: VehicleType;
    vehicle: string;         // display name e.g. "Honda Activa"
    vehicleNo: string;       // registration number
    locationGranted: boolean;
    onboarded: boolean;
    profileComplete: boolean; // vehicle type + number captured
    payout: PayoutDetails | null;
    personal: PersonalDetails;
    setPhone: (p: string) => void;
    setName: (n: string) => void;
    setAvatarUrl: (u: string) => void;
    setOnboarded: (v: boolean) => void;
    setVehicleProfile: (t: VehicleType, no: string) => void;
    setLocationGranted: (v: boolean) => void;
    setPayout: (p: PayoutDetails) => void;
    setPersonal: (p: PersonalDetails) => void;
    signOut: () => void;
};

const VEHICLE_LABEL: Record<VehicleType, string> = {
    bike: 'Two-wheeler',
    auto: 'Auto rickshaw',
    sedan: 'Sedan',
};

export const useAuth = create<AuthState>((set) => ({
    phone: null,
    name: myRider.name,
    avatarUrl: '',
    vehicleType: 'bike',
    vehicle: myRider.vehicle,
    vehicleNo: myRider.vehicleNo,
    locationGranted: false,
    onboarded: false,
    profileComplete: false,
    payout: null,
    personal: EMPTY_PERSONAL,
    setPhone: (p) => set({ phone: p }),
    setName: (n) => set({ name: n }),
    setAvatarUrl: (u) => set({ avatarUrl: u }),
    setOnboarded: (v) => set({ onboarded: v }),
    setVehicleProfile: (t, no) => set({
        vehicleType: t,
        vehicle: VEHICLE_LABEL[t],
        vehicleNo: no.toUpperCase(),
        profileComplete: true,
    }),
    setLocationGranted: (v) => set({ locationGranted: v }),
    setPayout: (p) => set({
        payout: {
            ...p,
            accountHolder: p.accountHolder.trim(),
            accountNumber: p.accountNumber.replace(/\s+/g, ''),
            ifsc: p.ifsc.toUpperCase().trim(),
            bankName: p.bankName.trim(),
            upiId: p.upiId?.trim() || undefined,
        },
    }),
    setPersonal: (p) => set({
        personal: {
            email: p.email.trim(),
            dob: p.dob.trim(),
            gender: p.gender,
            address: p.address.trim(),
            city: p.city.trim(),
            pincode: p.pincode.trim(),
            emergencyName: p.emergencyName.trim(),
            emergencyPhone: p.emergencyPhone.trim(),
        },
    }),
    signOut: () => set({ phone: null, avatarUrl: '', profileComplete: false, locationGranted: false, payout: null, personal: EMPTY_PERSONAL }),
}));

// Format an account number as e.g. "HDFC ••• 4421"
export function formatPayoutLabel(p: PayoutDetails | null): string | null {
    if (!p) return null;
    const last4 = p.accountNumber.slice(-4);
    const bank = p.bankName.split(' ')[0].toUpperCase();
    return `${bank} ••• ${last4}`;
}
