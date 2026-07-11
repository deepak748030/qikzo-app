import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Migration — audit record of applied schema/data migrations. Each numbered
 * migration is idempotent and recorded here so re-running is a no-op.
 */
const MigrationSchema = new Schema(
    {
        name: { type: String, required: true, unique: true, index: true },
        appliedAt: { type: Date, default: Date.now },
        durationMs: { type: Number, default: 0 },
        checksum: { type: String, default: '' },
    },
    { timestamps: true }
);

export type MigrationDoc = InferSchemaType<typeof MigrationSchema> & { _id: any };
export const Migration = model<MigrationDoc>('Migration', MigrationSchema);
export default Migration;
