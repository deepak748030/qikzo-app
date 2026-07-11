import User from '../models/User';
import { errors } from '../lib/errors';

type UpdatePatch = Partial<{
    name: string; email: string; onboarded: boolean; location: string | null;
    dob: string; gender: 'male' | 'female' | 'other';
    address: string; city: string; pincode: string;
    emergencyName: string; emergencyPhone: string;
}>;

export const userService = {
    async updateMe(id: string, patch: UpdatePatch) {
        const clean: Record<string, unknown> = {};
        if (typeof patch.name === 'string') clean.name = patch.name.trim();
        if (typeof patch.email === 'string') clean.email = patch.email.trim().toLowerCase();
        if (typeof patch.onboarded === 'boolean') clean.onboarded = patch.onboarded;
        if (typeof patch.location === 'string' || patch.location === null) clean.location = patch.location;
        if (typeof patch.dob === 'string') clean.dob = patch.dob.trim();
        if (typeof patch.gender === 'string') clean.gender = patch.gender;
        if (typeof patch.address === 'string') clean.address = patch.address.trim();
        if (typeof patch.city === 'string') clean.city = patch.city.trim();
        if (typeof patch.pincode === 'string') clean.pincode = patch.pincode.trim();
        if (typeof patch.emergencyName === 'string') clean.emergencyName = patch.emergencyName.trim();
        if (typeof patch.emergencyPhone === 'string') clean.emergencyPhone = patch.emergencyPhone.trim();
        const user = await User.findByIdAndUpdate(id, clean, { new: true });
        if (!user) throw errors.notFound('User not found', 'USER_NOT_FOUND');
        return user;
    },
    async deleteMe(id: string) {
        await User.findByIdAndDelete(id);
    },
};

export default userService;
