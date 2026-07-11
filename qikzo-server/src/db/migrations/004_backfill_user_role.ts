import User from '../../models/User';
import type { MigrationDef } from '../migrator';

/**
 * 004 — Backfill the new `role` field on existing User rows so requireRole()
 * middleware works from day one. Every pre-existing user is a customer; rider
 * User rows will be created explicitly in Phase 4.1.
 */
const migration: MigrationDef = {
    name: '004_backfill_user_role',
    async up() {
        await User.updateMany(
            { role: { $exists: false } },
            { $set: { role: 'customer' } }
        );
    },
};

export default migration;
