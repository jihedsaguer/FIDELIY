import { Button } from '@/components/ui';
import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useI18n } from '@/shared/i18n/i18n';

export function NoBusinessSetup() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--subtle)] rounded-lg border border-[var(--border)]">
      <div className="h-16 w-16 rounded-full bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center mb-6">
        <Building2 className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-[var(--text)] text-xl font-semibold mb-2">{t('noBusiness')}</h3>
      <p className="text-[var(--text-muted)] text-center mb-6 max-w-md">{t('setupBusinessToContinue')}</p>
      <Button onClick={() => navigate(paths.merchantOnboarding)}>
        {t('setupBusiness')}
      </Button>
    </div>
  );
}
