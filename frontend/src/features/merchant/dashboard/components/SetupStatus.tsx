import { Card, Button } from '@/components/ui';
import { Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useI18n } from '@/shared/i18n/i18n';
import type { BusinessSetup } from '@/features/business-onboarding/types/businessOnboarding.types';

interface SetupStatusProps {
  setup?: BusinessSetup;
}

export function SetupStatus({ setup }: SetupStatusProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const isComplete = setup?.status === 'complete';

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isComplete ? 'bg-[var(--success-light)]' : 'bg-[var(--warning-light)]'}`}>
          {isComplete ? (
            <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
          ) : (
            <Clock className="h-6 w-6 text-[var(--warning)]" />
          )}
        </div>
        <div>
          <h3 className="text-[var(--text)] font-semibold text-lg">{t('setupStatus')}</h3>
          <p className="text-[var(--text-muted)] text-sm">{isComplete ? t('complete') : t('incomplete')}</p>
        </div>
      </div>
      {!isComplete && (
        <Button variant="outline" onClick={() => navigate(paths.merchantOnboarding)}>
          {t('setupBusiness')}
        </Button>
      )}
    </Card>
  );
}
