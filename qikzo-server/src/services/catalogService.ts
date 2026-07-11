import Category from '../models/Category';
import PromoBanner from '../models/PromoBanner';

export const catalogService = {
    listCategories: () => Category.find({ active: true }).sort({ order: 1 }).lean(),
    listBanners: () => PromoBanner.find({ active: true }).sort({ order: 1 }).lean(),
};

export default catalogService;
