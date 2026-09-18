import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Layout from '@/components/Layout';
import { Loader2 } from 'lucide-react';

// Login stays eager — it's the entry point when unauthenticated and
// must paint immediately. Every other page is lazy-loaded so the initial
// bundle only ships the shell + login (~1/3 of the previous size).
import LoginPage from '@/pages/LoginPage';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const RidersPage = lazy(() => import('@/pages/RidersPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const KycPage = lazy(() => import('@/pages/KycPage'));
const BookingsPage = lazy(() => import('@/pages/BookingsPage'));
const BookingDetailPage = lazy(() => import('@/pages/BookingDetailPage'));
const PayoutsPage = lazy(() => import('@/pages/PayoutsPage'));
// Coupons hidden for now — page kept for later.
// const CouponsPage = lazy(() => import('@/pages/CouponsPage'));
const CoveragePage = lazy(() => import('@/pages/CoveragePage'));
const BannersPage = lazy(() => import('@/pages/BannersPage'));
const BannerManagementPage = lazy(() => import('@/pages/BannerManagementPage'));
const StoresPage = lazy(() => import('@/pages/StoresPage'));
const SupportPage = lazy(() => import('@/pages/SupportPage'));
const SupportDetailPage = lazy(() => import('@/pages/SupportDetailPage'));
const AuditPage = lazy(() => import('@/pages/AuditPage'));
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'));
const RewardsPage = lazy(() => import('@/pages/RewardsPage'));
const ReferralsPage = lazy(() => import('@/pages/ReferralsPage'));

function FullscreenSpinner() {
  return (
    <div className="min-h-[50vh] grid place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<FullscreenSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route index element={<DashboardPage />} />
          <Route path="riders" element={<RidersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="kyc" element={<KycPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="payouts" element={<PayoutsPage />} />
          {/* <Route path="coupons" element={<CouponsPage />} /> */}
          <Route path="coverage" element={<CoveragePage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="banner-management" element={<BannerManagementPage />} />
          <Route path="banner-management/stores" element={<StoresPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="support/:id" element={<SupportDetailPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
