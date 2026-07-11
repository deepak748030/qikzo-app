import { http } from '../client';
import type { AuthUser } from '../types';

/**
 * Server user profile endpoints.
 * These update the record backing `auth.me()`.
 */
export type UpdateMeInput = {
    name?: string;
    email?: string;
    onboarded?: boolean;
    location?: string | null;
    dob?: string;                 // DD-MM-YYYY
    gender?: 'male' | 'female' | 'other';
    address?: string;
    city?: string;
    pincode?: string;
    emergencyName?: string;
    emergencyPhone?: string;
};

export const usersApi = {
    async updateMe(input: UpdateMeInput): Promise<AuthUser> {
        const res = await http.patch<{ user: AuthUser }>('/users/me', input);
        return res.user;
    },

    async deleteMe(): Promise<void> {
        await http.delete('/users/me');
    },
};

export default usersApi;
