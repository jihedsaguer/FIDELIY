import { Card, Button } from '@/components/ui';
import { Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useI18n } from '@/shared/i18n/i18n';
import type { ProgramDto } from '@/features/merchant/api/programApi';

interface ProgramOverviewProps {
  program?: ProgramDto | null;
}

export function ProgramOverview({ program }: ProgramOverviewProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
            <Award className="h-6 w-6 text-[var(--text)]" />
          </div>
          <div>
            <h3 className="text-[var(--text)] font-semibold text-lg">{t('loyaltyProgram')}</h3>
            <p className="text-[var(--text-muted)] text-sm">{t('configureLoyalty')}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(paths.merchantPrograms)}>
          {t('manage')}
        </Button>
      </div>
      {program ? (
        <div className="bg-[var(--subtle)] rounded-[var(--radius-lg)] p-4">
          <p className="text-[var(--text)] font-medium">{program.name}</p>
          <p className="text-[var(--text-muted)] text-sm">
            {program.type === 'stamps' ? t('stamps') : t('points')}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--subtle)] rounded-[var(--radius-lg)] p-4 text-center">
          <p className="text-[var(--text-muted)]">{t('noProgram')}</p>
          <Button variant="outline" onClick={() => navigate(paths.merchantPrograms)} className="mt-2">
            {t('createProgram')}
          </Button>
        </div>
      )}
    </Card>
  );
}
