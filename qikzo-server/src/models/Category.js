const { Schema, model } = require('mongoose');

const CategorySchema = new Schema(
    {
        slug: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        emoji: { type: String, default: '' },
        hint: { type: String, default: '' },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = model('Category', CategorySchema);
