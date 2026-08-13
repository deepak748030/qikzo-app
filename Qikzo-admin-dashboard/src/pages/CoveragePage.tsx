import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, MapPinned, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Modal, TableSkeleton } from '@/components/ui';
import { PolygonEditor, polygonAreaKm2, useCenterFromPoints, type Point } from '@/components/PolygonEditor';

type Area = {
  _id: string;
  name: string;
  polygon?: { coordinates: Point[][] };
  coord?: { lat: number; lng: number };
  active?: boolean;
};

type City = {
  _id: string;
  name: string;
  slug: string;
  active?: boolean;
  areas: Area[];
};

function ringOf(area?: Area): Point[] {
  const ring = area?.polygon?.coordinates?.[0] || [];
  if (ring.length > 3) {
    const [fx, fy] = ring[0];
    const [lx, ly] = ring[ring.length - 1];
    if (fx === lx && fy === ly) return ring.slice(0, -1) as Point[];
  }
  return ring as Point[];
}

export default function CoveragePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [cityModal, setCityModal] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [cityName, setCityName] = useState('');

  const [areaModal, setAreaModal] = useState<{ city: City; area?: Area } | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaPoints, setAreaPoints] = useState<Point[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'city' | 'area'; city: City; area?: Area } | null>(null);

  const mapCenter = useCenterFromPoints(areaPoints);

  async function refresh() {
    setLoading(true);
    try {
      const res = await api<{ items: City[] }>('/admin/coverage');
      setCities(res.items || []);
    } catch (e: any) { toast.error(e?.message || 'Failed to load coverage'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  const openCreateCity = () => { setEditingCity(null); setCityName(''); setCityModal(true); };
  const openEditCity = (c: City) => { setEditingCity(c); setCityName(c.name); setCityModal(true); };

  const submitCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingCity) await api(`/admin/coverage/${editingCity._id}`, { method: 'PATCH', body: { name: cityName.trim() } });
      else await api('/admin/coverage', { method: 'POST', body: { name: cityName.trim() } });
      toast.success(editingCity ? 'City updated' : 'City created');
      setCityModal(false);
      await refresh();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const openCreateArea = (city: City) => {
    setAreaModal({ city });
    setAreaName('');
    setAreaPoints([]);
  };
  const openEditArea = (city: City, area: Area) => {
    setAreaModal({ city, area });
    setAreaName(area.name);
    setAreaPoints(ringOf(area));
  };

  const submitArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaModal) return;
    if (areaPoints.length < 3) { toast.error('Draw at least 3 points on the map'); return; }
    setBusy(true);
    try {
      const ring = [...areaPoints, areaPoints[0]];
      const payload = { name: areaName.trim(), polygon: { type: 'Polygon', coordinates: [ring] } };
      if (areaModal.area) {
        await api(`/admin/coverage/${areaModal.city._id}/areas/${areaModal.area._id}`, { method: 'PATCH', body: payload });
      } else {
        await api(`/admin/coverage/${areaModal.city._id}/areas`, { method: 'POST', body: payload });
      }
      toast.success(areaModal.area ? 'Area updated' : 'Area added');
      setAreaModal(null);
      setOpenId(areaModal.city._id);
      await refresh();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      if (confirmDelete.kind === 'city') {
        await api(`/admin/coverage/${confirmDelete.city._id}`, { method: 'DELETE' });
        toast.success('City deleted');
      } else if (confirmDelete.area) {
        await api(`/admin/coverage/${confirmDelete.city._id}/areas/${confirmDelete.area._id}`, { method: 'DELETE' });
        toast.success('Area deleted');
      }
      setConfirmDelete(null);
      await refresh();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Coverage</h1>
          <p className="text-sm text-muted-foreground">Draw a city or area once, then pick it when creating banners.</p>
        </div>
        <Button onClick={openCreateCity}><Plus className="h-4 w-4" /> New city</Button>
      </div>

      {loading && cities.length === 0 ? (
        <Card><TableSkeleton cols={3} /></Card>
      ) : cities.length === 0 ? (
        <Card><EmptyState icon={<MapPinned className="h-8 w-8" />} title="No coverage yet" hint="Create a city, then draw its areas on the map." /></Card>
      ) : (
        <Card className="!p-0 overflow-hidden divide-y divide-border">
          {cities.map((c) => {
            const open = openId === c._id;
            return (
              <div key={c._id}>
                <div className="flex items-center gap-3 p-4">
                  <button type="button" className="text-muted-foreground" onClick={() => setOpenId(open ? null : c._id)}>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium truncate">{c.name}</div>
                      <span className="text-xs font-mono text-muted-foreground">{c.slug}</span>
                      <Badge>{c.areas?.length || 0} area{(c.areas?.length || 0) === 1 ? '' : 's'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openCreateArea(c)}><Plus className="h-4 w-4" /> Area</Button>
                    <Button size="sm" variant="outline" onClick={() => openEditCity(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => setConfirmDelete({ kind: 'city', city: c })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {open && (
                  <div className="px-4 pb-4 pl-12 space-y-2">
                    {(c.areas || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No areas yet. Add one and draw its map.</div>
                    ) : c.areas.map((a) => (
                      <div key={a._id} className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {ringOf(a).length} points
                            {a.coord ? ` · ${a.coord.lat.toFixed(3)}, ${a.coord.lng.toFixed(3)}` : ''}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openEditArea(c, a)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => setConfirmDelete({ kind: 'area', city: c, area: a })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Modal
        open={cityModal}
        onClose={() => setCityModal(false)}
        title={editingCity ? 'Edit city' : 'New city'}
        footer={<>
          <Button variant="ghost" onClick={() => setCityModal(false)}>Cancel</Button>
          <Button onClick={submitCity as any} loading={busy}>{editingCity ? 'Save' : 'Create'}</Button>
        </>}
      >
        <form className="space-y-3" onSubmit={submitCity}>
          <div>
            <label className="text-sm font-medium block mb-1">City name</label>
            <Input required value={cityName} onChange={e => setCityName(e.target.value)} placeholder="e.g. Delhi, Indore" />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!areaModal}
        onClose={() => setAreaModal(null)}
        title={areaModal?.area ? `Edit area in ${areaModal.city.name}` : `New area in ${areaModal?.city.name || ''}`}
        size="lg"
        footer={<>
          <Button variant="ghost" onClick={() => setAreaModal(null)}>Cancel</Button>
          <Button onClick={submitArea as any} loading={busy}>{areaModal?.area ? 'Save' : 'Add area'}</Button>
        </>}
      >
        <form className="space-y-3" onSubmit={submitArea}>
          <div>
            <label className="text-sm font-medium block mb-1">Area name</label>
            <Input required value={areaName} onChange={e => setAreaName(e.target.value)} placeholder="e.g. South Delhi, Vijay Nagar" />
          </div>
          <PolygonEditor value={areaPoints} center={mapCenter} height={320} onChange={setAreaPoints} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{areaPoints.length} points · ~{polygonAreaKm2(areaPoints).toFixed(1)} km² · click map to add, drag to move</span>
            {areaPoints.length > 0 && (
              <button type="button" className="hover:text-foreground underline" onClick={() => setAreaPoints([])}>Clear</button>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete?.kind === 'city' ? 'Delete city?' : 'Delete area?'}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="destructive" onClick={doDelete} loading={busy}>Delete</Button>
        </>}
      >
        <p className="text-sm text-muted-foreground">
          {confirmDelete?.kind === 'city'
            ? <>Delete <strong>{confirmDelete.city.name}</strong> and all its areas?</>
            : <>Delete area <strong>{confirmDelete?.area?.name}</strong>?</>}
        </p>
      </Modal>
    </div>
  );
}
