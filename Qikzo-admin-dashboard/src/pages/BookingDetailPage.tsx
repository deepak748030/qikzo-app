import { useEffect, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { Badge, Card, Skeleton } from '@/components/ui';
import { cn, fmtDate, fmtPhone, fmtRupees, mediaUrl } from '@/lib/utils';
import {
  ArrowLeft, Bike, Clock, CreditCard, ExternalLink, MapPin, Navigation,
  Package, Phone, Star, UserRound, Wallet,
} from 'lucide-react';

type Point = { address?: string; lat?: number | null; lng?: number | null };
type Person = {
  _id?: string;
  name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  address?: string;
  city?: string;
  pincode?: string;
  dob?: string;
  gender?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  blocked?: boolean;
  blockedReason?: string;
  onboarded?: boolean;
  role?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  referralCode?: string;
};
type Place = { _id: string; label?: string; address?: string; emoji?: string; coord?: { lat?: number | null; lng?: number | null } };
type Addr = { _id: string; label?: string; line1?: string; line2?: string; landmark?: string; city?: string; state?: string; pincode?: string; contactName?: string; contactPhone?: string; isDefault?: boolean };
type WalletRow = { kind?: string; balance?: number; pending?: number; totalSpent?: number; totalEarned?: number };
type Rider = Person & {
  vehicle?: string;
  vehicleNo?: string;
  vehicleTypeSlug?: string;
  rating?: number;
  trips?: number;
  online?: boolean;
  available?: boolean;
  kycStatus?: string;
  currentLocation?: { coordinates?: number[]; updatedAt?: string | null };
  payoutMethod?: { method?: string | null; accountHolder?: string; accountNumber?: string; ifsc?: string; bankName?: string; upiId?: string };
  user?: Person | null;
  wallet?: WalletRow | null;
  vehicleDoc?: { make?: string; modelName?: string; colour?: string; year?: number | null; plateNo?: string; rcNumber?: string } | null;
};
type Booking = {
  _id: string;
  code?: string;
  status: string;
  mode?: string;
  categorySlug?: string;
  vehicleTypeSlug?: string;
  pickup?: Point;
  extraPickups?: Point[];
  drop?: Point;
  notes?: string;
  noteImages?: string[];
  recipientName?: string;
  recipientPhone?: string;
  payment?: string;
  paymentStatus?: string;
  paymentPaidAt?: string | null;
  paymentTxnId?: string;
  walletPaid?: { money?: number; bonus?: number } | null;
  distanceKm?: number;
  etaMin?: number;
  price?: number;
  pricing?: { base?: number; perKm?: number };
  couponCode?: string;
  discount?: number;
  scheduledAt?: string | null;
  history?: { status: string; at?: string; note?: string }[];
  cancelledReason?: string;
  cancelledBy?: string | null;
  cancellationFee?: number;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
type Trip = {
  _id: string;
  stage?: string;
  assignedAt?: string;
  arrivingAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string;
  distanceKm?: number;
  durationMin?: number;
  fare?: number;
};
type RatingRow = { stars?: number; comment?: string; tags?: string[]; tip?: number; createdAt?: string };
type ReviewRow = { stars?: number; quality?: number | null; packaging?: number | null; accuracy?: number | null; comment?: string; tags?: string[]; photos?: string[] };
type PayRow = { _id: string; method?: string; amount?: number; status?: string; provider?: string; providerPaymentId?: string; failureReason?: string; createdAt?: string };

type Detail = {
  booking: Booking;
  customer: Person | null;
  customerPlaces?: Place[];
  customerAddresses?: Addr[];
  customerEmergency?: { _id: string; name?: string; phone?: string; relation?: string }[];
  customerWallets?: WalletRow[];
  rider: Rider | null;
  trip: Trip | null;
  rating: RatingRow | null;
  orderReview: ReviewRow | null;
  payments?: PayRow[];
};

function statusTone(s?: string) {
  if (!s) return 'default' as const;
  if (s === 'Delivered' || s === 'completed' || s === 'paid' || s === 'approved') return 'success' as const;
  if (s === 'Cancelled' || s === 'cancelled' || s === 'disputed' || s === 'failed') return 'danger' as const;
  if (['Searching rider', 'Scheduled', 'pending', 'created'].includes(s)) return 'warning' as const;
  return 'info' as const;
}

function mapsUrl(p?: Point | null) {
  if (p?.lat == null || p?.lng == null || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  return `https://www.google.com/maps?q=${p.lat},${p.lng}`;
}

function validCoord(p?: Point | null): p is Point & { lat: number; lng: number } {
  return !!(p && p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px)">
      <div style="width:22px;height:22px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);color:#fff;font:700 10px/18px ui-sans-serif,system-ui;text-align:center">${label}</div>
    </div>`,
    iconSize: [22, 28],
    iconAnchor: [11, 22],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 });
  }, [map, points]);
  return null;
}

function RouteMap({ pickup, extras, drop }: { pickup?: Point; extras?: Point[]; drop?: Point }) {
  const pts: { pos: [number, number]; kind: 'p' | 'x' | 'd'; label: string }[] = [];
  if (validCoord(pickup)) pts.push({ pos: [pickup.lat, pickup.lng], kind: 'p', label: '1' });
  (extras || []).forEach((e, i) => {
    if (validCoord(e)) pts.push({ pos: [e.lat, e.lng], kind: 'x', label: String(i + 2) });
  });
  if (validCoord(drop)) pts.push({ pos: [drop.lat, drop.lng], kind: 'd', label: 'D' });
  if (!pts.length) {
    return (
      <div className="h-56 grid place-items-center text-sm text-muted-foreground rounded-md border border-dashed border-border bg-muted/30">
        No coordinates to plot
      </div>
    );
  }
  const color = (k: string) => (k === 'd' ? '#dc2626' : k === 'x' ? '#d97706' : '#2563eb');
  return (
    <div className="rounded-md overflow-hidden border border-border h-56">
      <MapContainer center={pts[0].pos} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={pts.map(p => p.pos)} />
        {pts.length > 1 && <Polyline positions={pts.map(p => p.pos)} pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.7 }} />}
        {pts.map((p, i) => <Marker key={i} position={p.pos} icon={pinIcon(color(p.kind), p.label)} />)}
      </MapContainer>
    </div>
  );
}

function Info({ label, value, className }: { label: string; value?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5 break-words">{value || '—'}</div>
    </div>
  );
}

function Avatar({ name, src, size = 'md' }: { name?: string; src?: string; size?: 'sm' | 'md' }) {
  const url = mediaUrl(src);
  const dim = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-sm';
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return url ? (
    <img src={url} alt="" className={cn(dim, 'rounded-full object-cover border border-border bg-muted')} />
  ) : (
    <div className={cn(dim, 'rounded-full bg-primary/10 text-primary grid place-items-center font-display font-semibold')}>{initial}</div>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-8 w-8 rounded-md bg-muted text-muted-foreground grid place-items-center">{icon}</div>
      <h2 className="font-display font-semibold">{children}</h2>
    </div>
  );
}

function StopRow({ label, point, tone }: { label: string; point?: Point; tone: 'pickup' | 'extra' | 'drop' }) {
  const href = mapsUrl(point);
  const dot = tone === 'drop' ? 'bg-destructive' : tone === 'extra' ? 'bg-warning' : 'bg-primary';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', dot)} />
        <span className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="min-w-0 pb-4 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium mt-0.5">{point?.address || '—'}</div>
        {point?.lat != null && point?.lng != null && (
          <div className="text-xs text-muted-foreground mt-0.5 font-mono">
            {Number(point.lat).toFixed(5)}, {Number(point.lng).toFixed(5)}
            {href && (
              <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 ml-2 text-primary hover:underline">
                Map <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'booking', id],
    queryFn: () => api<Detail>(`/admin/bookings/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <Card><Skeleton className="h-8 w-48 mb-3" /><Skeleton className="h-4 w-72" /></Card>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card><Skeleton className="h-40" /></Card>
          <Card><Skeleton className="h-40" /></Card>
        </div>
      </div>
    );
  }

  if (isError || !data?.booking) {
    return (
      <div className="space-y-4">
        <button onClick={() => nav('/bookings')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </button>
        <Card>
          <div className="text-sm text-destructive">{(error as any)?.message || 'Booking not found'}</div>
        </Card>
      </div>
    );
  }

  const { booking: b, customer, rider, trip, rating, orderReview } = data;
  const extras = b.extraPickups || [];
  const fareBeforeDiscount = Number(b.price || 0) + Number(b.discount || 0);
  const loc = rider?.currentLocation;
  const riderLat = loc?.coordinates?.[1];
  const riderLng = loc?.coordinates?.[0];
  const riderHasGps = Number.isFinite(riderLat) && Number.isFinite(riderLng) && !(riderLat === 0 && riderLng === 0);

  return (
    <div className="space-y-4">
      <button onClick={() => nav('/bookings')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </button>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-semibold text-2xl">{b.code || `#${b._id.slice(-6)}`}</h1>
              <Badge tone={statusTone(b.status)}>{b.status}</Badge>
              {b.mode && <Badge>{b.mode}</Badge>}
              {b.categorySlug && <Badge>{b.categorySlug}</Badge>}
              {b.vehicleTypeSlug && <Badge>{b.vehicleTypeSlug}</Badge>}
            </div>
            <div className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              <span>Booked {fmtDate(b.createdAt)}</span>
              {b.distanceKm != null && <span>· {Number(b.distanceKm).toFixed(1)} km</span>}
              {b.etaMin != null && <span>· {b.etaMin} min ETA</span>}
              {b.scheduledAt && <span>· Scheduled {fmtDate(b.scheduledAt)}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total fare</div>
            <div className="text-2xl font-display font-semibold">{fmtRupees(b.price)}</div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <SectionTitle icon={<Navigation className="h-4 w-4" />}>Route</SectionTitle>
          <RouteMap pickup={b.pickup} extras={extras} drop={b.drop} />
          <div className="mt-4">
            <StopRow label="Pickup 1" point={b.pickup} tone="pickup" />
            {extras.map((p, i) => (
              <StopRow key={i} label={`Pickup ${i + 2}`} point={p} tone="extra" />
            ))}
            <StopRow label="Drop" point={b.drop} tone="drop" />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle icon={<CreditCard className="h-4 w-4" />}>Fare & payment</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Base" value={fmtRupees(b.pricing?.base)} />
            <Info label="Per km" value={fmtRupees(b.pricing?.perKm)} />
            <Info label="Distance" value={b.distanceKm != null ? `${Number(b.distanceKm).toFixed(2)} km` : '—'} />
            <Info label="Subtotal" value={fmtRupees(fareBeforeDiscount)} />
            <Info label="Discount" value={b.discount ? `− ${fmtRupees(b.discount)}` : '—'} />
            <Info label="Coupon" value={b.couponCode || '—'} />
            <Info label="Total" value={<span className="font-semibold">{fmtRupees(b.price)}</span>} />
            <Info label="Method" value={b.payment || '—'} />
            <Info label="Payment status" value={<Badge tone={statusTone(b.paymentStatus)}>{b.paymentStatus || '—'}</Badge>} />
            <Info label="Paid at" value={fmtDate(b.paymentPaidAt)} />
            <Info label="Txn id" value={b.paymentTxnId || '—'} />
            {b.walletPaid && (
              <>
                <Info label="Wallet money" value={fmtRupees(b.walletPaid.money)} />
                <Info label="Wallet bonus" value={fmtRupees(b.walletPaid.bonus)} />
              </>
            )}
            {b.cancellationFee ? <Info label="Cancel fee" value={fmtRupees(b.cancellationFee)} /> : null}
            {b.cancelledBy && <Info label="Cancelled by" value={b.cancelledBy} />}
            {b.cancelledReason && <Info label="Cancel reason" value={b.cancelledReason} className="col-span-2" />}
          </div>
          {(data.payments || []).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Payment records</div>
              {data.payments!.map(p => (
                <div key={p._id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="capitalize">{p.method} · {fmtRupees(p.amount)}</span>
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle icon={<UserRound className="h-4 w-4" />}>Customer</SectionTitle>
          {customer ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar name={customer.name} src={customer.avatarUrl} />
                <div className="min-w-0">
                  <div className="font-medium">{customer.name || 'Guest'}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {fmtPhone(customer.phone)}
                  </div>
                  {customer.email && <div className="text-xs text-muted-foreground">{customer.email}</div>}
                </div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  {customer.blocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}
                  {customer.role && <Badge>{customer.role}</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Address" value={customer.address} className="col-span-2" />
                <Info label="City" value={customer.city} />
                <Info label="Pincode" value={customer.pincode} />
                <Info label="Gender" value={customer.gender} />
                <Info label="DOB" value={customer.dob} />
                <Info label="Joined" value={fmtDate(customer.createdAt)} />
                <Info label="Last login" value={fmtDate(customer.lastLoginAt)} />
                <Info label="Emergency" value={customer.emergencyName ? `${customer.emergencyName} · ${fmtPhone(customer.emergencyPhone)}` : '—'} className="col-span-2" />
                {customer.referralCode && <Info label="Referral code" value={customer.referralCode} />}
                {customer.blockedReason && <Info label="Block reason" value={customer.blockedReason} className="col-span-2" />}
              </div>

              {(data.customerWallets || []).length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Wallet className="h-3 w-3" /> Wallets</div>
                  <div className="grid grid-cols-2 gap-3">
                    {data.customerWallets!.map(w => (
                      <Info key={w.kind} label={`${w.kind} balance`} value={fmtRupees(w.balance)} />
                    ))}
                  </div>
                </div>
              )}

              {(data.customerPlaces || []).length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Saved places</div>
                  <div className="space-y-2">
                    {data.customerPlaces!.map(p => (
                      <div key={p._id} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                        <div className="text-sm font-medium">{p.emoji ? `${p.emoji} ` : ''}{p.label || 'Place'}</div>
                        <div className="text-xs text-muted-foreground">{p.address}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.customerAddresses || []).length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Addresses</div>
                  <div className="space-y-2">
                    {data.customerAddresses!.map(a => (
                      <div key={a._id} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {a.label || 'Address'}
                          {a.isDefault && <Badge>Default</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ')}
                        </div>
                        {(a.contactName || a.contactPhone) && (
                          <div className="text-xs text-muted-foreground mt-0.5">{a.contactName} {fmtPhone(a.contactPhone)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.customerEmergency || []).length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Emergency contacts</div>
                  {data.customerEmergency!.map(c => (
                    <div key={c._id} className="text-sm">{c.name} · {fmtPhone(c.phone)} {c.relation ? `· ${c.relation}` : ''}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No customer linked to this booking.</div>
          )}
        </Card>

        <Card>
          <SectionTitle icon={<Bike className="h-4 w-4" />}>Rider</SectionTitle>
          {rider ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar name={rider.name || rider.user?.name} src={rider.user?.avatarUrl} />
                <div className="min-w-0">
                  <div className="font-medium">{rider.name || rider.user?.name || 'Unnamed'}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {fmtPhone(rider.phone || rider.user?.phone)}
                  </div>
                  {rider.user?.email && <div className="text-xs text-muted-foreground">{rider.user.email}</div>}
                </div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  {rider.online ? <Badge tone="success">Online</Badge> : <Badge>Offline</Badge>}
                  {rider.available === false && <Badge tone="warning">Busy</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Vehicle" value={[rider.vehicle || rider.vehicleTypeSlug, rider.vehicleDoc?.make, rider.vehicleDoc?.modelName].filter(Boolean).join(' · ') || '—'} />
                <Info label="Vehicle no." value={rider.vehicleNo || rider.vehicleDoc?.plateNo} />
                <Info label="Rating" value={rider.rating != null ? `${Number(rider.rating).toFixed(1)} ★` : '—'} />
                <Info label="Trips" value={rider.trips != null ? String(rider.trips) : '—'} />
                <Info label="KYC" value={<Badge tone={statusTone(rider.kycStatus)}>{rider.kycStatus || '—'}</Badge>} />
                <Info label="Joined" value={fmtDate((rider as any).createdAt || rider.user?.createdAt)} />
                {riderHasGps && (
                  <Info
                    label="Last GPS"
                    className="col-span-2"
                    value={
                      <span>
                        {Number(riderLat).toFixed(5)}, {Number(riderLng).toFixed(5)}
                        <span className="text-muted-foreground"> · {fmtDate(loc?.updatedAt)}</span>
                        <a
                          href={`https://www.google.com/maps?q=${riderLat},${riderLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 ml-2 text-primary hover:underline"
                        >
                          Map <ExternalLink className="h-3 w-3" />
                        </a>
                      </span>
                    }
                  />
                )}
                {rider.user?.address && <Info label="Address" value={[rider.user.address, rider.user.city, rider.user.pincode].filter(Boolean).join(', ')} className="col-span-2" />}
                {rider.wallet && <Info label="Earnings wallet" value={fmtRupees(rider.wallet.balance)} />}
                {rider.wallet?.totalEarned != null && <Info label="Lifetime earned" value={fmtRupees(rider.wallet.totalEarned)} />}
              </div>

              {rider.payoutMethod?.method && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Payout account</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="Method" value={rider.payoutMethod.method} />
                    <Info label="Holder" value={rider.payoutMethod.accountHolder} />
                    {rider.payoutMethod.method === 'upi'
                      ? <Info label="UPI" value={rider.payoutMethod.upiId} className="col-span-2" />
                      : <>
                          <Info label="Account" value={rider.payoutMethod.accountNumber} />
                          <Info label="IFSC" value={rider.payoutMethod.ifsc} />
                          <Info label="Bank" value={rider.payoutMethod.bankName} className="col-span-2" />
                        </>}
                  </div>
                </div>
              )}

              {rider.user && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Linked user account</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="Name" value={rider.user.name} />
                    <Info label="Phone" value={fmtPhone(rider.user.phone)} />
                    <Info label="Status" value={rider.user.blocked ? 'Blocked' : 'Active'} />
                    <Info label="Last login" value={fmtDate(rider.user.lastLoginAt)} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No rider assigned yet.</div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle icon={<Package className="h-4 w-4" />}>Parcel & notes</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Recipient" value={b.recipientName || '—'} />
            <Info label="Recipient phone" value={fmtPhone(b.recipientPhone)} />
            <Info label="Notes" value={b.notes || '—'} className="col-span-2" />
          </div>
          {(b.noteImages || []).length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {b.noteImages!.map((src, i) => (
                <a key={i} href={mediaUrl(src)} target="_blank" rel="noreferrer" className="h-20 w-20 rounded-md overflow-hidden border border-border bg-muted">
                  <img src={mediaUrl(src)} alt="" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon={<Clock className="h-4 w-4" />}>Timeline</SectionTitle>
          {(b.history || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No status events yet.</div>
          ) : (
            <ol className="space-y-0">
              {[...(b.history || [])].map((h, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn('h-2.5 w-2.5 rounded-full mt-1.5', i === (b.history!.length - 1) ? 'bg-primary' : 'bg-muted-foreground/40')} />
                    {i < b.history!.length - 1 && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="text-sm font-medium">{h.status}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(h.at)}</div>
                    {h.note && <div className="text-xs text-muted-foreground mt-0.5">{h.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {trip && (
            <div className="mt-2 pt-4 border-t border-border grid grid-cols-2 gap-3">
              <Info label="Trip stage" value={<Badge tone={statusTone(trip.stage)}>{trip.stage}</Badge>} />
              <Info label="Trip fare" value={fmtRupees(trip.fare)} />
              <Info label="Assigned" value={fmtDate(trip.assignedAt)} />
              <Info label="Arriving" value={fmtDate(trip.arrivingAt)} />
              <Info label="Arrived" value={fmtDate(trip.arrivedAt)} />
              <Info label="Started" value={fmtDate(trip.startedAt)} />
              <Info label="Completed" value={fmtDate(trip.completedAt)} />
              <Info label="Duration" value={trip.durationMin ? `${trip.durationMin} min` : '—'} />
              {trip.cancelReason && <Info label="Trip cancel" value={trip.cancelReason} className="col-span-2" />}
            </div>
          )}
        </Card>
      </div>

      {(rating || orderReview) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {rating && (
            <Card>
              <SectionTitle icon={<Star className="h-4 w-4" />}>Rider rating</SectionTitle>
              <div className="text-2xl font-display font-semibold">{rating.stars} / 5</div>
              {rating.comment && <p className="text-sm mt-2">{rating.comment}</p>}
              {!!rating.tags?.length && (
                <div className="flex gap-1.5 flex-wrap mt-2">{rating.tags.map(t => <Badge key={t}>{t}</Badge>)}</div>
              )}
              {rating.tip ? <div className="text-sm text-muted-foreground mt-2">Tip {fmtRupees(rating.tip)}</div> : null}
            </Card>
          )}
          {orderReview && (
            <Card>
              <SectionTitle icon={<Star className="h-4 w-4" />}>Order review</SectionTitle>
              <div className="text-2xl font-display font-semibold">{orderReview.stars} / 5</div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <Info label="Quality" value={orderReview.quality ?? '—'} />
                <Info label="Packaging" value={orderReview.packaging ?? '—'} />
                <Info label="Accuracy" value={orderReview.accuracy ?? '—'} />
              </div>
              {orderReview.comment && <p className="text-sm mt-2">{orderReview.comment}</p>}
            </Card>
          )}
        </div>
      )}

      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" /> Booking id <span className="font-mono">{b._id}</span>
        {b.updatedAt && <span>· Updated {fmtDate(b.updatedAt)}</span>}
      </div>
    </div>
  );
}
