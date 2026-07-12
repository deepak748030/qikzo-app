import { Schema, model, type Model, type InferSchemaType } from 'mongoose';

/**
 * Global runtime settings — singleton document (there is always exactly one).
 * Referenced by the maintenance-mode gate in app.ts. Missing in the previous
 * codebase (silent runtime bug); this file fixes it.
 */
const SettingsSchema = new Schema(
    {
        singleton: { type: String, required: true, unique: true, default: 'app' },
        maintenanceMode: { type: Boolean, default: false },
        maintenanceMessage: { type: String, default: '' },
        minCustomerVersion: { type: String, default: '' },
        minRiderVersion: { type: String, default: '' },
        // Cancellation policy — fee applied when customer cancels after grace.
        cancellationGraceSec: { type: Number, default: 120 },        // free cancel window from booking
        cancellationFeeAfterAccept: { type: Number, default: 20 },   // ₹ once rider accepted
        cancellationFeeAfterArrive: { type: Number, default: 40 },   // ₹ once rider arriving/arrived
    },
    { timestamps: true }
);

interface SettingsStatics {
    getSingleton(): Promise<SettingsDoc>;
}
export type SettingsDoc = InferSchemaType<typeof SettingsSchema> & { _id: any };

// In-process cache for the singleton. The maintenance-mode gate hits this
// on EVERY request; without a cache that's a Mongo round-trip per request.
// 30 s TTL keeps flag flips snappy while eliminating the hot-path query.
let __cache: { doc: SettingsDoc; at: number } | null = null;
const TTL_MS = 30_000;

SettingsSchema.statics.getSingleton = async function () {
    const now = Date.now();
    if (__cache && (now - __cache.at) < TTL_MS) return __cache.doc;
    let s = (await this.findOne({ singleton: 'app' }).lean()) as unknown as SettingsDoc | null;
    if (!s) {
        const created = await this.create({ singleton: 'app' });
        s = created.toObject() as SettingsDoc;
    }
    __cache = { doc: s as SettingsDoc, at: now };
    return s as SettingsDoc;
};

// Invalidator — call from any admin write that mutates the singleton so the
// next request sees the change immediately instead of waiting for TTL.
export function invalidateSettingsCache() { __cache = null; }


export const Settings = model<SettingsDoc, Model<SettingsDoc> & SettingsStatics>('Settings', SettingsSchema);
export default Settings;
