import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, InfiniteSentinel, TableSkeleton } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate, fmtRupees } from '@/lib/utils';
import { Eye, PackageCheck } from 'lucide-react';

type Person = { name?: string; phone?: string };
type Booking = {
  _id: string;
  code?: string;
  status: string;
  mode?: string;
  pickup?: { address?: string };
  extraPickups?: { address?: string }[];
  drop?: { address?: string };
  price?: number;
  fare?: { total?: number };
  createdAt?: string;
  customer?: Person;
  user?: Person;
  rider?: Person;
};

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'Scheduled', label: 'Scheduled' },
  { id: 'Searching rider', label: 'Searching' },
  { id: 'Rider accepted', label: 'Accepted' },
  { id: 'Arriving for pickup', label: 'Arriving' },
  { id: 'Picked up', label: 'Picked up' },
  { id: 'On the way', label: 'On the way' },
  { id: 'Delivered', label: 'Delivered' },
  { id: 'Cancelled', label: 'Cancelled' },
];

function statusTone(s: string) {
  if (s === 'Delivered' || s === 'completed') return 'success';
  if (s === 'Cancelled' || s === 'cancelled') return 'danger';
  if (['Searching rider', 'Scheduled', 'searching', 'created'].includes(s)) return 'warning';
  return 'info';
}

export default function BookingsPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<string>('all');
  const query = useMemo(() => ({ status: status === 'all' ? undefined : status }), [status]);
  const { items, loading, hasMore, loadMore } = usePaginated<Booking>('/admin/bookings', query);
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const open = (b: Booking) => nav(`/bookings/${b._id}`);

  const columns: Column<Booking>[] = [
    { key: 'id', header: 'Booking', primary: true, render: b => (
      <div>
        <div className="font-mono text-xs font-medium">{b.code || `#${b._id.slice(-6)}`}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{fmtDate(b.createdAt)}</div>
      </div>
    )},
    { key: 'route', header: 'Route', render: b => (
      <div className="max-w-xs">
        <div className="text-sm truncate">↑ {b.pickup?.address || '—'}</div>
        {(b.extraPickups || []).map((p, i) => (
          <div key={i} className="text-xs truncate text-muted-foreground">↑ Pickup {i + 2} {p.address || '—'}</div>
        ))}
        <div className="text-sm truncate text-muted-foreground">↓ {b.drop?.address || '—'}</div>
      </div>
    )},
    { key: 'customer', header: 'Customer', render: b => {
      const c = b.customer || b.user;
      return <div className="text-sm">{c?.name || c?.phone || '—'}</div>;
    }},
    { key: 'rider', header: 'Rider', render: b => <div className="text-sm">{b.rider?.name || b.rider?.phone || '—'}</div> },
    { key: 'fare', header: 'Fare', align: 'right', render: b => (
      <div className="font-medium">{fmtRupees(b.price ?? (b.fare?.total != null ? b.fare.total / 100 : undefined))}</div>
    )},
    { key: 'status', header: 'Status', render: b => <Badge tone={statusTone(b.status) as any}>{b.status}</Badge> },
    { key: 'actions', header: '', align: 'right', render: b => (
      <Button size="icon" variant="outline" aria-label="View booking" onClick={e => { e.stopPropagation(); open(b); }}>
        <Eye className="h-4 w-4" />
      </Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Bookings</h1>
        <p className="text-sm text-muted-foreground">All bookings across the platform. Click a row or the eye to open details.</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <Button key={s.id} size="sm" variant={status === s.id ? 'primary' : 'outline'} onClick={() => setStatus(s.id)}>
              {s.label}
            </Button>
          ))}
        </div>
      </Card>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={7} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<PackageCheck className="h-8 w-8" />} title="No bookings" /></Card>
        : <>
            <DataTable columns={columns} rows={items} onRowClick={open} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }
    </div>
  );
}
