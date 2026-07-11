import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import {
  ShieldCheck, UserPlus, LogIn, ArrowRight, ArrowLeft,
  Activity, Lock, Sparkles, CheckCircle2,
} from 'lucide-react';
import heroImg from '@/assets/login-hero.jpg';

type Mode = 'login-phone' | 'login-otp' | 'create';

export default function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('login-phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ adminExists: boolean }>('/admin-bootstrap/status', { auth: false })
      .then(r => setAdminExists(r.adminExists))
      .catch(() => setAdminExists(true));
  }, []);

  const digits = () => phone.replace(/\D/g, '').slice(-10);
  const normalized = () => `+91${digits()}`;
  const onPhoneChange = (v: string) => setPhone(v.replace(/\D/g, '').slice(0, 10));

  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await requestOtp(normalized());
      toast.success('OTP sent to your phone');
      setMode('login-otp');
    } catch (err: any) { toast.error(err?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await verifyOtp(normalized(), code.trim());
      toast.success('Welcome back');
      nav('/', { replace: true });
    } catch (err: any) { toast.error(err?.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await api('/admin-bootstrap', { method: 'POST', auth: false, body: { phone: normalized(), name: name.trim() } });
      toast.success('Admin created. Now sign in with OTP.');
      setAdminExists(true);
      setMode('login-phone');
    } catch (err: any) { toast.error(err?.message || 'Could not create admin'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[1fr_1.05fr] bg-background">
      {/* ============ FORM SIDE ============ */}
      <div className="relative flex flex-col min-h-screen lg:min-h-0 px-6 sm:px-10 lg:px-16 py-8 lg:py-12">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-display font-bold shadow-sm">Q</div>
          <div>
            <div className="font-display font-semibold leading-none">Qikzo</div>
            <div className="text-[11px] text-muted-foreground tracking-wide uppercase mt-0.5">Admin Console</div>
          </div>
        </div>

        {/* Form block, vertically centered */}
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm">
            {/* Heading */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground mb-4">
                <Lock className="h-3 w-3" /> Secure backoffice access
              </div>
              <h1 className="font-display text-3xl sm:text-[2rem] font-semibold tracking-tight leading-tight">
                {mode === 'create' ? 'Set up your admin account' : 'Sign in to Qikzo Admin'}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {mode === 'create'
                  ? 'Bootstrap the first administrator for your workspace.'
                  : mode === 'login-otp'
                    ? <>We sent a 6-digit code to <span className="text-foreground font-medium">{normalized()}</span></>
                    : 'Enter your registered phone number to receive a one-time code.'}
              </p>
            </div>

            {/* Forms */}
            {mode === 'login-phone' && (
              <form onSubmit={onSendOtp} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">Phone number</label>
                  <div className="flex items-stretch h-11 rounded-md border border-border bg-background transition focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/40 overflow-hidden">
                    <div className="grid place-items-center px-3 bg-muted text-sm font-semibold text-foreground select-none border-r border-border">+91</div>
                    <input inputMode="numeric" maxLength={10} placeholder="98765 43210" value={phone} onChange={e => onPhoneChange(e.target.value)} autoFocus required className="flex-1 min-w-0 h-full px-3 bg-transparent text-base tracking-wide outline-none placeholder:text-muted-foreground" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold" loading={loading} disabled={digits().length !== 10}>
                  <LogIn className="h-4 w-4" /> Send secure OTP <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Protected by device fingerprinting & rate-limited OTP.
                </p>
              </form>
            )}

            {mode === 'login-otp' && (
              <form onSubmit={onVerify} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">One-time passcode</label>
                  <Input inputMode="numeric" maxLength={6} placeholder="••••••" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus required className="h-12 text-center text-2xl font-semibold tracking-[0.6em]" />
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold" loading={loading} disabled={code.length < 4}>
                  Verify & sign in <ArrowRight className="h-4 w-4" />
                </Button>
                <button type="button" onClick={() => setMode('login-phone')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> Use a different number
                </button>
              </form>
            )}

            {mode === 'create' && (
              <form onSubmit={onCreate} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">Full name</label>
                  <Input placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} autoFocus required className="h-11" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">Phone number</label>
                  <div className="flex items-stretch h-11 rounded-md border border-border bg-background transition focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/40 overflow-hidden">
                    <div className="grid place-items-center px-3 bg-muted text-sm font-semibold text-foreground select-none border-r border-border">+91</div>
                    <input inputMode="numeric" maxLength={10} placeholder="98765 43210" value={phone} onChange={e => onPhoneChange(e.target.value)} required className="flex-1 min-w-0 h-full px-3 bg-transparent text-base tracking-wide outline-none placeholder:text-muted-foreground" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold" loading={loading} disabled={digits().length !== 10 || !name.trim()}>
                  <UserPlus className="h-4 w-4" /> Create admin account
                </Button>
                <button type="button" onClick={() => setMode('login-phone')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
              </form>
            )}

            {/* Bootstrap CTA */}
            {mode !== 'create' && (
              <div className="mt-8 pt-6 border-t border-border">
                {adminExists === null ? (
                  <div className="text-xs text-muted-foreground">Checking workspace setup…</div>
                ) : adminExists ? (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
                    <span>Workspace is configured. Only authorized administrators can access this console.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode('create')}
                    className="group inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="border-b border-primary/40 group-hover:border-primary transition-colors">Create the first admin</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div>© {new Date().getFullYear()} Qikzo Technologies · All rights reserved</div>
          <div className="flex items-center gap-4">
            <span>SOC 2 · ISO 27001</span>
            <span>v1.0</span>
          </div>
        </div>
      </div>

      {/* ============ HERO SIDE ============ */}
      <aside className="relative hidden lg:block overflow-hidden bg-[#0b0b24]">
        <img
          src={heroImg}
          alt="Qikzo logistics network"
          width={1280}
          height={1600}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b24]/40 via-[#0b0b24]/10 to-[#0b0b24]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.35),_transparent_60%)]" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-10 xl:p-14 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-medium w-fit">
            <Sparkles className="h-3.5 w-3.5" /> Enterprise Backoffice · v1.0
          </div>

          <div className="max-w-lg">
            <h2 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.1] tracking-tight">
              Command your entire delivery network from one console.
            </h2>
            <p className="mt-5 text-white/70 text-base leading-relaxed">
              Real-time bookings, rider dispatch, KYC review, payouts and audit — engineered for operations teams that can't afford downtime.
            </p>

            {/* Live metric cards */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <MetricCard icon={<Activity className="h-4 w-4" />} label="Live bookings" value="1,284" trend="+12.4%" />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="SLA today" value="99.98%" trend="on target" />
            </div>
          </div>

          <ul className="space-y-2.5 text-sm text-white/80">
            <Bullet>Role-based access · OTP + device binding</Bullet>
            <Bullet>Immutable audit trail on every action</Bullet>
            <Bullet>PCI-aware payouts & ledger reconciliation</Bullet>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function MetricCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.06] backdrop-blur-md p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-white/60 uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="mt-1.5 font-display text-2xl font-semibold">{value}</div>
      <div className="text-[11px] text-emerald-300/90 mt-0.5">{trend}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-white/70 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
