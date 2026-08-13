import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, Input, InfiniteSentinel, Modal, Select, TableSkeleton, Textarea } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { ImageField } from '@/components/ImageField';
import { PolygonEditor, polygonAreaKm2, useCenterFromPoints, type Point } from '@/components/PolygonEditor';
import { Images, Plus, Trash2, MapPin, ImageOff, Layers } from 'lucide-react';

/**
 * Promo banners CRUD. Pick a saved Coverage city/area so the polygon
 * is reused — no need to redraw the same city on every banner.
 */
type Category = { _id: string; slug: string; name: string; emoji?: string };

type Banner = {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  address?: string;
  imageUrl?: string;
  coord: { lat: number; lng: number };
  categoryId?: string | null;
  categorySlug?: string;
  stateId?: string;
  areaId?: string;
  stateName?: string;
  areaName?: string;
  polygon?: { coordinates: Point[][] } | null;
  active?: boolean;
  order?: number;
};

type CoverageArea = {
  _id: string;
  name: string;
  polygon?: { coordinates: Point[][] };
  coord?: { lat: number; lng: number };
};
type CoverageCity = { _id: string; name: string; areas: CoverageArea[] };

type Form = {
  slug: string;
  title: string;
  subtitle: string;
  address: string;
  imageUrl: string;
  categoryId: string;
  cityId: string;
  areaId: string;
  locationName: string;
  points: Point[];
  order: string;
  active: boolean;
};

const emptyForm: Form = {
  slug: '',
  title: '',
  subtitle: '',
  address: '',
  imageUrl: '',
  categoryId: '',
  cityId: '',
  areaId: '',
  locationName: '',
  points: [],
  order: '0',
  active: true,
};

function ringOf(area?: CoverageArea): Point[] {
  const ring = area?.polygon?.coordinates?.[0] || [];
  if (ring.length > 3) {
    const [fx, fy] = ring[0];
    const [lx, ly] = ring[ring.length - 1];
    if (fx === lx && fy === ly) return ring.slice(0, -1) as Point[];
  }
  return ring as Point[];
}

