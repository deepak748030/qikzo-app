import CoverageCity from '../models/Coverage';
import { errors } from '../lib/errors';

type Coord = [number, number];

function normalizePolygon(input: any): { type: 'Polygon'; coordinates: Coord[][]; coord: { lat: number; lng: number } } {
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
        return [lng, lat] as Coord;
    });
    if (ring.length < 3) throw errors.badRequest('Polygon needs at least 3 points', 'POLYGON_MIN_POINTS');
    const [fx, fy] = ring[0];
    const [lx, ly] = ring[ring.length - 1];
    if (fx !== lx || fy !== ly) ring.push([fx, fy]);
    const uniq = ring.slice(0, -1);
    return {
        type: 'Polygon',
        coordinates: [ring],
        coord: {
            lat: uniq.reduce((s, p) => s + p[1], 0) / uniq.length,
            lng: uniq.reduce((s, p) => s + p[0], 0) / uniq.length,
        },
    };
}

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `city-${Date.now()}`;

async function getOr404(id: string) {
    const doc = await CoverageCity.findById(id);
    if (!doc) throw errors.notFound('City not found', 'CITY_NOT_FOUND');
    return doc;
}

export const coverageService = {
    async list() {
        const items = await CoverageCity.find({}).sort({ name: 1 }).lean();
        return { items };
    },

    async createCity(input: { name: string; slug?: string; active?: boolean }) {
        const name = String(input?.name || '').trim();
        if (!name) throw errors.badRequest('City name required', 'NAME_REQUIRED');
        const slug = (input.slug || slugify(name)).toLowerCase();
        const exists = await CoverageCity.findOne({ slug });
        if (exists) throw errors.conflict('City slug already exists', 'SLUG_TAKEN');
        return CoverageCity.create({ name, slug, active: input.active !== false, areas: [] });
    },

    async updateCity(id: string, input: { name?: string; active?: boolean }) {
        const doc = await getOr404(id);
        if (typeof input.name === 'string' && input.name.trim()) doc.name = input.name.trim();
        if (typeof input.active === 'boolean') doc.active = input.active;
        await doc.save();
        return doc;
    },

    async removeCity(id: string) {
        const r = await CoverageCity.findByIdAndDelete(id);
        if (!r) throw errors.notFound('City not found', 'CITY_NOT_FOUND');
    },

    async addArea(cityId: string, input: { name: string; polygon: any; active?: boolean }) {
        const name = String(input?.name || '').trim();
        if (!name) throw errors.badRequest('Area name required', 'AREA_NAME_REQUIRED');
        const doc = await getOr404(cityId);
        const poly = normalizePolygon(input.polygon);
        (doc.areas as any).push({
            name,
            active: input.active !== false,
            polygon: { type: 'Polygon', coordinates: poly.coordinates },
            coord: poly.coord,
        });
        await doc.save();
        return doc;
    },

    async updateArea(cityId: string, areaId: string, input: { name?: string; polygon?: any; active?: boolean }) {
        const doc = await getOr404(cityId);
        const area: any = (doc.areas as any).id(areaId);
        if (!area) throw errors.notFound('Area not found', 'AREA_NOT_FOUND');
        if (typeof input.name === 'string' && input.name.trim()) area.name = input.name.trim();
        if (typeof input.active === 'boolean') area.active = input.active;
        if (input.polygon) {
            const poly = normalizePolygon(input.polygon);
            area.polygon = { type: 'Polygon', coordinates: poly.coordinates };
            area.coord = poly.coord;
        }
        await doc.save();
        return doc;
    },

    async removeArea(cityId: string, areaId: string) {
        const doc = await getOr404(cityId);
        const area: any = (doc.areas as any).id(areaId);
        if (!area) throw errors.notFound('Area not found', 'AREA_NOT_FOUND');
        area.deleteOne();
        await doc.save();
        return doc;
    },
};

export default coverageService;
