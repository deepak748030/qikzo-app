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

SettingsSchema.statics.getSingleton = async function () {
    let s = await this.findOne({ singleton: 'app' });
    if (!s) s = await this.create({ singleton: 'app' });
    return s;
};

export const Settings = model<SettingsDoc, Model<SettingsDoc> & SettingsStatics>('Settings', SettingsSchema);
export default Settings;
