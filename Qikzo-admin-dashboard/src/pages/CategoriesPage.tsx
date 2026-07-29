import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin, Layers, Power, PowerOff, Pencil, ChevronDown, ChevronRight, Eraser, Save, X, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Modal, TableSkeleton, Textarea } from '@/components/ui';
import { PolygonEditor, polygonAreaKm2, type Point } from '@/components/PolygonEditor';

/**
 * Categories admin — full CRUD plus State/Area management with a Leaflet
 * polygon editor. Uses a fresh GET after every mutation to keep server state
 * as the single source of truth for polygons.
 */

type Area = {
    _id: string;
    name: string;
    active: boolean;
    polygon: { type: 'Polygon'; coordinates: [number, number][][] };
};
type State = { _id: string; name: string; active: boolean; areas: Area[] };
type Category = {
    _id: string;
    slug: string;
    name: string;
    emoji?: string;
    hint?: string;
    order?: number;
    active: boolean;
    states: State[];
};

const emptyCat = { name: '', slug: '', emoji: '', hint: '', order: '0', active: true };

export default function CategoriesPage() {
    const [items, setItems] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const [showCatForm, setShowCatForm] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | null>(null);
    const [catForm, setCatForm] = useState({ ...emptyCat });

    const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);
    const [busy, setBusy] = useState(false);

    // Area editor state
    const [areaEditor, setAreaEditor] = useState<null | {
        category: Category; state: State; area?: Area; points: Point[]; name: string;
    }>(null);

    // Add-state inline UI per category
    const [newStateNameByCat, setNewStateNameByCat] = useState<Record<string, string>>({});

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
        setCatForm({ name: c.name, slug: c.slug, emoji: c.emoji || '', hint: c.hint || '', order: String(c.order ?? 0), active: c.active });
        setShowCatForm(true);
    };

    const submitCat = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const payload: any = {
                name: catForm.name.trim(),
                emoji: catForm.emoji.trim(),
                hint: catForm.hint.trim(),
                order: Number(catForm.order) || 0,
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

    const addState = async (c: Category) => {
        const name = (newStateNameByCat[c._id] || '').trim();
        if (!name) return;
        try {
            await api(`/admin/categories/${c._id}/states`, { method: 'POST', body: { name } });
            setNewStateNameByCat(prev => ({ ...prev, [c._id]: '' }));
            await refresh();
        } catch (e: any) { toast.error(e?.message || 'Failed'); }
    };

    const removeState = async (c: Category, s: State) => {
        if (!confirm(`Remove state "${s.name}" and all its areas?`)) return;
        try {
            await api(`/admin/categories/${c._id}/states/${s._id}`, { method: 'DELETE' });
            await refresh();
        } catch (e: any) { toast.error(e?.message || 'Failed'); }
    };

    const removeArea = async (c: Category, s: State, a: Area) => {
        if (!confirm(`Remove area "${a.name}"?`)) return;
        try {
            await api(`/admin/categories/${c._id}/states/${s._id}/areas/${a._id}`, { method: 'DELETE' });
            await refresh();
        } catch (e: any) { toast.error(e?.message || 'Failed'); }
    };

    const openAreaEditor = (c: Category, s: State, a?: Area) => {
        const points: Point[] = a ? a.polygon.coordinates[0].slice(0, -1) as Point[] : [];
        setAreaEditor({ category: c, state: s, area: a, points, name: a?.name || '' });
    };

    const saveArea = async () => {
        if (!areaEditor) return;
        const { category, state, area, points, name } = areaEditor;
        if (!name.trim()) { toast.error('Area name required'); return; }
        if (points.length < 3) { toast.error('Draw at least 3 points'); return; }
        setBusy(true);
        try {
            const body = { name: name.trim(), polygon: { coordinates: points }, active: true };
            if (area) await api(`/admin/categories/${category._id}/states/${state._id}/areas/${area._id}`, { method: 'PATCH', body });
            else await api(`/admin/categories/${category._id}/states/${state._id}/areas`, { method: 'POST', body });
            toast.success(area ? 'Area updated' : 'Area added');
            setAreaEditor(null);
            await refresh();
        } catch (e: any) { toast.error(e?.message || 'Failed to save area'); }
        finally { setBusy(false); }
    };

    const totalAreas = (c: Category) => c.states.reduce((n, s) => n + s.areas.length, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-display font-semibold">Categories</h1>
                    <p className="text-sm text-muted-foreground">Manage service categories, states and geo-fenced areas.</p>
                </div>
                <Button onClick={openCreateCat}><Plus className="h-4 w-4" /> New category</Button>
            </div>

            {loading && items.length === 0 ? (
                <Card><TableSkeleton cols={4} /></Card>
            ) : items.length === 0 ? (
                <Card><EmptyState icon={<Package className="h-8 w-8" />} title="No categories yet" hint="Create your first category to get started." /></Card>
            ) : (
                <div className="space-y-3">
                    {items.map(c => {
                        const isOpen = expanded[c._id];
                        return (
                            <Card key={c._id} className="!p-0 overflow-hidden">
                                <div className="flex items-center gap-3 p-4">
                                    <button
                                        onClick={() => setExpanded(prev => ({ ...prev, [c._id]: !prev[c._id] }))}
                                        className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
                                        aria-label="Toggle states"
                                    >
                                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    <div className="text-2xl leading-none w-8 text-center">{c.emoji || '📁'}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <div className="font-medium truncate">{c.name}</div>
                                            <span className="text-xs font-mono text-muted-foreground truncate">{c.slug}</span>
                                            {c.active ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                                            <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {c.states.length} states</span>
                                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {totalAreas(c)} areas</span>
                                            {c.hint && <span className="truncate">· {c.hint}</span>}
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

                                {isOpen && (
                                    <div className="border-t border-border bg-muted/20 p-4 space-y-3">
                                        {c.states.length === 0 && (
                                            <div className="text-sm text-muted-foreground">No states yet. Add one below.</div>
                                        )}
                                        {c.states.map(s => (
                                            <div key={s._id} className="rounded-md border border-border bg-card p-3">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <Layers className="h-4 w-4 text-muted-foreground" />
                                                        <div className="font-medium">{s.name}</div>
                                                        <Badge tone="info">{s.areas.length} areas</Badge>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => openAreaEditor(c, s)}>
                                                            <Plus className="h-3.5 w-3.5" /> Add area
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => removeState(c, s)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                {s.areas.length > 0 && (
                                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                                        {s.areas.map(a => (
                                                            <div key={a._id} className="flex items-center justify-between rounded-md border border-border p-2">
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-medium truncate">{a.name}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {a.polygon.coordinates[0].length - 1} points · ~{polygonAreaKm2(a.polygon.coordinates[0].slice(0, -1) as Point[]).toFixed(1)} km²
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <Button size="sm" variant="outline" onClick={() => openAreaEditor(c, s, a)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                                    <Button size="sm" variant="destructive" onClick={() => removeArea(c, s, a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="Add state (e.g. Delhi, Maharashtra)"
                                                value={newStateNameByCat[c._id] || ''}
                                                onChange={e => setNewStateNameByCat(prev => ({ ...prev, [c._id]: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addState(c); } }}
                                            />
                                            <Button onClick={() => addState(c)}><Plus className="h-4 w-4" /> State</Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
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
                    <div className="grid grid-cols-[1fr_100px] gap-3">
                        <div>
                            <label className="text-sm font-medium block mb-1">Name</label>
                            <Input required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Groceries" />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Emoji</label>
                            <Input value={catForm.emoji} onChange={e => setCatForm({ ...catForm, emoji: e.target.value })} placeholder="🛒" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium block mb-1">Slug</label>
                            <Input value={catForm.slug} disabled={!!editingCat} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} placeholder="auto from name" />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Order</label>
                            <Input inputMode="numeric" value={catForm.order} onChange={e => setCatForm({ ...catForm, order: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1">Hint</label>
                        <Textarea value={catForm.hint} onChange={e => setCatForm({ ...catForm, hint: e.target.value })} placeholder="Short description shown to customers" />
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
                    <strong>{confirmDeleteCat?.name}</strong> and all of its states & areas will be permanently removed.
                </p>
            </Modal>

            {/* Area polygon editor */}
            {areaEditor && (
                <AreaEditorModal
                    editor={areaEditor}
                    onChange={setAreaEditor}
                    onClose={() => setAreaEditor(null)}
                    onSave={saveArea}
                    busy={busy}
                />
            )}
        </div>
    );
}

function AreaEditorModal({ editor, onChange, onClose, onSave, busy }: {
    editor: { category: Category; state: State; area?: Area; points: Point[]; name: string };
    onChange: (v: typeof editor) => void;
    onClose: () => void;
    onSave: () => void;
    busy: boolean;
}) {
    const areaKm2 = useMemo(() => polygonAreaKm2(editor.points), [editor.points]);
    const center = useMemo<[number, number]>(() => {
        if (editor.points.length > 0) {
            const s = editor.points.reduce((a, [lng, lat]) => ({ lat: a.lat + lat, lng: a.lng + lng }), { lat: 0, lng: 0 });
            return [s.lat / editor.points.length, s.lng / editor.points.length];
        }
        return [28.6139, 77.2090];
    }, [editor.area?._id]); // only recenter when switching areas

    return (
        <div className="fixed inset-0 z-50 p-3 sm:p-6 bg-black/50 grid place-items-center" onClick={onClose}>
            <div className="w-full max-w-3xl rounded-lg border border-border bg-card shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <div className="text-xs text-muted-foreground">{editor.category.name} · {editor.state.name}</div>
                        <h3 className="font-display font-semibold text-lg">{editor.area ? 'Edit area' : 'New area'}</h3>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <label className="text-sm font-medium block mb-1">Area name</label>
                        <Input
                            value={editor.name}
                            onChange={e => onChange({ ...editor, name: e.target.value })}
                            placeholder="e.g. South Delhi, Sector 62"
                        />
                    </div>

                    <PolygonEditor
                        value={editor.points}
                        onChange={(pts) => onChange({ ...editor, points: pts })}
                        center={center}
                    />

                    <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                        <div className="text-muted-foreground">
                            <span className="font-medium text-foreground">{editor.points.length}</span> points
                            {editor.points.length >= 3 && (
                                <> · <span className="font-medium text-foreground">~{areaKm2.toFixed(1)} km²</span></>
                            )}
                            <span className="ml-2 hidden sm:inline">· Tap map to add · drag to move · tap vertex to remove</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onChange({ ...editor, points: [] })}>
                            <Eraser className="h-4 w-4" /> Clear
                        </Button>
                    </div>
                </div>

                <div className="p-4 border-t border-border flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={onSave} loading={busy} disabled={editor.points.length < 3 || !editor.name.trim()}>
                        <Save className="h-4 w-4" /> Save area
                    </Button>
                </div>
            </div>
        </div>
    );
}
