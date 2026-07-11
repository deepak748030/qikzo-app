import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, Input, InfiniteSentinel, Modal, TableSkeleton, Textarea } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { Images, Plus, Trash2, MapPin, ImageOff } from 'lucide-react';

/**
 * Promo banners CRUD for the customer app home screen carousel.
 * Mirrors the coupons pattern: infinite list + modal form + destructive confirm.
 */
type Banner = {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  address?: string;
  imageUrl?: string;
  coord: { lat: number; lng: number };
  active?: boolean;
  order?: number;
};

type Form = {
  slug: string;
  title: string;
  subtitle: string;
  address: string;
  imageUrl: string;
  lat: string;
  lng: string;
  order: string;
  active: boolean;
};

const emptyForm: Form = {
  slug: '',
  title: '',
  subtitle: '',
  address: '',
  imageUrl: '',
  lat: '',
  lng: '',
  order: '0',
  active: true,
};

export default function BannersPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Banner>('/admin/banners');
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle || '',
      address: b.address || '',
      imageUrl: b.imageUrl || '',
      lat: String(b.coord?.lat ?? ''),
      lng: String(b.coord?.lng ?? ''),
      order: String(b.order ?? 0),
      active: b.active !== false,
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const lat = Number(form.lat);
      const lng = Number(form.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Enter valid coordinates');

      const payload: any = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        address: form.address.trim(),
        imageUrl: form.imageUrl.trim(),
        coord: { lat, lng },
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
      key: 'coord',
      header: 'Location',
      render: b => (
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {b.coord ? `${b.coord.lat.toFixed(4)}, ${b.coord.lng.toFixed(4)}` : '—'}
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
                {form.subtitle || 'Subtitle'} · {form.lat || '—'}, {form.lng || '—'}
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

          <div>
            <label className="text-sm font-medium block mb-1">Image URL</label>
            <Input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Latitude</label>
              <Input required inputMode="decimal" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="28.6139" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Longitude</label>
              <Input required inputMode="decimal" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} placeholder="77.2090" />
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
