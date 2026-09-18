import { useState } from 'react';
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
import { Plus, Store, Trash2, UtensilsCrossed, X, Star } from 'lucide-react';

/**
 * Banner Management → Stores.
 *
 * The merchant master that Food/Grocery banners point at. Without entries here
 * the banner form's multi-select has nothing to offer, so this page comes
 * first in the admin flow.
 */
type Store = {
  _id: string;
  slug: string;
  name: string;
  kind: 'restaurant' | 'store';
  categorySlug?: string;
  description?: string;
  imageUrl?: string;
  address?: string;
  coord?: { lat: number | null; lng: number | null } | null;
  hours?: { day: string; open: string; close: string }[];
  offers?: { title: string; detail: string; active: boolean }[];
  menu?: { imageUrl?: string; items?: { name: string; price: number | null; category: string; veg: boolean | null }[] };
  ratingSummary?: { avg: number; count: number; source: 'manual' | 'computed' };
  active?: boolean;
  order?: number;
};

type HourRow = { day: string; open: string; close: string };
type OfferRow = { title: string; detail: string; active: boolean };
type ItemRow = { name: string; price: string; category: string; veg: string };

type Form = {
  slug: string;
  name: string;
  kind: 'restaurant' | 'store';
  categorySlug: string;
  description: string;
  imageUrl: string;
  address: string;
  lat: string;
  lng: string;
  hours: HourRow[];
  offers: OfferRow[];
  menuImageUrl: string;
  items: ItemRow[];
  ratingAvg: string;
  ratingCount: string;
  order: string;
  active: boolean;
};

