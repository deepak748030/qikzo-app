import User from '../models/User';
import { errors } from '../lib/errors';

export const userService = {
    async updateMe(id: string, patch: Partial<{ name: string; email: string; onboarded: boolean; location: string | null }>) {
        const clean: Record<string, unknown> = {};
        if (typeof patch.name === 'string') clean.name = patch.name.trim();
        if (typeof patch.email === 'string') clean.email = patch.email.trim().toLowerCase();
        if (typeof patch.onboarded === 'boolean') clean.onboarded = patch.onboarded;
        if (typeof patch.location === 'string' || patch.location === null) clean.location = patch.location;
        const user = await User.findByIdAndUpdate(id, clean, { new: true });
        if (!user) throw errors.notFound('User not found', 'USER_NOT_FOUND');
        return user;
    },
    async deleteMe(id: string) {
        await User.findByIdAndDelete(id);
    },
};

export default userService;
