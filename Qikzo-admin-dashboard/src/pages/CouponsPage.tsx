import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, Input, InfiniteSentinel, Modal, TableSkeleton } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate, fmtMoney } from '@/lib/utils';
import { TicketPercent, Plus, Trash2 } from 'lucide-react';

type Coupon = {
  _id: string;
  code: string;
  discountType: 'flat' | 'percent';
  value: number;
  maxDiscount?: number;
  minOrder?: number;
  active?: boolean;
  usageLimit?: number;
  usageCount?: number;
  validFrom?: string;
  validTo?: string;
};

type Form = {
  code: string; discountType: 'flat' | 'percent'; value: string;
  maxDiscount: string; minOrder: string; usageLimit: string;
  validFrom: string; validTo: string; active: boolean;
};

const emptyForm: Form = { code: '', discountType: 'flat', value: '', maxDiscount: '', minOrder: '', usageLimit: '', validFrom: '', validTo: '', active: true };

export default function CouponsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Coupon | null>(null);
  const [busy, setBusy] = useState(false);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Coupon>('/admin/coupons');
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code, discountType: c.discountType, value: String(c.value),
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      minOrder: c.minOrder ? String(c.minOrder) : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
      validTo: c.validTo ? c.validTo.slice(0, 10) : '',
      active: c.active !== false,
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        value: Number(form.value),
        active: form.active,
      };
      if (form.maxDiscount) payload.maxDiscount = Number(form.maxDiscount);
      if (form.minOrder) payload.minOrder = Number(form.minOrder);
      if (form.usageLimit) payload.usageLimit = Number(form.usageLimit);
      if (form.validFrom) payload.validFrom = new Date(form.validFrom).toISOString();
      if (form.validTo) payload.validTo = new Date(form.validTo).toISOString();

      if (editing) await api(`/admin/coupons/${editing._id}`, { method: 'PATCH', body: payload });
      else await api('/admin/coupons', { method: 'POST', body: payload });

      toast.success(editing ? 'Coupon updated' : 'Coupon created');
      setShowForm(false);
      await refresh();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api(`/admin/coupons/${confirmDelete._id}`, { method: 'DELETE' });
      toast.success('Coupon deleted');
      setConfirmDelete(null);
      await refresh();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const columns: Column<Coupon>[] = [
    { key: 'code', header: 'Code', render: c => <span className="font-mono font-semibold">{c.code}</span> },
    { key: 'discount', header: 'Discount', render: c => (
      <div className="text-sm">
        {c.discountType === 'percent' ? `${c.value}%` : fmtMoney(c.value * 100)}
        {c.maxDiscount ? <span className="text-muted-foreground text-xs ml-1">(max {fmtMoney(c.maxDiscount * 100)})</span> : null}
      </div>
    )},
    { key: 'min', header: 'Min order', render: c => <span className="text-sm">{c.minOrder ? fmtMoney(c.minOrder * 100) : '—'}</span> },
    { key: 'usage', header: 'Usage', render: c => <span className="text-sm">{c.usageCount ?? 0}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</span> },
    { key: 'validity', header: 'Valid till', render: c => <span className="text-sm text-muted-foreground">{fmtDate(c.validTo)}</span> },
    { key: 'active', header: 'Status', render: c => c.active ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge> },
    { key: 'actions', header: '', align: 'right', render: c => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEdit(c); }}>Edit</Button>
        <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setConfirmDelete(c); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Coupons</h1>
          <p className="text-sm text-muted-foreground">Promo codes and discounts.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New coupon</Button>
      </div>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={7} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<TicketPercent className="h-8 w-8" />} title="No coupons yet" hint="Create your first promo code." /></Card>
        : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit coupon' : 'New coupon'}
        footer={<>
          <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={submit as any} loading={busy}>{editing ? 'Save' : 'Create'}</Button>
        </>}
      >
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="text-sm font-medium block mb-1">Code</label>
            <Input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="WELCOME50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Type</label>
              <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as any })}>
                <option value="flat">Flat (₹)</option>
                <option value="percent">Percent (%)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Value</label>
              <Input required inputMode="numeric" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Max discount (₹)</label>
              <Input inputMode="numeric" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Min order (₹)</label>
              <Input inputMode="numeric" value={form.minOrder} onChange={e => setForm({ ...form, minOrder: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Valid from</label>
              <Input type="date" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Valid to</label>
              <Input type="date" value={form.validTo} onChange={e => setForm({ ...form, validTo: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Usage limit</label>
            <Input inputMode="numeric" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active
          </label>
        </form>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete coupon?"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="destructive" onClick={doDelete} loading={busy}>Delete</Button>
        </>}
      >
        <div className="text-sm text-muted-foreground">
          Delete coupon <span className="font-mono font-semibold text-foreground">{confirmDelete?.code}</span>? This cannot be undone.
        </div>
      </Modal>
    </div>
  );
}
