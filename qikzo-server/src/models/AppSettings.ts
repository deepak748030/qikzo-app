import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

/**
 * AppSettings — feature flags + tunables per audience (customer / rider). All
 * mobile clients pull this on cold start and treat as a hot config document.
 * Distinct from `Settings` (maintenance-mode singleton).
 *
 * Legal copy (privacy policy, T&Cs, about) and FAQs live here too so we can
 * edit them without shipping a new app version (see AUDIT.md §1.3).
 */
const AppSettingsSchema = new Schema(
    {
        audience: { type: String, enum: ['customer', 'rider'], required: true, unique: true, index: true },
        minSupportedVersion: { type: String, default: '' },
        forceUpdate: { type: Boolean, default: false },
        supportPhone: { type: String, default: '' },
        supportEmail: { type: String, default: '' },
        // Feature toggles
        features: {
            wallet: { type: Boolean, default: true },
            coupons: { type: Boolean, default: true },
            chat: { type: Boolean, default: false },
            liveTracking: { type: Boolean, default: true },
        },
        // Content
        faqs: [
            {
                _id: false,
                q: { type: String, required: true },
                a: { type: String, required: true },
            },
        ],
        legal: {
            privacyPolicy: { type: String, default: '' },
            termsConditions: { type: String, default: '' },
            aboutUs: { type: String, default: '' },
        },
    },
    { timestamps: true }
);

interface AppSettingsStatics {
    getFor(audience: 'customer' | 'rider'): Promise<AppSettingsDoc>;
}
export type AppSettingsDoc = InferSchemaType<typeof AppSettingsSchema> & { _id: any };

AppSettingsSchema.statics.getFor = async function (audience: 'customer' | 'rider') {
    let s = await this.findOne({ audience });
    if (!s) s = await this.create({ audience });
    return s;
};

export const AppSettings = model<AppSettingsDoc, Model<AppSettingsDoc> & AppSettingsStatics>(
    'AppSettings',
    AppSettingsSchema
);
export default AppSettings;
