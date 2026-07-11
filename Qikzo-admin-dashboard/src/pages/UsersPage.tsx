import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { usePaginated } from '@/lib/usePaginated';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Badge, Button, Card, EmptyState, Input, InfiniteSentinel, Modal, TableSkeleton } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { fmtDate, fmtPhone } from '@/lib/utils';
import { Search, Users as UsersIcon, Ban, CheckCircle2, Pencil, Trash2 } from 'lucide-react';

type User = {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  role?: 'customer' | 'rider' | 'admin';
  blocked?: boolean;
  blockedReason?: string;
  onboarded?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
};

type UserDetail = {
  user: User;
  bookingsCount: number;
  rider?: { _id: string; vehicle?: string; vehicleNo?: string; kycStatus?: string } | null;
};

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'all' | 'customer' | 'rider' | 'admin'>('all');
  const [blocked, setBlocked] = useState<'all' | 'true' | 'false'>('all');

  const [blockTarget, setBlockTarget] = useState<User | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'customer' as User['role'] });
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => ({
    q: q.trim() || undefined,
    role: role === 'all' ? undefined : role,
    blocked: blocked === 'all' ? undefined : blocked,
  }), [q, role, blocked]);

  const { items, loading, hasMore, loadMore, refresh } = usePaginated<User>('/admin/users', query);
  const sentinelRef = useInfiniteScroll(hasMore, loading, loadMore);

  useEffect(() => {
    if (!editTarget) return;
    setEditForm({
      name: editTarget.name || '',
      email: editTarget.email || '',
      role: (editTarget.role as any) || 'customer',
    });
  }, [editTarget]);

  const openDetail = async (u: User) => {
    setDetail({ user: u, bookingsCount: 0, rider: null });
    setDetailLoading(true);
    try {
      const res = await api<UserDetail>(`/admin/users/${u._id}`);
      setDetail(res);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load user');
      setDetail(null);
    } finally { setDetailLoading(false); }
  };

  const submitBlock = async () => {
    if (!blockTarget) return;
    setBusy(true);
    try {
      await api(`/admin/users/${blockTarget._id}/block`, { method: 'POST', body: { blocked: !blockTarget.blocked, reason: blockReason } });
      toast.success(blockTarget.blocked ? 'User unblocked' : 'User blocked');
      setBlockTarget(null); setBlockReason('');
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setBusy(true);
    try {
      await api(`/admin/users/${editTarget._id}`, { method: 'PATCH', body: editForm });
      toast.success('User updated');
      setEditTarget(null);
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api(`/admin/users/${deleteTarget._id}`, { method: 'DELETE' });
      toast.success('User deleted');
      setDeleteTarget(null);
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const roleTone = (r?: string) => r === 'admin' ? 'info' : r === 'rider' ? 'warning' : 'default';

  const columns: Column<User>[] = [
    { key: 'user', header: 'User', primary: true, render: u => (
      <div>
        <div className="font-medium">{u.name || 'Guest'}</div>
        <div className="text-xs text-muted-foreground">{fmtPhone(u.phone)}</div>
      </div>
    )},
    { key: 'email', header: 'Email', render: u => <span className="text-sm text-muted-foreground">{u.email || '—'}</span> },
    { key: 'role', header: 'Role', render: u => <Badge tone={roleTone(u.role) as any}>{u.role || 'customer'}</Badge> },
    { key: 'status', header: 'Status', render: u => (
      <div className="flex gap-1.5">
        {u.blocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}
        {u.onboarded === false && <Badge>New</Badge>}
      </div>
    )},
    { key: 'created', header: 'Joined', render: u => <span className="text-sm text-muted-foreground">{fmtDate(u.createdAt)}</span> },
    { key: 'actions', header: '', align: 'right', render: u => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setEditTarget(u); }}><Pencil className="h-4 w-4" /></Button>
        <Button size="sm" variant={u.blocked ? 'outline' : 'destructive'} onClick={e => { e.stopPropagation(); setBlockTarget(u); }}>
          {u.blocked ? <><CheckCircle2 className="h-4 w-4" /> Unblock</> : <><Ban className="h-4 w-4" /> Block</>}
        </Button>
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setDeleteTarget(u); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage all customers, riders & admins.</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, phone, email" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={role} onChange={e => setRole(e.target.value as any)}>
            <option value="all">All roles</option>
            <option value="customer">Customer</option>
            <option value="rider">Rider</option>
            <option value="admin">Admin</option>
          </select>
          <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={blocked} onChange={e => setBlocked(e.target.value as any)}>
            <option value="all">All statuses</option>
            <option value="false">Active</option>
            <option value="true">Blocked</option>
          </select>
        </div>
      </Card>

      {loading && items.length === 0 ? <Card><TableSkeleton cols={6} /></Card>
        : items.length === 0 ? <Card><EmptyState icon={<UsersIcon className="h-8 w-8" />} title="No users found" hint="Adjust filters or wait for signups." /></Card>
        : <>
            <DataTable columns={columns} rows={items} onRowClick={openDetail} />
            <InfiniteSentinel innerRef={sentinelRef} hasMore={hasMore} loading={loading} empty={items.length === 0} />
          </>
      }

      {/* Detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="User details"
        footer={<Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-base">{detail.user.name || 'Guest'}</div>
                <div className="text-muted-foreground">{fmtPhone(detail.user.phone)}</div>
              </div>
              <Badge tone={roleTone(detail.user.role) as any}>{detail.user.role || 'customer'}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Email" value={detail.user.email || '—'} />
              <Info label="Status" value={detail.user.blocked ? 'Blocked' : 'Active'} />
              <Info label="Joined" value={fmtDate(detail.user.createdAt)} />
              <Info label="Last login" value={fmtDate(detail.user.lastLoginAt || undefined)} />
              <Info label="Bookings" value={detailLoading ? '…' : String(detail.bookingsCount)} />
              <Info label="Onboarded" value={detail.user.onboarded ? 'Yes' : 'No'} />
            </div>
            {detail.rider && (
              <div className="border-t border-border pt-3">
                <div className="text-xs uppercase text-muted-foreground mb-2">Linked rider</div>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Vehicle" value={detail.rider.vehicle || '—'} />
                  <Info label="Vehicle no." value={detail.rider.vehicleNo || '—'} />
                  <Info label="KYC" value={detail.rider.kycStatus || 'pending'} />
                </div>
              </div>
            )}
            {detail.user.blocked && detail.user.blockedReason && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive text-xs">
                <strong>Reason:</strong> {detail.user.blockedReason}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit user"
        footer={<>
          <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button onClick={submitEdit} loading={busy}>Save</Button>
        </>}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Role</label>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as any }))}>
              <option value="customer">Customer</option>
              <option value="rider">Rider</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Block */}
      <Modal
        open={!!blockTarget}
        onClose={() => { setBlockTarget(null); setBlockReason(''); }}
        title={blockTarget?.blocked ? 'Unblock user' : 'Block user'}
        footer={<>
          <Button variant="ghost" onClick={() => setBlockTarget(null)}>Cancel</Button>
          <Button variant={blockTarget?.blocked ? 'primary' : 'destructive'} onClick={submitBlock} loading={busy}>
            {blockTarget?.blocked ? 'Unblock' : 'Block'}
          </Button>
        </>}
      >
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {blockTarget?.blocked ? 'The user will regain access to the app.' : 'The user will lose access until reinstated.'}
          </div>
          <Input placeholder="Reason (optional)" value={blockReason} onChange={e => setBlockReason(e.target.value)} />
        </div>
      </Modal>

      {/* Delete */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        footer={<>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={submitDelete} loading={busy}>Delete</Button>
        </>}
      >
        <div className="text-sm text-muted-foreground">
          This permanently deletes <strong className="text-foreground">{deleteTarget?.name || fmtPhone(deleteTarget?.phone)}</strong>. This action cannot be undone.
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
