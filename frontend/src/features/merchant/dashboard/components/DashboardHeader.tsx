import { Button } from '@/components/ui';
import { useI18n } from '@/shared/i18n/i18n';
import type { AuthSession } from '@/features/auth/types/auth.types';

interface DashboardHeaderProps {
  session: AuthSession | null | undefined;
  onSignOut: () => void;
  isPending: boolean;
}

export function DashboardHeader({ session, onSignOut, isPending }: DashboardHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
            {t('welcome')}, {session?.user.name}
          </h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
            {t('dashboard')}
          </p>
        </div>
        <Button variant="ghost" onClick={onSignOut} disabled={isPending}>
          {isPending ? t('signingOut') : t('signOut')}
        </Button>
      </div>
    </header>
  );
}
