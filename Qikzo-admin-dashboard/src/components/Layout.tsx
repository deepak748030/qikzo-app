import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCog, ShieldCheck, PackageCheck, Wallet, TicketPercent, Images, LifeBuoy, ScrollText, LogOut, Menu, X, Package, Gift, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { cn, fmtPhone } from '@/lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/riders', label: 'Riders', icon: UserCog },
  { to: '/kyc', label: 'KYC Review', icon: ShieldCheck },
  { to: '/bookings', label: 'Bookings', icon: PackageCheck },
  { to: '/payouts', label: 'Payouts', icon: Wallet },
  { to: '/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/rewards', label: 'Rewards', icon: Gift },
  { to: '/referrals', label: 'Referrals', icon: Share2 },
  { to: '/categories', label: 'Categories', icon: Package },
  { to: '/banners', label: 'Banners', icon: Images },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/audit', label: 'Audit Log', icon: ScrollText },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav_ = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => { await logout(); nav_('/login'); };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card p-4 flex flex-col transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-display font-bold">Q</div>
            <div className="font-display font-semibold">Qikzo Admin</div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition',
                isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="px-3 mb-2">
            <div className="text-sm font-medium truncate">{user?.name || 'Admin'}</div>
            <div className="text-xs text-muted-foreground">{fmtPhone(user?.phone)}</div>
          </div>
          <button onClick={doLogout} className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:pl-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 h-14 border-b border-border bg-background/80 backdrop-blur px-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="text-sm text-muted-foreground">Backoffice</div>
        </header>
        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