const emptyForm: Form = {
  slug: '', name: '', kind: 'restaurant', categorySlug: 'food', description: '', imageUrl: '',
  address: '', lat: '', lng: '', hours: [], offers: [], menuImageUrl: '', items: [],
  ratingAvg: '', ratingCount: '', order: '0', active: true,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export default function StoresPage() {
  const [kindFilter, setKindFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Store | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Store | null>(null);
  const [busy, setBusy] = useState(false);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Store>(
    '/admin/stores',
    kindFilter ? { kind: kindFilter } : {},
  );
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, kind: kindFilter === 'store' ? 'store' : 'restaurant', categorySlug: kindFilter === 'store' ? 'groceries' : 'food' });
    setShowForm(true);
  };

  const openEdit = (s: Store) => {
    setEditing(s);
    setForm({
      slug: s.slug,
      name: s.name,
      kind: s.kind,
      categorySlug: s.categorySlug || (s.kind === 'store' ? 'groceries' : 'food'),
      description: s.description || '',
      imageUrl: s.imageUrl || '',
      address: s.address || '',
      lat: s.coord?.lat != null ? String(s.coord.lat) : '',
      lng: s.coord?.lng != null ? String(s.coord.lng) : '',
      hours: (s.hours || []).map(h => ({ day: h.day, open: h.open || '', close: h.close || '' })),
      offers: (s.offers || []).map(o => ({ title: o.title, detail: o.detail || '', active: o.active !== false })),
      menuImageUrl: s.menu?.imageUrl || '',
      items: (s.menu?.items || []).map(i => ({
        name: i.name,
        price: i.price == null ? '' : String(i.price),
        category: i.category || '',
        veg: i.veg == null ? '' : i.veg ? 'veg' : 'nonveg',
      })),
      ratingAvg: s.ratingSummary?.avg ? String(s.ratingSummary.avg) : '',
      ratingCount: s.ratingSummary?.count ? String(s.ratingSummary.count) : '',
      order: String(s.order ?? 0),
      active: s.active !== false,
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!form.name.trim()) throw new Error('Name is required');
      const slug = (form.slug || slugify(form.name)).trim().toLowerCase();
      if (!/^[a-z0-9-]{2,60}$/.test(slug)) throw new Error('Slug must be 2-60 lowercase letters, numbers or dashes');

      const lat = form.lat.trim() === '' ? null : Number(form.lat);
      const lng = form.lng.trim() === '' ? null : Number(form.lng);
      if ((lat == null) !== (lng == null)) throw new Error('Enter both latitude and longitude, or neither');
      if (lat != null && lng != null && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
        throw new Error('Latitude / longitude must be numbers');
      }

      const payload: any = {
        name: form.name.trim(),
        kind: form.kind,
        categorySlug: form.categorySlug,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        address: form.address.trim(),
        coord: lat != null && lng != null ? { lat, lng } : null,
        hours: form.hours.filter(h => h.day.trim()).map(h => ({ day: h.day.trim(), open: h.open.trim(), close: h.close.trim() })),
        offers: form.offers
          .filter(o => o.title.trim())
          .map(o => ({ title: o.title.trim(), detail: o.detail.trim(), active: o.active })),
        menu: {
          imageUrl: form.menuImageUrl.trim(),
          items: form.items
            .filter(i => i.name.trim())
            .map(i => ({
              name: i.name.trim(),
              price: i.price.trim() === '' ? null : Number(i.price) || null,
              category: i.category.trim(),
              veg: i.veg === '' ? null : i.veg === 'veg',
            })),
        },
        active: form.active,
        order: Number(form.order) || 0,
      };
      // Only send a manual rating when the admin actually filled one in —
      // otherwise a computed roll-up would be overwritten with zeros.
      if (form.ratingAvg.trim() !== '' || form.ratingCount.trim() !== '') {
        payload.ratingSummary = {
          avg: Number(form.ratingAvg) || 0,
          count: Number(form.ratingCount) || 0,
        };
      }
      if (!editing) payload.slug = slug;

      if (editing) await api(`/admin/stores/${editing._id}`, { method: 'PATCH', body: payload });
      else await api('/admin/stores', { method: 'POST', body: payload });

      toast.success(editing ? 'Store updated' : 'Store created');
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
      await api(`/admin/stores/${confirmDelete._id}`, { method: 'DELETE' });
      toast.success('Store deleted');
      setConfirmDelete(null);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Store>[] = [
    {
      key: 'name',
      header: 'Store',
      primary: true,
      render: s => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-md bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
            {s.imageUrl ? (
              <img src={mediaUrl(s.imageUrl)} alt="" className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : s.kind === 'store' ? (
              <Store className="h-4 w-4 text-muted-foreground" />
            ) : (
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{s.name}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{s.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'Type',
      render: s => (
        <Badge tone={s.kind === 'store' ? 'info' : 'default'}>
          {s.kind === 'store' ? 'Grocery store' : 'Restaurant'}
        </Badge>
      ),
    },
    {
      key: 'menu',
      header: 'Menu',
      hideOnMobile: true,
      render: s => {
        const n = s.menu?.items?.length || 0;
        if (s.menu?.imageUrl && n === 0) return <span className="text-sm text-muted-foreground">Menu image</span>;
        if (n === 0) return <span className="text-sm text-muted-foreground">—</span>;
        return <span className="text-sm">{n} item{n === 1 ? '' : 's'}</span>;
      },
    },
    {
      key: 'rating',
      header: 'Rating',
      hideOnMobile: true,
      render: s => {
        const r = s.ratingSummary;
        if (!r || (!r.avg && !r.count)) return <span className="text-sm text-muted-foreground">No reviews</span>;
        return (
          <span className="text-sm inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            {r.avg.toFixed(1)}
            <span className="text-muted-foreground text-xs">({r.count}{r.source === 'manual' ? ' · manual' : ''})</span>
          </span>
        );
      },
    },
    { key: 'order', header: 'Order', hideOnMobile: true, render: s => <span className="text-sm tabular-nums">{s.order ?? 0}</span> },
    {
      key: 'active', header: 'Status',
      render: s => s.active !== false ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge>,
    },
    {
      key: 'actions', header: '', align: 'right', render: s => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEdit(s); }}>Edit</Button>
          <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setConfirmDelete(s); }}>
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
          <h1 className="text-2xl font-display font-semibold">Stores</h1>
          <p className="text-sm text-muted-foreground">
            Restaurants and grocery stores that Food / Grocery banners can target.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className="w-44">
            <option value="">All types</option>
            <option value="restaurant">Restaurants</option>
            <option value="store">Grocery stores</option>
          </Select>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> New store</Button>
        </div>
      </div>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={6} /></Card>
        : items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Store className="h-8 w-8" />}
              title="No stores yet"
              hint="Add your first restaurant or grocery store so banners have something to point at."
            />
          </Card>
        ) : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit store' : 'New store'}
        size="lg"
        footer={<>
          <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={submit as any} loading={busy}>{editing ? 'Save' : 'Create'}</Button>
        </>}
      >
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <Input required value={form.name} onChange={e => {
                const name = e.target.value;
                setForm(f => ({ ...f, name, slug: editing ? f.slug : slugify(name) }));
              }} placeholder="ABC Restaurant" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Slug</label>
              <Input value={form.slug} disabled={!!editing} onChange={e => set('slug', e.target.value)} placeholder="abc-restaurant" />
              {editing && <div className="text-[11px] text-muted-foreground mt-1">Slug is immutable after creation.</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Type</label>
              <Select value={form.kind} onChange={e => {
                const kind = e.target.value as 'restaurant' | 'store';
                setForm(f => ({ ...f, kind, categorySlug: kind === 'store' ? 'groceries' : 'food' }));
              }}>
                <option value="restaurant">Restaurant (Food)</option>
                <option value="store">Grocery store (Grocery)</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Order</label>
              <Input inputMode="numeric" value={form.order} onChange={e => set('order', e.target.value)} />
            </div>
          </div>

          <ImageField value={form.imageUrl} onChange={url => set('imageUrl', url)} label="Store image" hint="Upload a file or paste a URL" />

          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="North Indian · Pizza · Fast food" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Address</label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Connaught Place, New Delhi 110001" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Latitude</label>
              <Input inputMode="decimal" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="28.6315" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Longitude</label>
              <Input inputMode="decimal" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="77.2167" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground -mt-2">
            Used to pre-fill the customer's pickup location. Leave both empty to skip.
          </div>

          {/* Opening hours */}
          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Opening hours</div>
              <Button size="sm" variant="outline" type="button"
                onClick={() => set('hours', [...form.hours, { day: '', open: '', close: '' }])}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {form.hours.length === 0 && <div className="text-xs text-muted-foreground">No hours set.</div>}
            {form.hours.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input className="flex-1" value={h.day} placeholder="Mon-Sun"
                  onChange={e => set('hours', form.hours.map((x, j) => j === i ? { ...x, day: e.target.value } : x))} />
                <Input className="w-24" value={h.open} placeholder="11:00"
                  onChange={e => set('hours', form.hours.map((x, j) => j === i ? { ...x, open: e.target.value } : x))} />
                <Input className="w-24" value={h.close} placeholder="23:00"
                  onChange={e => set('hours', form.hours.map((x, j) => j === i ? { ...x, close: e.target.value } : x))} />
                <Button size="sm" variant="ghost" type="button"
                  onClick={() => set('hours', form.hours.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Offers */}
          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Offers</div>
              <Button size="sm" variant="outline" type="button"
                onClick={() => set('offers', [...form.offers, { title: '', detail: '', active: true }])}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {form.offers.length === 0 && <div className="text-xs text-muted-foreground">No offers.</div>}
            {form.offers.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input className="w-40" value={o.title} placeholder="20% off"
                  onChange={e => set('offers', form.offers.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <Input className="flex-1" value={o.detail} placeholder="On orders above ₹499"
                  onChange={e => set('offers', form.offers.map((x, j) => j === i ? { ...x, detail: e.target.value } : x))} />
                <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <input type="checkbox" checked={o.active}
                    onChange={e => set('offers', form.offers.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} />
                  Active
                </label>
                <Button size="sm" variant="ghost" type="button"
                  onClick={() => set('offers', form.offers.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Menu */}
          <div className="rounded-md border border-border p-3 space-y-3">
            <div className="text-sm font-medium">Menu</div>
            <ImageField value={form.menuImageUrl} onChange={url => set('menuImageUrl', url)}
              label="Menu photo (optional)" aspect="h-24" fit="contain"
              hint="A photographed menu. Customers can also see the item list below." />
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Menu items</div>
              <Button size="sm" variant="outline" type="button"
                onClick={() => set('items', [...form.items, { name: '', price: '', category: '', veg: '' }])}>
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>
            {form.items.length === 0 && <div className="text-xs text-muted-foreground">No items — the app will show “Menu not available”.</div>}
            {form.items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input className="flex-1" value={it.name} placeholder="Margherita Pizza"
                  onChange={e => set('items', form.items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <Input className="w-24" inputMode="numeric" value={it.price} placeholder="₹"
                  onChange={e => set('items', form.items.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} />
                <Input className="w-28" value={it.category} placeholder="Pizza"
                  onChange={e => set('items', form.items.map((x, j) => j === i ? { ...x, category: e.target.value } : x))} />
                <Select className="w-24" value={it.veg}
                  onChange={e => set('items', form.items.map((x, j) => j === i ? { ...x, veg: e.target.value } : x))}>
                  <option value="">—</option>
                  <option value="veg">Veg</option>
                  <option value="nonveg">Non-veg</option>
                </Select>
                <Button size="sm" variant="ghost" type="button"
                  onClick={() => set('items', form.items.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Rating */}
          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="text-sm font-medium">Rating</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Average (0–5)</label>
                <Input inputMode="decimal" value={form.ratingAvg} onChange={e => set('ratingAvg', e.target.value)} placeholder="4.5" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Review count</label>
                <Input inputMode="numeric" value={form.ratingCount} onChange={e => set('ratingCount', e.target.value)} placeholder="128" />
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Leave empty to let real customer reviews drive the rating. Filling this in pins a manual value.
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
        title="Delete store?"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="destructive" onClick={doDelete} loading={busy}>Delete</Button>
        </>}
      >
        <div className="text-sm text-muted-foreground">
          Delete <span className="font-semibold text-foreground">{confirmDelete?.name}</span>? Banners that still
          reference it cannot be removed — remove it from those banners first.
        </div>
      </Modal>
    </div>
  );
}
