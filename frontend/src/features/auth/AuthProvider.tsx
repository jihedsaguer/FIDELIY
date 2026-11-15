import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  useGetSessionQuery,
  useSignOutMutation,
} from './api/authApi';
import type { AuthSession } from './types/auth.types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextValue {
  session: AuthSession | null;
  status: AuthStatus;
  refreshSession: () => Promise<AuthSession | null>;
  signOut: (redirectTo?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session = null, isLoading, isFetching, isError, refetch } = useGetSessionQuery();
  const [sendSignOut] = useSignOutMutation();

  const refreshSession = useCallback(async () => {
    const result = await refetch();
    if ('error' in result && result.error) {
      throw new Error('Unable to check your session. Check your connection and try again.');
    }
    return result.data ?? null;
  }, [refetch]);

  const signOut = useCallback(async (redirectTo?: string) => {
    await sendSignOut().unwrap();
    // Invalidate the session by forcing a refetch
    // The invalidatesTags in the mutation should handle this, but we also force it here
    await refreshSession();
    // Redirect to specified path or home page
    if (redirectTo) {
      window.location.replace(redirectTo);
    }
  }, [refreshSession, sendSignOut]);

  const status: AuthStatus = isError
    ? 'error'
    : isLoading || isFetching
      ? 'loading'
      : session
        ? 'authenticated'
        : 'unauthenticated';

  const value = useMemo(
    () => ({ session, status, refreshSession, signOut }),
    [session, status, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
