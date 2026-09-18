import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { StoreMultiSelect, type StoreOption } from '@/components/StoreMultiSelect';
import { Images, Plus, Trash2, ImageOff, Store, ExternalLink } from 'lucide-react';

/**
 * Banner Management — Food / Grocery banners shown as a vertical list inside
 * the customer app's Food and Grocery screens.
 *
 * Deliberately separate from the existing "Banners" page: those are the
 * geo-targeted home-carousel promos. Nothing here reads or writes that
 * collection, so the home screen is unaffected.
 */
type Banner = {
  _id: string;
  title: string;
  type: 'food' | 'grocery';
  imageUrl?: string;
  description?: string;
  storeIds: string[];
  storeNames: string[];
  storeIdsEmpty: boolean;
  allStores: boolean;
  storeCount: number;
  active?: boolean;
  order?: number;
};

type Form = {
  title: string;
  type: 'food' | 'grocery';
  imageUrl: string;
  description: string;
  storeIds: string[];
  order: string;
  active: boolean;
};

const emptyForm: Form = {
  title: '', type: 'food', imageUrl: '', description: '', storeIds: [], order: '0', active: true,
};

const TYPE_LABEL: Record<Banner['type'], string> = { food: 'Food', grocery: 'Grocery' };

export default function BannerManagementPage() {
  const nav = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Banner>(
    '/admin/category-banners',
    typeFilter ? { type: typeFilter } : {},
  );
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  // The multi-select only ever shows merchants matching the banner's type, so
  // it is refetched whenever the type changes.
  useEffect(() => {
    if (!showForm) return;
    let alive = true;
    setStoresLoading(true);
    api<{ items: StoreOption[] }>('/admin/stores/options', {
      query: form.type === 'grocery' ? { kind: 'store' } : { kind: 'restaurant' },
    })
      .then(r => { if (alive) setStoreOptions(r.items || []); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load stores'))
      .finally(() => { if (alive) setStoresLoading(false); });
    return () => { alive = false; };
  }, [showForm, form.type]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, type: (typeFilter === 'grocery' ? 'grocery' : 'food') as Banner['type'] });
    setShowForm(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      type: b.type,
      imageUrl: b.imageUrl || '',
      description: b.description || '',
      storeIds: b.storeIds || [],
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

      const payload: any = {
        title: form.title.trim(),
        type: form.type,
        imageUrl: form.imageUrl.trim(),
        description: form.description.trim(),
        // Empty array is meaningful: the server reads it as "ALL merchants".
        storeIds: form.storeIds,
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
      key: 'stores',
      header: 'Applies to',
      render: b => b.storeIdsEmpty ? (
        <Badge tone="success">ALL {TYPE_LABEL[b.type].toLowerCase()} ({b.storeCount})</Badge>
      ) : (
        <div className="min-w-0">
          <div className="text-sm">{b.storeCount} selected</div>
          <div className="text-xs text-muted-foreground truncate">{(b.storeNames || []).join(', ')}</div>
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
          <h1 className="text-2xl font-display font-semibold">Banner Management</h1>
          <p className="text-sm text-muted-foreground">
            Banners listed vertically inside the customer app's Food and Grocery screens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-40">
            <option value="">All types</option>
            <option value="food">Food</option>
            <option value="grocery">Grocery</option>
          </Select>
          <Button variant="outline" onClick={() => nav('/banner-management/stores')}>
            <Store className="h-4 w-4" /> Stores
          </Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Create banner</Button>
        </div>
      </div>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={6} /></Card>
        : items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Images className="h-8 w-8" />}
              title="No banners yet"
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
              <div className="text-[11px] opacity-90 truncate">
                {TYPE_LABEL[form.type]} · {form.storeIds.length === 0
                  ? `All ${TYPE_LABEL[form.type].toLowerCase()} merchants`
                  : `${form.storeIds.length} selected`}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Banner image</label>
            <ImageField value={form.imageUrl} onChange={url => set('imageUrl', url)} label="" hint="Upload a file or paste a URL" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Banner title</label>
            <Input required value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Weekend Food Offer" maxLength={140} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Banner type</label>
              <Select
                value={form.type}
                onChange={e => {
                  const type = e.target.value as Banner['type'];
                  // A Food banner may not keep grocery selections (the server
                  // would reject the mix), so the list resets with the type.
                  setForm(f => ({ ...f, type, storeIds: [] }));
                }}
              >
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">
                Select {form.type === 'grocery' ? 'stores' : 'restaurants'}
              </label>
              {storeOptions.length === 0 && !storesLoading && (
                <Link to="/banner-management/stores"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                  Add stores <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            <StoreMultiSelect
              options={storeOptions}
              value={form.storeIds}
              onChange={ids => set('storeIds', ids)}
              typeLabel={form.type === 'grocery' ? 'grocery stores' : 'restaurants'}
              loading={storesLoading}
            />
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
