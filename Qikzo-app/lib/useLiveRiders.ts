import { useEffect, useRef, useState } from 'react';
import { ridersApi } from './api/endpoints/riders';
import { connectSocket, subscribe } from './socket';
import { tokenStore } from './api/tokenStore';
import type { LiveRider } from '@/components/LeafletMap';

/**
 * Tracks nearby online riders in real time.
 *  - Seeds from GET /riders/nearby around the given center.
 *  - Subscribes to socket `rider:location` for live updates.
 *  - Removes riders on `rider:offline`.
 *  - Filters entries to within `radiusKm` of the current center so distant
 *    riders elsewhere in the country don't clutter the local map.
 */
export function useLiveRiders(center: { lat: number; lng: number } | null, radiusKm = 6): LiveRider[] {
  const [riders, setRiders] = useState<Record<string, LiveRider>>({});
  const centerRef = useRef(center);
  centerRef.current = center;

  // Seed from REST when center changes meaningfully. Debounced so a
  // dragged map (which fires center updates every frame) doesn't hammer
  // the server — only the final resting position triggers a fetch.
  useEffect(() => {
    if (!center) return;
    if (!tokenStore.get().accessToken) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      ridersApi.nearby(center, { radiusM: radiusKm * 1000, limit: 30 })
        .then((items) => {
          if (cancelled) return;
          const next: Record<string, LiveRider> = {};
          for (const r of items as any[]) {
            const coords = r?.currentLocation?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) continue;
            next[String(r._id)] = {
              id: String(r._id),
              lng: coords[0],
              lat: coords[1],
              vehicle: r.vehicle || '',
            };
          }
          setRiders((prev) => ({ ...prev, ...next }));
        })
        .catch(() => { /* silent — socket will still stream updates */ });
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [center?.lat, center?.lng, radiusKm]);

  // Live socket updates.
  useEffect(() => {
    if (!tokenStore.get().accessToken) return;
    try { connectSocket(); } catch {}
    const offLoc = subscribe('rider:location', (p: any) => {
      if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
      const c = centerRef.current;
      if (c) {
        // Approx distance filter — ~111km per degree lat.
        const dLat = (p.lat - c.lat) * 111;
        const dLng = (p.lng - c.lng) * 111 * Math.cos((c.lat * Math.PI) / 180);
        if (Math.sqrt(dLat * dLat + dLng * dLng) > radiusKm) return;
      }
      setRiders((prev) => ({
        ...prev,
        [String(p.id)]: { id: String(p.id), lat: p.lat, lng: p.lng, vehicle: p.vehicle || '' },
      }));
    });
    const offOff = subscribe('rider:offline', (p: any) => {
      if (!p?.id) return;
      setRiders((prev) => {
        if (!prev[p.id]) return prev;
        const { [p.id]: _drop, ...rest } = prev;
        return rest;
      });
    });
    return () => { offLoc(); offOff(); };
  }, [radiusKm]);

  return Object.values(riders);
}
