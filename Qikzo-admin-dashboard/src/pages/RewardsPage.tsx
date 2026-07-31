import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button, Card, Input, Textarea, Skeleton } from '@/components/ui';
import { Gift, Plus, Trash2, Save } from 'lucide-react';

type Tier = { minAmount: number; type: 'percent' | 'flat'; value: number; maxBonus: number };
type Milestone = { deliveries: number; reward: number };

type RewardConfig = {
  bonus: {
    enabled: boolean;
    tiers: Tier[];
    maxUsagePct: number;
    minTopup: number;
    maxTopup: number;
  };
  referral: {
    enabled: boolean;
    milestones: Milestone[];
    rewardWallet: 'money' | 'bonus';
    refereeSignupReward: number;
    refereeRewardWallet: 'money' | 'bonus';
    terms: string;
  };
};

const num = (v: string) => (v === '' ? 0 : Number(v));

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/**
 * Reward settings — the admin surface for the wallet bonus programme and the
 * Refer & Earn campaign. Everything the customer and rider apps read comes
 * from here; the server re-validates every number on save.
 */
export default function RewardsPage() {
  const [cfg, setCfg] = useState<RewardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<RewardConfig>('/admin/reward-config');
        setCfg({ bonus: res.bonus, referral: res.referral });
      } catch (e: any) {
        toast.error(e?.message || 'Could not load reward settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patchBonus = (p: Partial<RewardConfig['bonus']>) => setCfg(c => (c ? { ...c, bonus: { ...c.bonus, ...p } } : c));
  const patchRef = (p: Partial<RewardConfig['referral']>) => setCfg(c => (c ? { ...c, referral: { ...c.referral, ...p } } : c));

  const save = async () => {
    if (!cfg) return;
    if (cfg.bonus.maxTopup < cfg.bonus.minTopup) return toast.error('Maximum top-up must be above the minimum');
    if (cfg.bonus.maxUsagePct < 0 || cfg.bonus.maxUsagePct > 100) return toast.error('Bonus usage cap must be between 0 and 100%');
    if (cfg.bonus.tiers.some(t => t.minAmount < 1)) return toast.error('Every slab needs a top-up amount of at least ₹1');
    if (cfg.referral.milestones.some(m => m.deliveries < 1)) return toast.error('Every milestone needs a delivery target of at least 1');
    setSaving(true);
    try {
      const res = await api<RewardConfig>('/admin/reward-config', { method: 'PATCH', body: cfg });
      setCfg({ bonus: res.bonus, referral: res.referral });
      toast.success('Reward settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !cfg) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Card>
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Reward settings</h1>
          <p className="text-sm text-muted-foreground">Wallet bonus slabs and the Refer &amp; Earn programme. Applies instantly to the customer and rider apps.</p>
        </div>
        <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Save changes</Button>
      </div>

      <Card>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display font-semibold">Bonus wallet</h2>
            <Toggle checked={cfg.bonus.enabled} onChange={v => patchBonus({ enabled: v })} label="Bonus programme enabled" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Minimum top-up (₹)" hint="Smallest amount a customer can add.">
              <Input inputMode="numeric" value={String(cfg.bonus.minTopup)} onChange={e => patchBonus({ minTopup: num(e.target.value) })} />
            </Field>
            <Field label="Maximum top-up (₹)" hint="Largest single top-up allowed.">
              <Input inputMode="numeric" value={String(cfg.bonus.maxTopup)} onChange={e => patchBonus({ maxTopup: num(e.target.value) })} />
            </Field>
            <Field label="Bonus usage cap (%)" hint="Max share of any bill payable from the bonus wallet.">
              <Input inputMode="numeric" value={String(cfg.bonus.maxUsagePct)} onChange={e => patchBonus({ maxUsagePct: num(e.target.value) })} />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <div>
                <div className="text-sm font-medium">Bonus slabs</div>
                <p className="text-xs text-muted-foreground">Highest matching slab wins for a given top-up amount.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => patchBonus({ tiers: [...cfg.bonus.tiers, { minAmount: 1, type: 'percent', value: 0, maxBonus: 0 }] })}>
                <Plus className="h-4 w-4" /> Add slab
              </Button>
            </div>
            {cfg.bonus.tiers.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4 text-center">No slabs configured — top-ups earn no bonus.</div>
            ) : (
              <div className="space-y-2">
                {cfg.bonus.tiers.map((t, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] items-end border border-border rounded-md p-3">
                    <Field label="Top-up from (₹)">
                      <Input inputMode="numeric" value={String(t.minAmount)} onChange={e => { const tiers = [...cfg.bonus.tiers]; tiers[i] = { ...t, minAmount: num(e.target.value) }; patchBonus({ tiers }); }} />
                    </Field>
                    <Field label="Type">
                      <select
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                        value={t.type}
                        onChange={e => { const tiers = [...cfg.bonus.tiers]; tiers[i] = { ...t, type: e.target.value as Tier['type'] }; patchBonus({ tiers }); }}
                      >
                        <option value="percent">Percent (%)</option>
                        <option value="flat">Flat (₹)</option>
                      </select>
                    </Field>
                    <Field label={t.type === 'percent' ? 'Bonus (%)' : 'Bonus (₹)'}>
                      <Input inputMode="numeric" value={String(t.value)} onChange={e => { const tiers = [...cfg.bonus.tiers]; tiers[i] = { ...t, value: num(e.target.value) }; patchBonus({ tiers }); }} />
                    </Field>
                    <Field label="Cap (₹)">
                      <Input inputMode="numeric" value={String(t.maxBonus)} onChange={e => { const tiers = [...cfg.bonus.tiers]; tiers[i] = { ...t, maxBonus: num(e.target.value) }; patchBonus({ tiers }); }} />
                    </Field>
                    <Button size="sm" variant="destructive" onClick={() => patchBonus({ tiers: cfg.bonus.tiers.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display font-semibold">Refer &amp; Earn</h2>
            <Toggle checked={cfg.referral.enabled} onChange={v => patchRef({ enabled: v })} label="Referral campaign live" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Referrer reward wallet" hint="Where milestone rewards are credited.">
              <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={cfg.referral.rewardWallet} onChange={e => patchRef({ rewardWallet: e.target.value as RewardConfig['referral']['rewardWallet'] })}>
                <option value="money">Money wallet</option>
                <option value="bonus">Bonus wallet</option>
              </select>
            </Field>
            <Field label="Signup reward (₹)" hint="Credited to the person applying a code.">
              <Input inputMode="numeric" value={String(cfg.referral.refereeSignupReward)} onChange={e => patchRef({ refereeSignupReward: num(e.target.value) })} />
            </Field>
            <Field label="Signup reward wallet">
              <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={cfg.referral.refereeRewardWallet} onChange={e => patchRef({ refereeRewardWallet: e.target.value as RewardConfig['referral']['refereeRewardWallet'] })}>
                <option value="bonus">Bonus wallet</option>
                <option value="money">Money wallet</option>
              </select>
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <div>
                <div className="text-sm font-medium">Milestones</div>
                <p className="text-xs text-muted-foreground">Delivery target the referred user must reach, and what the referrer earns.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => patchRef({ milestones: [...cfg.referral.milestones, { deliveries: 1, reward: 0 }] })}>
                <Plus className="h-4 w-4" /> Add milestone
              </Button>
            </div>
            {cfg.referral.milestones.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4 text-center">No milestones — referrers earn nothing yet.</div>
            ) : (
              <div className="space-y-2">
                {cfg.referral.milestones.map((m, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end border border-border rounded-md p-3">
                    <Field label="Delivery target">
                      <Input inputMode="numeric" value={String(m.deliveries)} onChange={e => { const ms = [...cfg.referral.milestones]; ms[i] = { ...m, deliveries: num(e.target.value) }; patchRef({ milestones: ms }); }} />
                    </Field>
                    <Field label="Reward amount (₹)">
                      <Input inputMode="numeric" value={String(m.reward)} onChange={e => { const ms = [...cfg.referral.milestones]; ms[i] = { ...m, reward: num(e.target.value) }; patchRef({ milestones: ms }); }} />
                    </Field>
                    <Button size="sm" variant="destructive" onClick={() => patchRef({ milestones: cfg.referral.milestones.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Terms" hint="Shown under the milestone list in the app.">
            <Textarea rows={3} value={cfg.referral.terms} onChange={e => patchRef({ terms: e.target.value })} placeholder="Rewards are credited within 24 hours of a qualifying delivery." />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Gift className="h-4 w-4" /> Every value here is validated server-side before it reaches the apps.
      </div>
    </div>
  );
}
