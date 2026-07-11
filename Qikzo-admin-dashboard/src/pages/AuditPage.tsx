import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Card, EmptyState, InfiniteSentinel, TableSkeleton, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate } from '@/lib/utils';
import { ScrollText } from 'lucide-react';

type AuditEntry = {
  _id: string;
  action: string;
  actorRole?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  meta?: any;
  createdAt?: string;
};

export default function AuditPage() {
  const { items, loading, hasMore, loadMore } = usePaginated<AuditEntry>('/admin/audit');
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const columns: Column<AuditEntry>[] = [
    { key: 'when', header: 'When', render: e => <span className="text-sm text-muted-foreground">{fmtDate(e.createdAt)}</span> },
    { key: 'action', header: 'Action', render: e => <span className="font-mono text-xs">{e.action}</span> },
    { key: 'actor', header: 'Actor', render: e => (
      <div className="text-sm">
        <Badge tone="info">{e.actorRole || '—'}</Badge>
        <div className="text-xs text-muted-foreground mt-1 font-mono">{e.actorId?.slice(-8) || '—'}</div>
      </div>
    )},
    { key: 'target', header: 'Target', render: e => (
      <div className="text-sm">
        <div>{e.targetType || '—'}</div>
        <div className="text-xs text-muted-foreground font-mono">{e.targetId?.slice(-8) || '—'}</div>
      </div>
    )},
    { key: 'meta', header: 'Meta', render: e => e.meta ? <code className="text-xs text-muted-foreground">{JSON.stringify(e.meta)}</code> : '—' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Immutable record of admin actions.</p>
      </div>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={5} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<ScrollText className="h-8 w-8" />} title="No audit entries" /></Card>
        : <>
            <DataTable columns={columns} rows={items} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }
    </div>
  );
}
