import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Power, PowerOff, Pencil, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Modal, TableSkeleton } from '@/components/ui';

/**
 * Categories admin — simple CRUD.
 * A category is just a name + slug. Geo-targeting (location name + polygon)
 * is defined per-banner on the Banners page, not on the category itself.
 */

type Category = {
    _id: string;
    slug: string;
    name: string;
    active: boolean;
};

const emptyCat = { name: '', slug: '', active: true };

export default function CategoriesPage() {
    const [items, setItems] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCatForm, setShowCatForm] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | null>(null);
    const [catForm, setCatForm] = useState({ ...emptyCat });

    const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);
    const [busy, setBusy] = useState(false);

    async function refresh() {
        setLoading(true);
        try {
            const res = await api<{ items: Category[]; nextCursor: string | null }>('/admin/categories', { query: { limit: 200 } });
            setItems(res.items);
        } catch (e: any) { toast.error(e?.message || 'Failed to load categories'); }
        finally { setLoading(false); }
    }
    useEffect(() => { void refresh(); }, []);

    const openCreateCat = () => { setEditingCat(null); setCatForm({ ...emptyCat }); setShowCatForm(true); };
    const openEditCat = (c: Category) => {
        setEditingCat(c);
        setCatForm({ name: c.name, slug: c.slug, active: c.active });
        setShowCatForm(true);
    };

    const submitCat = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const payload: any = {
                name: catForm.name.trim(),
                active: catForm.active,
            };
            if (!editingCat) payload.slug = catForm.slug.trim().toLowerCase() || undefined;
            if (editingCat) await api(`/admin/categories/${editingCat._id}`, { method: 'PATCH', body: payload });
            else await api('/admin/categories', { method: 'POST', body: payload });
            toast.success(editingCat ? 'Category updated' : 'Category created');
            setShowCatForm(false);
            await refresh();
        } catch (err: any) { toast.error(err?.message || 'Failed'); }
        finally { setBusy(false); }
    };

    const doDeleteCat = async () => {
        if (!confirmDeleteCat) return;
        setBusy(true);
        try {
            await api(`/admin/categories/${confirmDeleteCat._id}`, { method: 'DELETE' });
            toast.success('Category deleted');
            setConfirmDeleteCat(null);
            await refresh();
        } catch (err: any) { toast.error(err?.message || 'Failed'); }
        finally { setBusy(false); }
    };

    const toggleCat = async (c: Category) => {
        try {
            await api(`/admin/categories/${c._id}/toggle`, { method: 'POST' });
            await refresh();
        } catch (e: any) { toast.error(e?.message || 'Failed'); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-display font-semibold">Categories</h1>
                    <p className="text-sm text-muted-foreground">Manage service categories. Location & area are defined per-banner.</p>
                </div>
                <Button onClick={openCreateCat}><Plus className="h-4 w-4" /> New category</Button>
            </div>

            {loading && items.length === 0 ? (
                <Card><TableSkeleton cols={3} /></Card>
            ) : items.length === 0 ? (
                <Card><EmptyState icon={<Package className="h-8 w-8" />} title="No categories yet" hint="Create your first category to get started." /></Card>
            ) : (
                <Card className="!p-0 overflow-hidden divide-y divide-border">
                    {items.map(c => (
                        <div key={c._id} className="flex items-center gap-3 p-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="font-medium truncate">{c.name}</div>
                                    <span className="text-xs font-mono text-muted-foreground truncate">{c.slug}</span>
                                    {c.active ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => toggleCat(c)} title={c.active ? 'Disable' : 'Enable'}>
                                    {c.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openEditCat(c)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteCat(c)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                </Card>
            )}

            {/* Category create/edit modal */}
            <Modal
                open={showCatForm}
                onClose={() => setShowCatForm(false)}
                title={editingCat ? 'Edit category' : 'New category'}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowCatForm(false)}>Cancel</Button>
                    <Button onClick={submitCat as any} loading={busy}>{editingCat ? 'Save' : 'Create'}</Button>
                </>}
            >
                <form className="space-y-3" onSubmit={submitCat}>
                    <div>
                        <label className="text-sm font-medium block mb-1">Name</label>
                        <Input required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Groceries" />
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1">Slug</label>
                        <Input value={catForm.slug} disabled={!!editingCat} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} placeholder="auto from name" />
                        {editingCat && <div className="text-[11px] text-muted-foreground mt-1">Slug is immutable after creation.</div>}
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={catForm.active} onChange={e => setCatForm({ ...catForm, active: e.target.checked })} />
                        Active
                    </label>
                </form>
            </Modal>

            {/* Delete confirm */}
            <Modal
                open={!!confirmDeleteCat}
                onClose={() => setConfirmDeleteCat(null)}
                title="Delete category?"
                footer={<>
                    <Button variant="ghost" onClick={() => setConfirmDeleteCat(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={doDeleteCat} loading={busy}>Delete</Button>
                </>}
            >
                <p className="text-sm text-muted-foreground">
                    <strong>{confirmDeleteCat?.name}</strong> will be permanently removed.
                </p>
            </Modal>
        </div>
    );
}
