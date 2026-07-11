import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import RidersPage from '@/pages/RidersPage';
import UsersPage from '@/pages/UsersPage';
import KycPage from '@/pages/KycPage';
import BookingsPage from '@/pages/BookingsPage';
import PayoutsPage from '@/pages/PayoutsPage';
import CouponsPage from '@/pages/CouponsPage';
import BannersPage from '@/pages/BannersPage';
import SupportPage from '@/pages/SupportPage';
import SupportDetailPage from '@/pages/SupportDetailPage';
import AuditPage from '@/pages/AuditPage';
import { Loader2 } from 'lucide-react';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="riders" element={<RidersPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="kyc" element={<KycPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="support/:id" element={<SupportDetailPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
