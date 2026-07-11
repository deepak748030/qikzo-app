import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, StatCardSkeleton } from '@/components/ui';
import { Users, Activity, PackageCheck, Wallet, ShieldCheck, LifeBuoy } from 'lucide-react';
import { fmtMoney } from '@/lib/utils';
import type { ReactNode } from 'react';

type Summary = {
  counts: { riders?: number; ridersOnline?: number; bookingsToday?: number; kycPending?: number; payoutsPending?: number; supportOpen?: number };
  revenueToday?: number;
  gmvToday?: number;
};

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => api<Summary>('/admin/summary'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Live snapshot of the platform.</p>
      </div>

      {isError && <Card><div className="text-sm text-destructive">Failed to load: {(error as any)?.message}</div></Card>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : (
            <>
              <Stat label="Total riders" value={data?.counts?.riders ?? 0} icon={<Users className="h-5 w-5" />} />
              <Stat label="Riders online" value={data?.counts?.ridersOnline ?? 0} icon={<Activity className="h-5 w-5" />} tone="success" />
              <Stat label="Bookings today" value={data?.counts?.bookingsToday ?? 0} icon={<PackageCheck className="h-5 w-5" />} />
              <Stat label="Revenue today" value={fmtMoney(data?.revenueToday ?? 0)} icon={<Wallet className="h-5 w-5" />} tone="info" />
              <Stat label="KYC pending" value={data?.counts?.kycPending ?? 0} icon={<ShieldCheck className="h-5 w-5" />} tone="warning" />
              <Stat label="Support open" value={data?.counts?.supportOpen ?? 0} icon={<LifeBuoy className="h-5 w-5" />} tone="warning" />
            </>
          )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone = 'default' }: { label: string; value: ReactNode; icon: ReactNode; tone?: 'default' | 'success' | 'warning' | 'info' }) {
  const tones: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-primary/10 text-primary',
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-display font-semibold mt-2">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-md grid place-items-center ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}
