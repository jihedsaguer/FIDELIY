import { useState, useEffect } from 'react';
import { useI18n } from '../../../shared/i18n/i18n';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/AuthProvider';
import { LanguageSwitcher } from '../../../shared/i18n/LanguageSwitcher';
import { ProfileCard, sessionToProfileData, type ProfileData } from '../components';

/**
 * CustomerProfilePage - Displays customer profile information
 * 
 * Shows read-only profile information from the authenticated session.
 * Note: Profile editing is disabled as no update API exists in the current backend.
 * Phone number is displayed without verification claim (per requirements).
 */
export default function CustomerProfilePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { session, status: authStatus, signOut } = useAuth();
  
  // Convert session to profile data
  const [profile, setProfile] = useState<ProfileData>(sessionToProfileData(session));
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Update profile when session changes
  useEffect(() => {
    setProfile(sessionToProfileData(session));
  }, [session]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut('/customer/signin');
    } catch (error) {
      console.error(t('signOutError'), error);
      setIsSigningOut(false);
    }
  };

  // Show loading state while session is being fetched
  if (authStatus === 'loading') {
    return (
      <main className="flex-1 bg-[var(--surface)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <p className="text-[var(--text-muted)] text-center py-8">{t('loading')}</p>
        </div>
      </main>
    );
  }

  // Show error state if session failed to load
  if (authStatus === 'error' || !session) {
    return (
      <main className="flex-1 bg-[var(--surface)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <p className="text-[var(--danger)] text-center py-8">{t('error')}</p>
          <div className="text-center">
            <Button onClick={() => navigate('/customer/signin')}>
              {t('signIn')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[var(--surface)] p-4 md:p-8">
      <div className="mx-auto max-w-screen-md w-full">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
                {t('profile')}
              </h1>
              <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
                {t('manageYourProfile')}
              </p>
            </div>
            <div className="flex-shrink-0">
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Profile Card - Read-only */}
        <ProfileCard profile={profile} />

        {/* Actions: Sign Out */}
        <div className="mt-8 space-y-4">
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full"
          >
            {isSigningOut ? t('signingOut') : t('signOut')}
          </Button>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate('/customer')}>
            {t('backToDashboard')}
          </Button>
        </div>
      </div>
    </main>
  );
}
