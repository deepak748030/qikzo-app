import asyncHandler from '../middleware/asyncHandler';
import userService from '../services/userService';
import { ok } from '../lib/http';

export const userController = {
    updateMe: asyncHandler(async (req, res) => {
        const user = await userService.updateMe(req.user!.id, req.body);
        return ok(res, { user }, 'Profile updated');
    }),
    deleteMe: asyncHandler(async (req, res) => {
        await userService.deleteMe(req.user!.id);
        return ok(res, {}, 'Account deleted');
    }),
};

export default userController;
