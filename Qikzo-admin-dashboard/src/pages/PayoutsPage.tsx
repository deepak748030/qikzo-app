import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, Input, InfiniteSentinel, Modal, TableSkeleton, Textarea } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate, fmtMoney } from '@/lib/utils';
import { Wallet, CheckCircle2, XCircle } from 'lucide-react';

type Payout = {
  _id: string;
  amount?: number;
  status: 'pending' | 'paid' | 'rejected';
  createdAt?: string;
  rider?: { name?: string; phone?: string };
  providerRef?: string;
};

export default function PayoutsPage() {
  const [status, setStatus] = useState<'all' | 'pending' | 'paid' | 'rejected'>('pending');
  const [active, setActive] = useState<{ row: Payout; mode: 'approve' | 'reject' } | null>(null);
  const [ref, setRef] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => ({ status: status === 'all' ? undefined : status }), [status]);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Payout>('/admin/payouts', query);
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const submit = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const path = active.mode === 'approve' ? `/admin/payouts/${active.row._id}/approve` : `/admin/payouts/${active.row._id}/reject`;
      const body = active.mode === 'approve' ? { providerRef: ref } : { reason };
      await api(path, { method: 'POST', body });
      toast.success(active.mode === 'approve' ? 'Payout marked paid' : 'Payout rejected');
      setActive(null); setRef(''); setReason('');
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const columns: Column<Payout>[] = [
    { key: 'rider', header: 'Rider', render: p => <div className="text-sm font-medium">{p.rider?.name || p.rider?.phone || '—'}</div> },
    { key: 'amount', header: 'Amount', align: 'right', render: p => <div className="font-medium">{fmtMoney(p.amount)}</div> },
    { key: 'status', header: 'Status', render: p => {
      const tone = p.status === 'paid' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning';
      return <Badge tone={tone}>{p.status}</Badge>;
    }},
    { key: 'ref', header: 'Provider ref', render: p => <span className="text-xs font-mono text-muted-foreground">{p.providerRef || '—'}</span> },
    { key: 'created', header: 'Requested', render: p => <span className="text-sm text-muted-foreground">{fmtDate(p.createdAt)}</span> },
    { key: 'actions', header: '', align: 'right', render: p => p.status !== 'pending' ? null : (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setActive({ row: p, mode: 'reject' }); }}>
          <XCircle className="h-4 w-4" /> Reject
        </Button>
        <Button size="sm" onClick={e => { e.stopPropagation(); setActive({ row: p, mode: 'approve' }); }}>
          <CheckCircle2 className="h-4 w-4" /> Mark paid
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Payouts</h1>
        <p className="text-sm text-muted-foreground">Review and settle rider payout requests.</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {(['pending', 'paid', 'rejected', 'all'] as const).map(s => (
            <Button key={s} size="sm" variant={status === s ? 'primary' : 'outline'} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </Card>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={6} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<Wallet className="h-8 w-8" />} title="No payouts" /></Card>
        : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }

      <Modal
        open={!!active}
        onClose={() => { setActive(null); setRef(''); setReason(''); }}
        title={active?.mode === 'approve' ? 'Mark payout paid' : 'Reject payout'}
        footer={<>
          <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
          <Button variant={active?.mode === 'approve' ? 'primary' : 'destructive'} onClick={submit} loading={busy}>
            {active?.mode === 'approve' ? 'Confirm paid' : 'Reject'}
          </Button>
        </>}
      >
        {active?.mode === 'approve'
          ? <Input placeholder="Provider reference / UTR (optional)" value={ref} onChange={e => setRef(e.target.value)} />
          : <Textarea placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />}
      </Modal>
    </div>
  );
}
