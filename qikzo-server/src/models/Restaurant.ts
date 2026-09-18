import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Restaurant — the merchant master record behind the Food / Grocery banner
 * flow. One document covers both flavours via `kind`:
 *
 *   kind: 'restaurant'  → Food tab      (categorySlug 'food')
 *   kind: 'store'       → Grocery tab   (categorySlug 'groceries')
 *
 * Why a new collection instead of reusing `Category`/`CoverageCity`: those
 * model *service geography* (State → Area polygons), while a banner needs to
 * point at named merchants with a menu and offers. Nothing in the existing
 * catalog reads this collection, so the promo-banner flow is untouched.
 */

const HoursSchema = new Schema(
    {
        day: { type: String, required: true, trim: true },      // "Mon-Sun"
        open: { type: String, default: '' },                    // "11:00"
        close: { type: String, default: '' },                   // "23:00"
    },
    { _id: false },
);

const OfferSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        detail: { type: String, default: '' },
        active: { type: Boolean, default: true },
    },
    { _id: false },
);

const MenuItemSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        price: { type: Number, default: null },
        category: { type: String, default: '' },                // "Pizza", "Drinks"
        veg: { type: Boolean, default: null },                  // null = unspecified
    },
    { _id: false },
);

const MenuSchema = new Schema(
    {
        // A photographed menu, same idea as PromoBanner.menuImageUrl. Both
        // formats are supported; the customer app renders whichever exists.
        imageUrl: { type: String, default: '' },
        items: { type: [MenuItemSchema], default: [] },
    },
    { _id: false },
);

const RestaurantSchema = new Schema(
    {
        slug: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true, trim: true },
        kind: { type: String, enum: ['restaurant', 'store'], default: 'restaurant', index: true },
        // Tab affinity — used to resolve "ALL" banners to the right merchants.
        categorySlug: { type: String, default: '', index: true },
        description: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        address: { type: String, default: '' },
        coord: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        hours: { type: [HoursSchema], default: [] },
        offers: { type: [OfferSchema], default: [] },
        menu: { type: MenuSchema, default: () => ({}) },
        // Day-1 stars. `computed` is written by the review roll-up once real
        // order reviews exist for this store; `manual` is admin-entered.
        ratingSummary: {
            avg: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0, min: 0 },
            source: { type: String, enum: ['manual', 'computed'], default: 'manual' },
        },
        active: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

RestaurantSchema.index({ name: 'text', description: 'text' });
RestaurantSchema.index({ kind: 1, active: 1, order: 1 });

export type RestaurantDoc = InferSchemaType<typeof RestaurantSchema> & { _id: any };
export const Restaurant = model<RestaurantDoc>('Restaurant', RestaurantSchema);
export default Restaurant;
