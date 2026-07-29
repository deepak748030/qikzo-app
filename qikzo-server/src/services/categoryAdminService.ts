import Category from '../models/Category';
import { errors } from '../lib/errors';
import { audit } from './auditService';

type Coord = [number, number];
type PolygonInput = { type?: 'Polygon'; coordinates: Coord[][] } | { coordinates: Coord[] };

/**
 * Accept either full GeoJSON polygon (nested array) or a flat ring of points,
 * and always store a closed GeoJSON Polygon.
 */
function normalizePolygon(input: any): { type: 'Polygon'; coordinates: Coord[][] } {
    if (!input) throw errors.badRequest('Polygon required', 'POLYGON_REQUIRED');
    let ring: Coord[];
    if (Array.isArray(input?.coordinates?.[0]?.[0])) {
        ring = input.coordinates[0];
    } else if (Array.isArray(input?.coordinates?.[0])) {
        ring = input.coordinates as Coord[];
    } else if (Array.isArray(input?.[0])) {
        ring = input as Coord[];
    } else {
        throw errors.badRequest('Invalid polygon shape', 'POLYGON_INVALID');
    }
    ring = ring.map((p) => {
        if (!Array.isArray(p) || p.length !== 2) throw errors.badRequest('Point must be [lng,lat]', 'POINT_INVALID');
        const [lng, lat] = p.map(Number) as Coord;
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw errors.badRequest('Point NaN', 'POINT_NAN');
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) throw errors.badRequest('Point out of range', 'POINT_RANGE');
        return [lng, lat] as Coord;
    });
    if (ring.length < 3) throw errors.badRequest('Polygon needs at least 3 points', 'POLYGON_MIN_POINTS');
    const [fx, fy] = ring[0]; const [lx, ly] = ring[ring.length - 1];
    if (fx !== lx || fy !== ly) ring.push([fx, fy]);
    return { type: 'Polygon', coordinates: [ring] };
}

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `cat-${Date.now()}`;

async function getOr404(id: string) {
    const doc = await Category.findById(id);
    if (!doc) throw errors.notFound('Category not found', 'CATEGORY_NOT_FOUND');
    return doc;
}

