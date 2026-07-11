import mongoose from 'mongoose';
import Migration from '../models/Migration';
import { logger } from '../lib/logger';

export interface MigrationDef {
    name: string;
    up: () => Promise<void>;
}

/**
 * Runs every migration in `defs` exactly once, in order. Records each in the
 * `migrations` collection. Safe to invoke on every boot (Phase 5 will move
 * this behind a startup flag / one-shot job).
 */
export async function runMigrations(defs: MigrationDef[]): Promise<{ applied: string[]; skipped: string[] }> {
    const applied: string[] = [];
    const skipped: string[] = [];

    for (const def of defs) {
        const exists = await Migration.findOne({ name: def.name });
        if (exists) { skipped.push(def.name); continue; }
        const started = Date.now();
        logger.info({ migration: def.name }, 'migration:running');
        try {
            await def.up();
            await Migration.create({ name: def.name, durationMs: Date.now() - started });
            applied.push(def.name);
            logger.info({ migration: def.name, ms: Date.now() - started }, 'migration:applied');
        } catch (err) {
            logger.error({ err, migration: def.name }, 'migration:failed');
            throw err;
        }
    }

    return { applied, skipped };
}

/** Ensure every registered Mongoose model has its declared indexes built. */
export async function syncIndexes(): Promise<void> {
    const names = mongoose.modelNames();
    for (const name of names) {
        try {
            await mongoose.model(name).syncIndexes();
        } catch (err) {
            logger.warn({ err, model: name }, 'syncIndexes:failed');
        }
    }
}
