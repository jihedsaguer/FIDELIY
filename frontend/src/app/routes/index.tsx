import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoadingPanel } from '../../components/ui/LoadingPanel';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { AppLayout } from '../../components/layout/AppLayout';
import { ProtectedRoute } from './RouteGuards';
import { paths } from './paths';

const HomePage = lazy(() => import('../../features/auth/pages/HomePage'));
const CustomerLoginPage = lazy(() => import('../../features/auth/pages/CustomerLoginPage'));
const MerchantAuthPage = lazy(() => import('../../features/auth/pages/MerchantAuthPage'));
const CustomerDashboardPage = lazy(() => import('../../features/customer/pages/CustomerDashboardPage'));
const CustomerQRPage = lazy(() => import('../../features/customer/pages/CustomerQRPage'));
const CustomerActivityPage = lazy(() => import('../../features/customer/pages/CustomerActivityPage'));
const CustomerProfilePage = lazy(() => import('../../features/customer/pages/CustomerProfilePage'));
const CustomerMembershipPage = lazy(() => import('../../features/customer/pages/CustomerMembershipPage'));
const MerchantDashboardPage = lazy(() => import('../../features/merchant/pages/MerchantDashboardPage'));
const MerchantBusinessProfilePage = lazy(() => import('../../features/merchant/pages/MerchantBusinessProfilePage'));
const MerchantBranchesPage = lazy(() => import('../../features/merchant/pages/MerchantBranchesPage'));
const MerchantProgramsPage = lazy(() => import('../../features/merchant/pages/MerchantProgramsPage'));
const MerchantCustomersPage = lazy(() => import('../../features/merchant/pages/MerchantCustomersPage'));
const MerchantSettingsPage = lazy(() => import('../../features/merchant/pages/MerchantSettingsPage'));
const MerchantMorePage = lazy(() => import('../../features/merchant/pages/MerchantMorePage'));
const BusinessOnboardingRoute = lazy(() => import('../../features/business-onboarding/pages/BusinessOnboardingRoute'));
const PublicQrLandingPage = lazy(() => import('../../features/loyalty/pages/PublicQrLandingPage'));

function NotFoundPage() {
  return (
    <PublicLayout>
      <section className="panel">
        <h1>Page not found</h1>
        <a href={paths.home}>Return home</a>
      </section>
    </PublicLayout>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PublicLayout><LoadingPanel>Loading page…</LoadingPanel></PublicLayout>}>
        <Routes>
          {/* Public routes */}
          <Route path={paths.home} element={<HomePage />} />
          <Route path={paths.customerLogin} element={<CustomerLoginPage />} />
          <Route path={paths.merchantLogin} element={<MerchantAuthPage mode="login" />} />
          <Route path={paths.merchantRegister} element={<MerchantAuthPage mode="register" />} />
          
          {/* Public QR landing page - no auth required */}
          <Route path={paths.publicQr} element={<PublicQrLandingPage />} />
          
          {/* Customer protected routes */}
          <Route element={<ProtectedRoute role="customer"><AppLayout workspace="customer" /></ProtectedRoute>}>
            <Route path={paths.customerDashboard} element={<CustomerDashboardPage />} />
            <Route path={paths.customerQr} element={<CustomerQRPage />} />
            <Route path={paths.customerActivity} element={<CustomerActivityPage />} />
            <Route path={paths.customerProfile} element={<CustomerProfilePage />} />
            <Route path={paths.customerMembership} element={<CustomerMembershipPage />} />
            <Route path="/customer" element={<Navigate to={paths.customerDashboard} replace />} />
          </Route>
          
          {/* Merchant protected routes */}
          <Route element={<ProtectedRoute role="merchant"><AppLayout workspace="merchant" /></ProtectedRoute>}>
            <Route path={paths.merchantDashboard} element={<MerchantDashboardPage />} />
            <Route path={paths.merchantOnboarding} element={<BusinessOnboardingRoute />} />
            <Route path={paths.merchantBusinessProfile} element={<MerchantBusinessProfilePage />} />
            <Route path={paths.merchantBranches} element={<MerchantBranchesPage />} />
            <Route path={paths.merchantPrograms} element={<MerchantProgramsPage />} />
            <Route path={paths.merchantCustomers} element={<MerchantCustomersPage />} />
            <Route path={paths.merchantSettings} element={<MerchantSettingsPage />} />
            <Route path={paths.merchantMore} element={<MerchantMorePage />} />
            <Route path="/merchant" element={<Navigate to={paths.merchantDashboard} replace />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
