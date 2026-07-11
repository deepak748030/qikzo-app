import { useMemo, useState } from 'react';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, InfiniteSentinel, TableSkeleton } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate, fmtMoney } from '@/lib/utils';
import { PackageCheck } from 'lucide-react';

type Booking = {
  _id: string;
  status: string;
  pickup?: { address?: string };
  drop?: { address?: string };
  fare?: { total?: number };
  createdAt?: string;
  customer?: { name?: string; phone?: string };
  rider?: { name?: string; phone?: string };
};

const STATUSES = ['all', 'created', 'searching', 'accepted', 'arrived', 'picked_up', 'in_progress', 'completed', 'cancelled'];

function statusTone(s: string) {
  if (s === 'completed') return 'success';
  if (s === 'cancelled') return 'danger';
  if (['searching', 'created'].includes(s)) return 'warning';
  return 'info';
}

export default function BookingsPage() {
  const [status, setStatus] = useState<string>('all');
  const query = useMemo(() => ({ status: status === 'all' ? undefined : status }), [status]);
  const { items, loading, hasMore, loadMore } = usePaginated<Booking>('/admin/bookings', query);
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const columns: Column<Booking>[] = [
    { key: 'id', header: 'Booking', render: b => (
      <div>
        <div className="font-mono text-xs text-muted-foreground">#{b._id.slice(-6)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{fmtDate(b.createdAt)}</div>
      </div>
    )},
    { key: 'route', header: 'Route', render: b => (
      <div className="max-w-xs">
        <div className="text-sm truncate">↑ {b.pickup?.address || '—'}</div>
        <div className="text-sm truncate text-muted-foreground">↓ {b.drop?.address || '—'}</div>
      </div>
    )},
    { key: 'customer', header: 'Customer', render: b => <div className="text-sm">{b.customer?.name || b.customer?.phone || '—'}</div> },
    { key: 'rider', header: 'Rider', render: b => <div className="text-sm">{b.rider?.name || b.rider?.phone || '—'}</div> },
    { key: 'fare', header: 'Fare', align: 'right', render: b => <div className="font-medium">{fmtMoney(b.fare?.total)}</div> },
    { key: 'status', header: 'Status', render: b => <Badge tone={statusTone(b.status) as any}>{b.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Bookings</h1>
        <p className="text-sm text-muted-foreground">All bookings across the platform.</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <Button key={s} size="sm" variant={status === s ? 'primary' : 'outline'} onClick={() => setStatus(s)}>
              {s.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </Card>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={6} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<PackageCheck className="h-8 w-8" />} title="No bookings" /></Card>
        : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }
    </div>
  );
}
