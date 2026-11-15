import { useEffect, type ReactNode } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { paths } from './paths';
import { useAuth } from '../../features/auth/AuthProvider';
import { useGetCustomerProfileQuery } from '../../features/auth/api/authApi';
import { useGetMerchantProfileQuery } from '../../features/merchant/api/merchantApi';
import { LoadingPanel } from '../../components/ui/LoadingPanel';

type Role = 'customer' | 'merchant';

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = error.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { status, session, refreshSession } = useAuth();
  const customerProfile = useGetCustomerProfileQuery(undefined, {
    skip: role !== 'customer' || status !== 'authenticated',
  });
  const merchantProfile = useGetMerchantProfileQuery(undefined, {
    skip: role !== 'merchant' || status !== 'authenticated',
  });
  const profile = role === 'customer' ? customerProfile : merchantProfile;
  const loginPath = role === 'customer' ? paths.customerLogin : paths.merchantLogin;

  useEffect(() => {
    if (status === 'unauthenticated') window.location.replace(loginPath);
  }, [loginPath, status]);

  useEffect(() => {
    if (status === 'authenticated' && getErrorStatus(profile.error) === 401) {
      void refreshSession().catch(() => undefined);
      window.location.replace(loginPath);
    }
  }, [loginPath, profile.error, refreshSession, status]);

  if (status === 'error') {
    return (
      <PublicLayout>
        <section className="panel">
          <h1>Connection issue</h1>
          <p>We could not check your session.</p>
          <button className="primary-button" onClick={() => void refreshSession().catch(() => undefined)}>Try again</button>
        </section>
      </PublicLayout>
    );
  }
  if (status === 'loading' || profile.isLoading || profile.isFetching) {
    return <PublicLayout><LoadingPanel>Restoring your session…</LoadingPanel></PublicLayout>;
  }
  if (profile.error) {
    const forbidden = getErrorStatus(profile.error) === 403;
    if (forbidden) {
      return (
        <PublicLayout>
          <section className="panel">
            <p className="eyebrow">Access restricted</p>
            <h1>This space is for {role}s</h1>
            <p>This signed-in account does not have {role} access. Your authentication is valid, but the backend has not granted this capability.</p>
            <a className="secondary-link" href="/">Return home</a>
          </section>
        </PublicLayout>
      );
    }
    return <PublicLayout><section className="panel"><h1>Profile unavailable</h1><p>We could not load your profile. Please try again.</p><a href="/">Return home</a></section></PublicLayout>;
  }
  if (status !== 'authenticated' || !session || !profile.data) return null;
  return <>{children}</>;
}
