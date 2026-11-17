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
const MerchantDashboardPage = lazy(() => import('../../features/merchant/pages/MerchantDashboardPage'));
const MerchantBranchesPage = lazy(() => import('../../features/merchant/pages/MerchantBranchesPage'));
const MerchantProgramsPage = lazy(() => import('../../features/merchant/pages/MerchantProgramsPage'));
const BusinessOnboardingRoute = lazy(() => import('../../features/business-onboarding/pages/BusinessOnboardingRoute'));
const PublicQrLandingPage = lazy(() => import('../../features/loyalty/pages/PublicQrLandingPage'));
const MerchantQrScannerPage = lazy(() => import('../../features/loyalty/pages/MerchantQrScannerPage'));

function NotFoundPage() {
  return <PublicLayout><section className="panel"><h1>Page not found</h1><a href={paths.home}>Return home</a></section></PublicLayout>;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PublicLayout><LoadingPanel>Loading page…</LoadingPanel></PublicLayout>}>
        <Routes>
          <Route path={paths.home} element={<HomePage />} />
          <Route path={paths.customerLogin} element={<CustomerLoginPage />} />
          <Route path={paths.merchantLogin} element={<MerchantAuthPage mode="login" />} />
          <Route path={paths.merchantRegister} element={<MerchantAuthPage mode="register" />} />
          
          {/* Public QR landing page - no auth required */}
          <Route path={paths.publicQr} element={<PublicQrLandingPage />} />
          
          <Route element={<ProtectedRoute role="customer"><AppLayout workspace="customer" /></ProtectedRoute>}>
            <Route path={paths.customerDashboard} element={<CustomerDashboardPage />} />
            <Route path="/customer/dashboard" element={<Navigate to={paths.customerDashboard} replace />} />
          </Route>
          <Route element={<ProtectedRoute role="merchant"><AppLayout workspace="merchant" /></ProtectedRoute>}>
            <Route path={paths.merchantDashboard} element={<MerchantDashboardPage />} />
            <Route path="/merchant/dashboard" element={<Navigate to={paths.merchantDashboard} replace />} />
            <Route path={paths.merchantBranches} element={<MerchantBranchesPage />} />
            <Route path={paths.merchantPrograms} element={<MerchantProgramsPage />} />
            <Route path={paths.merchantOnboarding} element={<BusinessOnboardingRoute />} />
            <Route path={paths.merchantScan} element={<MerchantQrScannerPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
