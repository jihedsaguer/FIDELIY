import { Card } from '@/components/ui';
import { Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useI18n } from '@/shared/i18n/i18n';
import type { ProgramDto } from '@/features/merchant/api/programApi';

interface ProgramOverviewProps {
  program?: ProgramDto | null;
}

// Link styled like <Button variant="outline" size="md"> (Button renders a <button>, which can't navigate semantically)
const outlineLinkClasses =
  'inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-[var(--radius-lg)] bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--subtle)] hover:border-[var(--glass-brand-strong)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ring-[var(--brand)] ring-offset-[var(--background)]';

/**
 * ProgramOverview - Modernized loyalty programme summary card
 * Uses shadcn/ui Card and Button components with design tokens
 */
export function ProgramOverview({ program }: ProgramOverviewProps) {
  const { t } = useI18n();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
            <Award className="h-6 w-6 text-[var(--brand)]" />
          </div>
          <div>
            <h3 className="text-[var(--text)] font-semibold text-lg">{t('loyaltyProgram')}</h3>
            <p className="text-[var(--text-muted)] text-sm">{t('configureLoyalty')}</p>
          </div>
        </div>
        <Link to={paths.merchantPrograms} className={outlineLinkClasses}>
          {t('manage')}
        </Link>
      </div>
      {program ? (
        <div className="bg-[var(--subtle)] rounded-[var(--radius-lg)] p-4">
          <p className="text-[var(--text)] font-medium">{program.name}</p>
          <p className="text-[var(--text-muted)] text-sm">
            {program.type === 'stamps' ? t('stamps') : program.type === 'points' ? t('points') : t('hybridProgram')}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--subtle)] rounded-[var(--radius-lg)] p-4 text-center">
          <p className="text-[var(--text-muted)]">{t('noProgram')}</p>
          <Link to={paths.merchantPrograms} className={`${outlineLinkClasses} mt-2`}>
            {t('createProgram')}
          </Link>
        </div>
      )}
    </Card>
  );
}
