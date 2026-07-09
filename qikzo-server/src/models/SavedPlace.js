const { Schema, model } = require('mongoose');

const SavedPlaceSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        label: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        emoji: { type: String, default: '📍' },
        coord: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
    },
    { timestamps: true }
);

SavedPlaceSchema.index({ user: 1, label: 1 });

module.exports = model('SavedPlace', SavedPlaceSchema);
