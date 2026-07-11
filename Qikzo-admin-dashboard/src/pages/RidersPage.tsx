import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, Input, InfiniteSentinel, Modal, TableSkeleton, Textarea } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate, fmtPhone } from '@/lib/utils';
import { Search, Users, Ban, CheckCircle2 } from 'lucide-react';

type Rider = {
  _id: string;
  name?: string;
  phone?: string;
  vehicle?: string;
  vehicleNo?: string;
  kycStatus?: 'pending' | 'submitted' | 'approved' | 'rejected';
  online?: boolean;
  blocked?: boolean;
  createdAt?: string;
};

export default function RidersPage() {
  const [q, setQ] = useState('');
  const [online, setOnline] = useState<'all' | 'true' | 'false'>('all');
  const [kyc, setKyc] = useState('all');
  const [target, setTarget] = useState<Rider | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => ({
    q: q.trim() || undefined,
    online: online === 'all' ? undefined : online,
    kycStatus: kyc === 'all' ? undefined : kyc,
  }), [q, online, kyc]);

  const { items, loading, hasMore, loadMore, refresh } = usePaginated<Rider>('/admin/riders', query);
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const toggleBlock = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api(`/admin/riders/${target._id}/block`, { method: 'POST', body: { blocked: !target.blocked, reason } });
      toast.success(target.blocked ? 'Rider unblocked' : 'Rider blocked');
      setTarget(null); setReason('');
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const columns: Column<Rider>[] = [
    { key: 'name', header: 'Rider', render: r => (
      <div>
        <div className="font-medium">{r.name || 'Unnamed'}</div>
        <div className="text-xs text-muted-foreground">{fmtPhone(r.phone)}</div>
      </div>
    )},
    { key: 'vehicle', header: 'Vehicle', render: r => (
      <div>
        <div className="text-sm">{r.vehicle || '—'}</div>
        <div className="text-xs text-muted-foreground">{r.vehicleNo || '—'}</div>
      </div>
    )},
    { key: 'kyc', header: 'KYC', render: r => {
      const tone = r.kycStatus === 'approved' ? 'success' : r.kycStatus === 'rejected' ? 'danger' : 'warning';
      return <Badge tone={tone}>{r.kycStatus || 'pending'}</Badge>;
    }},
    { key: 'status', header: 'Status', render: r => (
      <div className="flex gap-1.5">
        {r.online ? <Badge tone="success">Online</Badge> : <Badge>Offline</Badge>}
        {r.blocked && <Badge tone="danger">Blocked</Badge>}
      </div>
    )},
    { key: 'created', header: 'Joined', render: r => <span className="text-sm text-muted-foreground">{fmtDate(r.createdAt)}</span> },
    { key: 'actions', header: '', align: 'right', render: r => (
      <Button size="sm" variant={r.blocked ? 'outline' : 'destructive'} onClick={e => { e.stopPropagation(); setTarget(r); }}>
        {r.blocked ? <><CheckCircle2 className="h-4 w-4" /> Unblock</> : <><Ban className="h-4 w-4" /> Block</>}
      </Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Riders</h1>
          <p className="text-sm text-muted-foreground">Manage rider access & status.</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, phone, vehicle no" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={online} onChange={e => setOnline(e.target.value as any)}>
            <option value="all">All statuses</option>
            <option value="true">Online</option>
            <option value="false">Offline</option>
          </select>
          <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={kyc} onChange={e => setKyc(e.target.value)}>
            <option value="all">All KYC</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </Card>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={6} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<Users className="h-8 w-8" />} title="No riders found" hint="Adjust filters or wait for signups." /></Card>
        : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }

      <Modal
        open={!!target}
        onClose={() => { setTarget(null); setReason(''); }}
        title={target?.blocked ? 'Unblock rider' : 'Block rider'}
        footer={<>
          <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
          <Button variant={target?.blocked ? 'primary' : 'destructive'} onClick={toggleBlock} loading={busy}>
            {target?.blocked ? 'Unblock' : 'Block'}
          </Button>
        </>}
      >
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {target?.blocked ? 'The rider will regain access to jobs.' : 'The rider will lose ability to go online and take jobs.'}
          </div>
          <Textarea placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
