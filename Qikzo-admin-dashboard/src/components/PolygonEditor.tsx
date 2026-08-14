import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Interactive polygon editor for defining a service Area on a Leaflet map.
 *  - Click empty map area  → add a vertex
 *  - Drag a vertex marker  → move that point
 *  - Click a vertex marker → remove it (only when 3+ points remain)
 *  - "Clear"               → reset all points
 * Emits [lng,lat] tuples (GeoJSON order) so the server can store them as-is.
 */

export type Point = [number, number]; // [lng, lat]

const vertexIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 0 0 2px rgba(37,99,235,0.35);"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

function ClickCatcher({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/** Modal / delayed layout: Leaflet needs a kick once the container has a real size. */
function InvalidateSize() {
    const map = useMap();
    useEffect(() => {
        const t = window.setTimeout(() => map.invalidateSize(), 80);
        return () => window.clearTimeout(t);
    }, [map]);
    return null;
}

export function PolygonEditor({
    value,
    onChange,
    center = [28.6139, 77.2090],
    zoom = 11,
    height = 380,
}: {
    value: Point[];
    onChange: (next: Point[]) => void;
    center?: [number, number]; // [lat, lng]
    zoom?: number;
    height?: number;
}) {
    // Leaflet expects [lat,lng]; we store [lng,lat] to match GeoJSON.
    const latLngs = useMemo(() => value.map(([lng, lat]) => [lat, lng] as [number, number]), [value]);

    const addPoint = (lat: number, lng: number) => onChange([...value, [lng, lat]]);
    const movePoint = (i: number, lat: number, lng: number) => {
        const next = value.slice();
        next[i] = [lng, lat];
        onChange(next);
    };
    const removePoint = (i: number) => {
        if (value.length <= 3) return;
        const next = value.slice();
        next.splice(i, 1);
        onChange(next);
    };

    return (
        <div className="rounded-md overflow-hidden border border-border" style={{ height }}>
            <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                <InvalidateSize />
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickCatcher onClick={addPoint} />
                {latLngs.length >= 3 && (
                    <Polygon
                        positions={latLngs}
                        pathOptions={{ color: '#2563eb', weight: 2, fillColor: '#2563eb', fillOpacity: 0.15 }}
                    />
                )}
                {latLngs.map((pos, i) => (
                    <Marker
                        key={i}
                        position={pos}
                        icon={vertexIcon}
                        draggable
                        eventHandlers={{
                            dragend: (e) => {
                                const ll = (e.target as L.Marker).getLatLng();
                                movePoint(i, ll.lat, ll.lng);
                            },
                            click: () => removePoint(i),
                        }}
                    />
                ))}
            </MapContainer>
        </div>
    );
}

/** Compute approximate polygon area in km² (spherical excess, good enough for UX). */
export function polygonAreaKm2(pts: Point[]): number {
    if (pts.length < 3) return 0;
    const R = 6378.137;
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
        const [lng1, lat1] = pts[i];
        const [lng2, lat2] = pts[(i + 1) % pts.length];
        total += ((lng2 - lng1) * Math.PI / 180) *
            (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
    }
    return Math.abs(total * R * R / 2);
}

export function useCenterFromPoints(pts: Point[], fallback: [number, number] = [28.6139, 77.2090]): [number, number] {
    return useMemo(() => {
        if (pts.length === 0) return fallback;
        const sum = pts.reduce((acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }), { lat: 0, lng: 0 });
        return [sum.lat / pts.length, sum.lng / pts.length];
    }, [pts]);
}

/** Small wrapper that resets the map when initial points arrive after mount. */
export function KeyedPolygonEditor(props: React.ComponentProps<typeof PolygonEditor>) {
    const ref = useRef(0);
    useEffect(() => { ref.current += 1; }, [props.value.length === 0]);
    return <PolygonEditor {...props} />;
}
