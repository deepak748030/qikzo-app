import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, InfiniteSentinel, TableSkeleton } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate } from '@/lib/utils';
import { LifeBuoy } from 'lucide-react';

type Ticket = {
  _id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  role: 'customer' | 'rider';
  updatedAt?: string;
  createdAt?: string;
  user?: { name?: string; phone?: string };
};

function toneOf(s: string) {
  if (s === 'resolved' || s === 'closed') return 'success';
  if (s === 'pending') return 'warning';
  return 'info';
}

export default function SupportPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<'all' | 'open' | 'pending' | 'resolved' | 'closed'>('open');
  const query = useMemo(() => ({ status: status === 'all' ? undefined : status }), [status]);
  const { items, loading, hasMore, loadMore } = usePaginated<Ticket>('/admin/support', query);
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const columns: Column<Ticket>[] = [
    { key: 'subject', header: 'Subject', render: t => (
      <div>
        <div className="font-medium">{t.subject}</div>
        <div className="text-xs text-muted-foreground">#{t._id.slice(-6)}</div>
      </div>
    )},
    { key: 'user', header: 'From', render: t => (
      <div className="text-sm">
        <div>{t.user?.name || t.user?.phone || '—'}</div>
        <div className="text-xs text-muted-foreground capitalize">{t.role}</div>
      </div>
    )},
    { key: 'status', header: 'Status', render: t => <Badge tone={toneOf(t.status) as any}>{t.status}</Badge> },
    { key: 'updated', header: 'Updated', render: t => <span className="text-sm text-muted-foreground">{fmtDate(t.updatedAt || t.createdAt)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Support</h1>
        <p className="text-sm text-muted-foreground">Customer & rider support tickets.</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {(['open', 'pending', 'resolved', 'closed', 'all'] as const).map(s => (
            <Button key={s} size="sm" variant={status === s ? 'primary' : 'outline'} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </Card>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={4} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<LifeBuoy className="h-8 w-8" />} title="No tickets" /></Card>
        : <>
            <DataTable columns={columns} rows={items} onRowClick={t => nav(`/support/${t._id}`)} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }
    </div>
  );
}
