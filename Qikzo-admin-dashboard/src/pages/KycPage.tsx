import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, InfiniteSentinel, Modal, TableSkeleton, Textarea } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate, fmtPhone } from '@/lib/utils';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

type KycRow = {
  _id: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  rider?: { name?: string; phone?: string; vehicle?: string; vehicleNo?: string };
};

export default function KycPage() {
  const [status, setStatus] = useState<'all' | 'pending' | 'submitted' | 'approved' | 'rejected'>('submitted');
  const [active, setActive] = useState<{ row: KycRow; mode: 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => ({ status: status === 'all' ? undefined : status }), [status]);
  const { items, loading, hasMore, loadMore, refresh } = usePaginated<KycRow>('/admin/kyc', query);
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const submit = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const path = active.mode === 'approve' ? `/admin/kyc/${active.row._id}/approve` : `/admin/kyc/${active.row._id}/reject`;
      const body = active.mode === 'reject' ? { reason } : {};
      await api(path, { method: 'POST', body });
      toast.success(active.mode === 'approve' ? 'KYC approved' : 'KYC rejected');
      setActive(null); setReason('');
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const columns: Column<KycRow>[] = [
    { key: 'rider', header: 'Rider', render: r => (
      <div>
        <div className="font-medium">{r.rider?.name || 'Unnamed'}</div>
        <div className="text-xs text-muted-foreground">{fmtPhone(r.rider?.phone)}</div>
      </div>
    )},
    { key: 'vehicle', header: 'Vehicle', render: r => (
      <div>
        <div className="text-sm">{r.rider?.vehicle || '—'}</div>
        <div className="text-xs text-muted-foreground">{r.rider?.vehicleNo || '—'}</div>
      </div>
    )},
    { key: 'status', header: 'Status', render: r => {
      const tone = r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning';
      return <Badge tone={tone}>{r.status}</Badge>;
    }},
    { key: 'submitted', header: 'Submitted', render: r => <span className="text-sm text-muted-foreground">{fmtDate(r.submittedAt)}</span> },
    { key: 'actions', header: '', align: 'right', render: r => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setActive({ row: r, mode: 'reject' }); }} disabled={r.status === 'rejected'}>
          <XCircle className="h-4 w-4" /> Reject
        </Button>
        <Button size="sm" onClick={e => { e.stopPropagation(); setActive({ row: r, mode: 'approve' }); }} disabled={r.status === 'approved'}>
          <CheckCircle2 className="h-4 w-4" /> Approve
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">KYC Review</h1>
        <p className="text-sm text-muted-foreground">Approve or reject rider verification submissions.</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {(['submitted', 'pending', 'approved', 'rejected', 'all'] as const).map(s => (
            <Button key={s} size="sm" variant={status === s ? 'primary' : 'outline'} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </Card>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={5} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="Nothing to review" hint="No KYC entries match this filter." /></Card>
        : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }

      <Modal
        open={!!active}
        onClose={() => { setActive(null); setReason(''); }}
        title={active?.mode === 'approve' ? 'Approve KYC' : 'Reject KYC'}
        footer={<>
          <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
          <Button variant={active?.mode === 'approve' ? 'primary' : 'destructive'} onClick={submit} loading={busy}>
            {active?.mode === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </>}
      >
        {active?.mode === 'reject' ? (
          <Textarea placeholder="Reason for rejection (shown to rider)" value={reason} onChange={e => setReason(e.target.value)} />
        ) : (
          <div className="text-sm text-muted-foreground">Rider will be notified and can go online after approval.</div>
        )}
      </Modal>
    </div>
  );
}
