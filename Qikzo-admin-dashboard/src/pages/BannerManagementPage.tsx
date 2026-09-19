import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { mediaUrl } from '@/lib/utils';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import {
  Badge, Button, Card, EmptyState, Input, InfiniteSentinel, Modal, Select, TableSkeleton, Textarea,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { ImageField } from '@/components/ImageField';
import { Images, Plus, Trash2, ImageOff, MapPin } from 'lucide-react';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#dc2626;border:2px solid white;box-shadow:0 0 0 2px rgba(220,38,38,0.35);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Click anywhere on the map → report that point as the pickup coordinate. */
function PickOnClick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
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

/** Keeps the map centred on the typed coordinate when it changes. */
function FlyTo({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }, [lat, lng, map]);
  return null;
}

/** Free OpenStreetMap picker — click to drop the pickup pin. */
function CoordPicker({ lat, lng, onPick }: { lat: string; lng: string; onPick: (lat: number, lng: number) => void }) {
  const la = Number(lat), ln = Number(lng);
  const has = lat.trim() !== '' && lng.trim() !== '' && Number.isFinite(la) && Number.isFinite(ln);
  const center: [number, number] = has ? [la, ln] : [28.6139, 77.209];
  return (
    <div className="h-64 rounded-md overflow-hidden border border-border">
      <MapContainer center={center} zoom={has ? 14 : 5} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <InvalidateSize />
        <FlyTo lat={has ? la : null} lng={has ? ln : null} />
        <PickOnClick onPick={onPick} />
        {has && <Marker position={[la, ln]} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}

/**
 * Banner Management — Food / Grocery banners shown as a vertical list inside
 * the customer app's Food and Grocery screens.
 *
 * Deliberately separate from the existing "Banners" page: those are the
 * geo-targeted home-carousel promos. Nothing here reads or writes that
 * collection, so the home screen is unaffected.
 *
 * A banner is simply an image + title + type + the coordinate that becomes
 * the customer's pickup location when they open it.
 */
type Banner = {
  _id: string;
  title: string;
  type: 'food' | 'grocery';
  imageUrl?: string;
  description?: string;
  address?: string;
  /**
   * Banners written before the coordinate became mandatory (and anything the
   * server stored before validation was tightened) can carry a `coord` object
   * whose lat/lng are null, so the members are nullable on purpose.
   */
  coord?: { lat: number | null; lng: number | null } | null;
  active?: boolean;
  order?: number;
};

type Form = {
  title: string;
  type: 'food' | 'grocery';
  imageUrl: string;
  description: string;
  address: string;
  lat: string;
  lng: string;
  order: string;
  active: boolean;
};

const emptyForm: Form = {
  title: '', type: 'food', imageUrl: '', description: '', address: '', lat: '', lng: '', order: '0', active: true,
};

const TYPE_LABEL: Record<Banner['type'], string> = { food: 'Food', grocery: 'Grocery' };

/**
 * A banner only has a usable pickup point when BOTH numbers survive. Legacy
 * rows can hold `coord: { lat: null, lng: null }`, which is a truthy object —
 * testing the object alone is not enough, so check the members.
 */
const formatCoord = (coord?: Banner['coord']) => {
  const lat = coord?.lat;
  const lng = coord?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return 'No coordinate';
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'No coordinate';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

export default function BannerManagementPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Banner>(
    '/admin/category-banners',
    typeFilter ? { type: typeFilter } : {},
  );
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, type: typeFilter === 'grocery' ? 'grocery' : 'food' });
    setShowForm(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      type: b.type,
      imageUrl: b.imageUrl || '',
      description: b.description || '',
      address: b.address || '',
      lat: b.coord?.lat != null ? String(b.coord.lat) : '',
      lng: b.coord?.lng != null ? String(b.coord.lng) : '',
      order: String(b.order ?? 0),
      active: b.active !== false,
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!form.title.trim()) throw new Error('Title is required');
      if (!form.imageUrl.trim()) throw new Error('Banner image is required');

      const lat = Number(form.lat);
      const lng = Number(form.lng);
      if (form.lat.trim() === '' || form.lng.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Latitude and longitude are required');
      }
      if (lat < -90 || lat > 90) throw new Error('Latitude must be between -90 and 90');
      if (lng < -180 || lng > 180) throw new Error('Longitude must be between -180 and 180');

      const payload: any = {
        title: form.title.trim(),
        type: form.type,
        imageUrl: form.imageUrl.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        coord: { lat, lng },
        active: form.active,
        order: Number(form.order) || 0,
      };

      if (editing) await api(`/admin/category-banners/${editing._id}`, { method: 'PATCH', body: payload });
      else await api('/admin/category-banners', { method: 'POST', body: payload });

      toast.success(editing ? 'Banner updated' : 'Banner created');
      setShowForm(false);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api(`/admin/category-banners/${confirmDelete._id}`, { method: 'DELETE' });
      toast.success('Banner deleted');
      setConfirmDelete(null);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Banner>[] = [
    {
      key: 'preview',
      header: 'Banner',
      primary: true,
      render: b => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-20 rounded-md bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
            {b.imageUrl ? (
              <img src={mediaUrl(b.imageUrl)} alt="" className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <ImageOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{b.title}</div>
            {b.description && (
              <div className="text-xs text-muted-foreground truncate">{b.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: b => <Badge tone={b.type === 'food' ? 'warning' : 'info'}>{TYPE_LABEL[b.type]}</Badge>,
    },
    {
      key: 'pickup',
      header: 'Pickup location',
      render: b => (
        <div className="min-w-0">
          {b.address ? <div className="text-sm truncate">{b.address}</div> : null}
          <div className="text-xs text-muted-foreground truncate inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {formatCoord(b.coord)}
          </div>
        </div>
      ),
    },
    { key: 'order', header: 'Order', hideOnMobile: true, render: b => <span className="text-sm tabular-nums">{b.order ?? 0}</span> },
    {
      key: 'active', header: 'Status',
      render: b => b.active !== false ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge>,
    },
    {
      key: 'actions', header: '', align: 'right', render: b => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEdit(b); }}>Edit</Button>
          <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setConfirmDelete(b); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Shop Management</h1>
          <p className="text-sm text-muted-foreground">
            Banners listed vertically inside the customer app's Food and Grocery screens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-40">
            <option value="">All</option>
            <option value="food">Food</option>
            <option value="grocery">Grocery</option>
          </Select>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Create banner</Button>
        </div>
      </div>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={6} /></Card>
        : items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Images className="h-8 w-8" />}
              title={typeFilter ? `No ${TYPE_LABEL[typeFilter as Banner['type']]} banners yet` : 'No banners yet'}
              hint="Create a Food or Grocery banner to feature it on the customer app."
            />
          </Card>
        ) : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit banner' : 'Create banner'}
        size="lg"
        footer={<>
          <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={submit as any} loading={busy}>{editing ? 'Save' : 'Create banner'}</Button>
        </>}
      >
        <form className="space-y-3" onSubmit={submit}>
          {/* Live preview */}
          <div className="relative h-28 rounded-md overflow-hidden bg-muted border border-border">
            {form.imageUrl ? (
              <img src={mediaUrl(form.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                <ImageOff className="h-4 w-4 mr-1.5" /> No image
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 text-white">
              <div className="text-sm font-semibold truncate">{form.title || 'Banner title'}</div>
              <div className="text-[11px] opacity-90 truncate flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {form.address || 'Pickup location not set'} · {TYPE_LABEL[form.type]}
              </div>
            </div>
          </div>

          <ImageField value={form.imageUrl} onChange={url => set('imageUrl', url)} label="Banner image" hint="Upload a file or paste a URL" />

          <div>
            <label className="text-sm font-medium block mb-1">Banner title</label>
            <Input required value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Weekend Food Offer" maxLength={140} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Banner type</label>
              <Select value={form.type} onChange={e => set('type', e.target.value as Banner['type'])}>
                <option value="food">Food</option>
                <option value="grocery">Grocery</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Order</label>
              <Input inputMode="numeric" value={form.order} onChange={e => set('order', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Description (optional)</label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Flat 20% off on weekend orders" maxLength={1000} />
          </div>

          {/* Pickup location — becomes the customer's pickup point */}
          <div className="rounded-md border border-border p-3 space-y-3">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Pickup location
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Address</label>
              <Input value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="Chandni Chowk, Old Delhi 110006" maxLength={300} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Pick on map (click to set coordinates)</label>
              <CoordPicker lat={form.lat} lng={form.lng}
                onPick={(la, ln) => setForm(f => ({ ...f, lat: la.toFixed(6), lng: ln.toFixed(6) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Latitude</label>
                <Input required inputMode="decimal" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="28.6506" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Longitude</label>
                <Input required inputMode="decimal" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="77.2303" />
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              When a customer opens this banner, this point is dropped into their pickup location.
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Active
          </label>
        </form>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete banner?"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="destructive" onClick={doDelete} loading={busy}>Delete</Button>
        </>}
      >
        <div className="text-sm text-muted-foreground">
          Delete <span className="font-semibold text-foreground">{confirmDelete?.title}</span>? It disappears from
          the customer app's {confirmDelete ? TYPE_LABEL[confirmDelete.type] : ''} screen immediately.
        </div>
      </Modal>
    </div>
  );
}
