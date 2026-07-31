import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Card, EmptyState, Input, InfiniteSentinel, TableSkeleton } from '@/components/ui';
import { Users, Search } from 'lucide-react';

type Milestone = { deliveries: number; reward: number };

type Row = {
  id: string;
  code: string;
  referrerName: string;
  referrerPhone: string;
  referrerRole: string;
  refereeName: string;
  refereePhone: string;
  refereeRole: string;
  deliveries: number;
  awarded: number[];
  milestonesTotal: number;
  milestonesDone: number;
  nextMilestone: Milestone | null;
  target: number;
  pendingReward: number;
  totalEarned: number;
  createdAt: string;
};

type Res = {
  items: Row[];
  total: number;
  hasMore: boolean;
  milestones: Milestone[];
  rewardWallet: 'money' | 'bonus';
  enabled: boolean;
};

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Referral programme monitoring — who referred whom, how far the referred
 * account is towards each delivery milestone, and what has already been paid
 * out versus what is still pending.
 */
export default function ReferralsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<{ total: number; milestones: Milestone[]; rewardWallet: string; enabled: boolean }>({ total: 0, milestones: [], rewardWallet: 'money', enabled: true });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const fetchPage = useCallback(async (nextPage: number, query: string, replace: boolean) => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await api<Res>('/admin/referrals', { query: { page: nextPage, limit: 20, q: query } });
      if (id !== reqId.current) return; // a newer search superseded this one
      setRows(prev => (replace ? res.items : [...prev, ...res.items]));
      setHasMore(res.hasMore);
      setPage(nextPage);
      setMeta({ total: res.total, milestones: res.milestones || [], rewardWallet: res.rewardWallet, enabled: res.enabled });
    } catch (e: any) {
      if (id === reqId.current) toast.error(e?.message || 'Could not load referrals');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPage(1, q.trim(), true), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, fetchPage]);

  const loadMore = useCallback(() => { if (!loading && hasMore) fetchPage(page + 1, q.trim(), false); }, [loading, hasMore, page, q, fetchPage]);
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  const paidOut = rows.reduce((s, r) => s + (r.totalEarned || 0), 0);
  const pending = rows.reduce((s, r) => s + (r.pendingReward || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          {meta.enabled ? 'Campaign is live' : 'Campaign is paused'} · rewards credited to the {meta.rewardWallet} wallet
          {meta.milestones.length ? ` · milestones at ${meta.milestones.map(m => m.deliveries).join(', ')} deliveries` : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><div className="p-4"><div className="text-xs text-muted-foreground">Total referrals</div><div className="text-2xl font-semibold">{meta.total}</div></div></Card>
        <Card><div className="p-4"><div className="text-xs text-muted-foreground">Rewards paid (loaded)</div><div className="text-2xl font-semibold">{money(paidOut)}</div></div></Card>
        <Card><div className="p-4"><div className="text-xs text-muted-foreground">Rewards pending (loaded)</div><div className="text-2xl font-semibold">{money(pending)}</div></div></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name, phone or code" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <Card>
        {loading && rows.length === 0 ? (
          <div className="p-4"><TableSkeleton rows={6} cols={5} /></div>
        ) : rows.length === 0 ? (
          <div className="p-8"><EmptyState icon={<Users className="h-6 w-6" />} title="No referrals yet" hint="Referrals appear here as soon as someone applies a code." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Referred user</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Rewards</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const pct = r.target ? Math.min(100, Math.round((r.deliveries / r.target) * 100)) : 100;
                  const done = r.milestonesTotal > 0 && r.milestonesDone >= r.milestonesTotal;
                  return (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.referrerName}</div>
                        <div className="text-xs text-muted-foreground">{r.referrerPhone} · {r.referrerRole}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.refereeName}</div>
                        <div className="text-xs text-muted-foreground">{r.refereePhone} · {r.refereeRole}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {r.deliveries} deliveries
                          {done ? ' · all milestones complete' : r.nextMilestone ? ` · next at ${r.nextMilestone.deliveries} (${money(r.nextMilestone.reward)})` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone="success">{money(r.totalEarned)} paid</Badge>
                          {r.pendingReward > 0 ? <Badge tone="warning">{money(r.pendingReward)} pending</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{r.milestonesDone}/{r.milestonesTotal} milestones</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={rows.length === 0} />
    </div>
  );
}