export const categoryAdminService = {
    async list(opts: { active?: boolean; q?: string; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
        const filter: any = {};
        if (opts.active !== undefined) filter.active = opts.active;
        if (opts.q) filter.name = { $regex: opts.q, $options: 'i' };
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await Category.find(filter).sort({ order: 1, _id: -1 }).limit(limit + 1).lean();
        const hasMore = items.length > limit;
        return { items: items.slice(0, limit), nextCursor: hasMore ? String(items[limit - 1]._id) : null };
    },

    async get(id: string) {
        return (await getOr404(id)).toObject();
    },

    async create(adminId: string, input: any) {
        if (!input?.name) throw errors.badRequest('Name required', 'NAME_REQUIRED');
        const slug = (input.slug || slugify(input.name)).toLowerCase();
        const exists = await Category.findOne({ slug });
        if (exists) throw errors.conflict('Slug already exists', 'SLUG_TAKEN');
        const doc = await Category.create({
            slug, name: input.name.trim(),
            emoji: input.emoji || '', hint: input.hint || '',
            order: Number(input.order) || 0,
            active: input.active !== false,
            states: [],
        });
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.create', targetType: 'category', targetId: String(doc._id) });
        return doc.toObject();
    },

    async update(adminId: string, id: string, input: any) {
        const doc = await getOr404(id);
        for (const k of ['name', 'emoji', 'hint'] as const) if (typeof input[k] === 'string') (doc as any)[k] = input[k];
        if (input.order !== undefined) doc.order = Number(input.order) || 0;
        if (typeof input.active === 'boolean') doc.active = input.active;
        await doc.save();
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.update', targetType: 'category', targetId: id });
        return doc.toObject();
    },

    async remove(adminId: string, id: string) {
        const res = await Category.findByIdAndDelete(id);
        if (!res) throw errors.notFound('Category not found', 'CATEGORY_NOT_FOUND');
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.delete', targetType: 'category', targetId: id });
        return { id };
    },

    async toggle(adminId: string, id: string) {
        const doc = await getOr404(id);
        doc.active = !doc.active;
        await doc.save();
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.toggle', targetType: 'category', targetId: id, meta: { active: doc.active } });
        return doc.toObject();
    },

    // ---------- States ----------
    async addState(adminId: string, categoryId: string, input: { name: string; active?: boolean }) {
        if (!input?.name) throw errors.badRequest('State name required', 'STATE_NAME_REQUIRED');
        const doc = await getOr404(categoryId);
        doc.states.push({ name: input.name.trim(), active: input.active !== false, areas: [] } as any);
        await doc.save();
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.state.add', targetType: 'category', targetId: categoryId, meta: { name: input.name } });
        return doc.toObject();
    },

    async updateState(adminId: string, categoryId: string, stateId: string, input: { name?: string; active?: boolean }) {
        const doc = await getOr404(categoryId);
        const st: any = (doc.states as any).id(stateId);
        if (!st) throw errors.notFound('State not found', 'STATE_NOT_FOUND');
        if (typeof input.name === 'string') st.name = input.name.trim();
        if (typeof input.active === 'boolean') st.active = input.active;
        await doc.save();
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.state.update', targetType: 'category', targetId: categoryId, meta: { stateId } });
        return doc.toObject();
    },

    async removeState(adminId: string, categoryId: string, stateId: string) {
        const doc = await getOr404(categoryId);
        const st: any = (doc.states as any).id(stateId);
        if (!st) throw errors.notFound('State not found', 'STATE_NOT_FOUND');
        st.deleteOne();
        await doc.save();
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.state.delete', targetType: 'category', targetId: categoryId, meta: { stateId } });
        return doc.toObject();
    },

    // ---------- Areas (with polygons) ----------
    async addArea(adminId: string, categoryId: string, stateId: string, input: { name: string; polygon: PolygonInput; active?: boolean }) {
        if (!input?.name) throw errors.badRequest('Area name required', 'AREA_NAME_REQUIRED');
        const doc = await getOr404(categoryId);
        const st: any = (doc.states as any).id(stateId);
        if (!st) throw errors.notFound('State not found', 'STATE_NOT_FOUND');
        const polygon = normalizePolygon(input.polygon);
        st.areas.push({ name: input.name.trim(), active: input.active !== false, polygon } as any);
        await doc.save();
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.area.add', targetType: 'category', targetId: categoryId, meta: { stateId, name: input.name, points: polygon.coordinates[0].length } });
        return doc.toObject();
    },

    async updateArea(adminId: string, categoryId: string, stateId: string, areaId: string, input: { name?: string; polygon?: PolygonInput; active?: boolean }) {
        const doc = await getOr404(categoryId);
        const st: any = (doc.states as any).id(stateId);
        if (!st) throw errors.notFound('State not found', 'STATE_NOT_FOUND');
        const area: any = st.areas.id(areaId);
        if (!area) throw errors.notFound('Area not found', 'AREA_NOT_FOUND');
        if (typeof input.name === 'string') area.name = input.name.trim();
        if (typeof input.active === 'boolean') area.active = input.active;
        if (input.polygon) area.polygon = normalizePolygon(input.polygon);
        await doc.save();
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.area.update', targetType: 'category', targetId: categoryId, meta: { stateId, areaId } });
        return doc.toObject();
    },

    async removeArea(adminId: string, categoryId: string, stateId: string, areaId: string) {
        const doc = await getOr404(categoryId);
        const st: any = (doc.states as any).id(stateId);
        if (!st) throw errors.notFound('State not found', 'STATE_NOT_FOUND');
        const area: any = st.areas.id(areaId);
        if (!area) throw errors.notFound('Area not found', 'AREA_NOT_FOUND');
        area.deleteOne();
        await doc.save();
        void audit({ actorId: adminId, actorRole: 'admin', action: 'category.area.delete', targetType: 'category', targetId: categoryId, meta: { stateId, areaId } });
        return doc.toObject();
    },
};

export default categoryAdminService;
