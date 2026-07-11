import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';
import { ShieldCheck, UserPlus, LogIn } from 'lucide-react';

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
    e.preventDefault();
    setLoading(true);
    try {
      await requestOtp(normalized());
      toast.success('OTP sent');
      setMode('login-otp');
    } catch (err: any) { toast.error(err?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(normalized(), code.trim());
      toast.success('Welcome back');
      nav('/', { replace: true });
    } catch (err: any) { toast.error(err?.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/admin-bootstrap', { method: 'POST', auth: false, body: { phone: normalized(), name: name.trim() } });
      toast.success('Admin created. Now log in with OTP.');
      setAdminExists(true);
      setMode('login-phone');
    } catch (err: any) { toast.error(err?.message || 'Could not create admin'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-primary/5 via-background to-background">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-lg bg-primary text-primary-foreground grid place-items-center mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-semibold">Qikzo Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'create' ? 'Bootstrap the first admin account' : 'Sign in with your registered phone'}
          </p>
        </div>

        {mode === 'login-phone' && (
          <form onSubmit={onSendOtp} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Phone number</label>
              <div className="flex items-stretch gap-2">
                <div className="grid place-items-center px-3 rounded-md border border-input bg-muted text-sm font-medium text-muted-foreground select-none">+91</div>
                <Input inputMode="numeric" maxLength={10} placeholder="98765 43210" value={phone} onChange={e => onPhoneChange(e.target.value)} autoFocus required className="flex-1" />
              </div>
            </div>
            <Button type="submit" className="w-full" loading={loading} disabled={digits().length !== 10}><LogIn className="h-4 w-4" /> Send OTP</Button>
          </form>
        )}

        {mode === 'login-otp' && (
          <form onSubmit={onVerify} className="space-y-4">
            <div className="text-sm text-muted-foreground">Code sent to <span className="text-foreground font-medium">{normalized()}</span></div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Enter OTP</label>
              <Input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value)} autoFocus required />
            </div>
            <Button type="submit" className="w-full" loading={loading}>Verify & sign in</Button>
            <button type="button" onClick={() => setMode('login-phone')} className="w-full text-sm text-muted-foreground hover:text-foreground">Change number</button>
          </form>
        )}

        {mode === 'create' && (
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Full name</label>
              <Input placeholder="Admin name" value={name} onChange={e => setName(e.target.value)} autoFocus required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Phone number</label>
              <div className="flex items-stretch gap-2">
                <div className="grid place-items-center px-3 rounded-md border border-input bg-muted text-sm font-medium text-muted-foreground select-none">+91</div>
                <Input inputMode="numeric" maxLength={10} placeholder="98765 43210" value={phone} onChange={e => onPhoneChange(e.target.value)} required className="flex-1" />
              </div>
            </div>
            <Button type="submit" className="w-full" loading={loading} disabled={digits().length !== 10}><UserPlus className="h-4 w-4" /> Create admin</Button>
            <button type="button" onClick={() => setMode('login-phone')} className="w-full text-sm text-muted-foreground hover:text-foreground">Back to sign in</button>
          </form>
        )}

        {mode !== 'create' && (
          <div className="mt-6 pt-4 border-t border-border text-center">
            {adminExists === null ? (
              <div className="text-xs text-muted-foreground">Checking setup…</div>
            ) : adminExists ? (
              <div className="text-xs text-muted-foreground">Admin already configured. Contact an existing admin for access.</div>
            ) : (
              <button
                type="button"
                onClick={() => setMode('create')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <UserPlus className="h-4 w-4" /> Create first admin
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
