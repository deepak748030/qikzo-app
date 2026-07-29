import { useEffect, useMemo, useState } from 'react';
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
 * Promo banners CRUD for the customer app home screen carousel.
 * A banner is geo-targeted by picking Category → State → Area; the area's
 * polygon is drawn on the map and its centroid is stored server-side, so no
 * manual latitude/longitude entry is needed.
 */
type Area = { _id: string; name: string; active: boolean; polygon: { coordinates: Point[][] } };
type CatState = { _id: string; name: string; active: boolean; areas: Area[] };
type Category = { _id: string; slug: string; name: string; emoji?: string; imageUrl?: string; states: CatState[] };

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
  stateName?: string;
  areaId?: string;
  areaName?: string;
  polygon?: { coordinates: Point[][] } | null;
  active?: boolean;
  order?: number;
};

type Form = {
  slug: string;
  title: string;
  subtitle: string;
  address: string;
  imageUrl: string;
  categoryId: string;
  stateId: string;
  areaId: string;
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
  stateId: '',
  areaId: '',
  points: [],
  order: '0',
  active: true,
};

export default function BannersPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Banner>('/admin/banners');
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  // Categories power the Category → State → Area pickers in the form.
  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{ items: Category[] }>('/admin/categories', { query: { limit: 200 } });
        setCategories(res.items || []);
      } catch (e: any) { toast.error(e?.message || 'Failed to load categories'); }
    })();
  }, []);

  const category = useMemo(() => categories.find(c => c._id === form.categoryId), [categories, form.categoryId]);
  const state = useMemo(() => category?.states.find(s => s._id === form.stateId), [category, form.stateId]);
  const area = useMemo(() => state?.areas.find(a => a._id === form.areaId), [state, form.areaId]);
  const mapCenter = useCenterFromPoints(form.points);

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
      stateId: b.stateId || '',
      areaId: b.areaId || '',
      points: ring.length > 3 ? (ring.slice(0, -1) as Point[]) : (ring as Point[]),
      order: String(b.order ?? 0),
      active: b.active !== false,
    });
    setShowForm(true);
  };

  const pickCategory = (categoryId: string) =>
    setForm(f => ({ ...f, categoryId, stateId: '', areaId: '', points: [] }));
  const pickState = (stateId: string) =>
    setForm(f => ({ ...f, stateId, areaId: '', points: [] }));
  const pickArea = (areaId: string) => {
    const a = state?.areas.find(x => x._id === areaId);
    const ring = a?.polygon?.coordinates?.[0] || [];
    setForm(f => ({ ...f, areaId, points: ring.length > 3 ? (ring.slice(0, -1) as Point[]) : (ring as Point[]) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (form.points.length < 3) throw new Error('Pick a service area (or draw at least 3 points on the map)');

      const payload: any = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        address: form.address.trim(),
        imageUrl: form.imageUrl.trim(),
        categoryId: form.categoryId || null,
        categorySlug: category?.slug || '',
        stateId: form.stateId,
        stateName: state?.name || '',
        areaId: form.areaId,
        areaName: area?.name || '',
        polygon: { type: 'Polygon', coordinates: [form.points] },
        active: form.active,
        order: Number(form.order) || 0,
      };
      // slug is immutable after creation to keep any linked references stable.
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
      header: 'Category / Area',
      render: b => (
        <div className="min-w-0">
          <div className="text-sm truncate">{b.categorySlug || '—'}</div>
          <div className="text-xs text-muted-foreground truncate inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[b.stateName, b.areaName].filter(Boolean).join(' · ') || 'No area'}
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
        footer={<>
          <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={submit as any} loading={busy}>{editing ? 'Save' : 'Create'}</Button>
        </>}
      >
        <form className="space-y-3" onSubmit={submit}>
          {/* Live preview so the admin can see how the card will look on device */}
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
                {form.subtitle || 'Subtitle'} · {area?.name || 'No area selected'}
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Category</label>
                <Select value={form.categoryId} onChange={e => pickCategory(e.target.value)}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Location</label>
                <Select value={form.stateId} disabled={!category} onChange={e => pickState(e.target.value)}>
                  <option value="">{category ? 'Select location' : 'Pick a category first'}</option>
                  {category?.states.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Area</label>
                <Select value={form.areaId} disabled={!state} onChange={e => pickArea(e.target.value)}>
                  <option value="">{state ? 'Select area' : 'Pick a location first'}</option>
                  {state?.areas.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </Select>
              </div>
            </div>

            {category && state && state.areas.length === 0 && (
              <div className="text-xs text-muted-foreground">
                This location has no areas yet — add one from the Categories page, or draw the polygon below.
              </div>
            )}

            <PolygonEditor
              key={`${form.areaId}|${form.stateId}|${form.categoryId}`}
              value={form.points}
              center={mapCenter}
              height={300}
              onChange={pts => setForm(f => ({ ...f, points: pts }))}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{form.points.length} points · ~{polygonAreaKm2(form.points).toFixed(1)} km² · click map to add, drag to move, click a point to remove</span>
              {form.points.length > 0 && (
                <button type="button" className="hover:text-foreground underline" onClick={() => setForm(f => ({ ...f, points: [] }))}>Clear</button>
              )}
            </div>
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