export default function BannersPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<CoverageCity[]>([]);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Banner>('/admin/banners');
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  useEffect(() => {
    void (async () => {
      try {
        const [cats, cov] = await Promise.all([
          api<{ items: Category[] }>('/admin/categories', { query: { limit: 200 } }),
          api<{ items: CoverageCity[] }>('/admin/coverage'),
        ]);
        setCategories(cats.items || []);
        setCities(cov.items || []);
      } catch (e: any) { toast.error(e?.message || 'Failed to load form data'); }
    })();
  }, []);

  const category = categories.find(c => c._id === form.categoryId);
  const selectedCity = cities.find(c => c._id === form.cityId);
  const selectedArea = selectedCity?.areas?.find(a => a._id === form.areaId);
  const mapCenter = useCenterFromPoints(form.points);

  const applyArea = (cityId: string, areaId: string) => {
    const city = cities.find(c => c._id === cityId);
    const area = city?.areas?.find(a => a._id === areaId);
    setForm(f => ({
      ...f,
      cityId,
      areaId,
      locationName: area && city ? `${area.name}, ${city.name}` : f.locationName,
      points: area ? ringOf(area) : f.points,
    }));
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (b: Banner) => {
    setEditing(b);
    const ring = b.polygon?.coordinates?.[0] || [];
    setForm({
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle || '',
      address: b.address || '',
      imageUrl: b.imageUrl || '',
      categoryId: b.categoryId ? String(b.categoryId) : '',
      cityId: b.stateId || '',
      areaId: b.areaId || '',
      locationName: b.areaName || b.stateName || '',
      points: ring.length > 3 ? (ring.slice(0, -1) as Point[]) : (ring as Point[]),
      order: String(b.order ?? 0),
      active: b.active !== false,
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!form.categoryId) throw new Error('Select a category');
      if (!form.cityId || !form.areaId) throw new Error('Select a coverage city and area');
      if (form.points.length < 3) throw new Error('Selected area has no map. Draw or pick another area.');

      // Close the polygon ring (GeoJSON requires first == last).
      const ring = [...form.points, form.points[0]];

      const payload: any = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        address: form.address.trim(),
        imageUrl: form.imageUrl.trim(),
        categoryId: form.categoryId,
        categorySlug: category?.slug || '',
        stateId: form.cityId,
        areaId: form.areaId,
        stateName: selectedCity?.name || form.locationName.trim(),
        areaName: selectedArea?.name || form.locationName.trim(),
        polygon: { type: 'Polygon', coordinates: [ring] },
        active: form.active,
        order: Number(form.order) || 0,
      };
      if (!editing) payload.slug = form.slug.trim().toLowerCase();

      if (editing) await api(`/admin/banners/${editing._id}`, { method: 'PATCH', body: payload });
      else await api('/admin/banners', { method: 'POST', body: payload });

      toast.success(editing ? 'Banner updated' : 'Banner created');
      setShowForm(false);
      await refresh();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api(`/admin/banners/${confirmDelete._id}`, { method: 'DELETE' });
      toast.success('Banner deleted');
      setConfirmDelete(null);
      await refresh();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const columns: Column<Banner>[] = [
    {
      key: 'preview',
      header: 'Banner',
      render: b => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-20 rounded-md bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
            {b.imageUrl ? (
              <img src={b.imageUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <ImageOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{b.title}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{b.slug}</div>
          </div>
        </div>
      ),
    },
    { key: 'subtitle', header: 'Subtitle', render: b => <span className="text-sm text-muted-foreground line-clamp-1">{b.subtitle || '—'}</span> },
    {
      key: 'target',
      header: 'Category / Location',
      render: b => (
        <div className="min-w-0">
          <div className="text-sm truncate">{b.categorySlug || '—'}</div>
          <div className="text-xs text-muted-foreground truncate inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {b.areaName || b.stateName || 'No location'}
          </div>
        </div>
      ),
    },
    { key: 'order', header: 'Order', render: b => <span className="text-sm tabular-nums">{b.order ?? 0}</span> },
    { key: 'active', header: 'Status', render: b => b.active !== false ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge> },
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

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Banners</h1>
          <p className="text-sm text-muted-foreground">Promo carousel shown on the customer app home screen.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New banner</Button>
      </div>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={6} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<Images className="h-8 w-8" />} title="No banners yet" hint="Add your first promo banner to feature on the home screen." /></Card>
        : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit banner' : 'New banner'}
        size="lg"
        footer={<>
          <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={submit as any} loading={busy}>{editing ? 'Save' : 'Create'}</Button>
        </>}
      >
        <form className="space-y-3" onSubmit={submit}>
          {/* Live preview */}
          <div className="relative h-28 rounded-md overflow-hidden bg-muted border border-border">
            {form.imageUrl ? (
              <img
                src={form.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
              />
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
                {form.subtitle || 'Subtitle'} · {form.locationName || 'No location'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Slug</label>
              <Input
                required
                value={form.slug}
                disabled={!!editing}
                onChange={e => setForm({ ...form, slug: e.target.value })}
                placeholder="food-market"
              />
              {editing && <div className="text-[11px] text-muted-foreground mt-1">Slug is immutable after creation.</div>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Order</label>
              <Input inputMode="numeric" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Title</label>
            <Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Weekend food market" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Subtitle</label>
            <Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Live music · Street food · Craft stalls" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Address</label>
            <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address opened when the banner is tapped" />
          </div>

          <ImageField value={form.imageUrl} onChange={url => setForm(f => ({ ...f, imageUrl: url }))} label="Banner image" hint="Upload a file or paste a URL" />

          {/* Geo targeting */}
          <div className="rounded-md border border-border p-3 space-y-3">
            <div className="text-sm font-medium flex items-center gap-1.5"><Layers className="h-4 w-4" /> Service location</div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Category</label>
              <Select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>)}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">City</label>
                <Select
                  value={form.cityId}
                  onChange={e => setForm(f => ({ ...f, cityId: e.target.value, areaId: '', points: [], locationName: '' }))}
                >
                  <option value="">Select city</option>
                  {cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Area</label>
                <Select
                  value={form.areaId}
                  disabled={!form.cityId}
                  onChange={e => applyArea(form.cityId, e.target.value)}
                >
                  <option value="">{form.cityId ? 'Select area' : 'Pick a city first'}</option>
                  {(selectedCity?.areas || []).map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </Select>
              </div>
            </div>
            {cities.length === 0 && (
              <div className="text-xs text-muted-foreground">No coverage yet. Create a city/area under Coverage first.</div>
            )}

            {form.points.length >= 3 && (
              <>
                <PolygonEditor
                  value={form.points}
                  center={mapCenter}
                  height={260}
                  onChange={pts => setForm(f => ({ ...f, points: pts }))}
                />
                <div className="text-xs text-muted-foreground">
                  {form.locationName} · {form.points.length} points · ~{polygonAreaKm2(form.points).toFixed(1)} km²
                </div>
              </>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active
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
          Delete banner <span className="font-mono font-semibold text-foreground">{confirmDelete?.slug}</span>? This removes it from the customer home screen immediately.
        </div>
      </Modal>
    </div>
  );
}
