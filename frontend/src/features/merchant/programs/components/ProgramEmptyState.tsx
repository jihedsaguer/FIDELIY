import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/shared/i18n/i18n';

/**
 * ProgramEmptyState - no active programme; the page passes the create action.
 */
export function ProgramEmptyState({ action }: { action?: ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-center sm:p-8">
      <Sparkles aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-[var(--brand-dark)]" />
      <h2 className="text-lg font-semibold text-[var(--text)]">{t('noActiveProgram')}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-muted)]">{t('noActiveProgramHint')}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * ProgramHistoryEmptyState - no previous programme versions.
 */
export function ProgramHistoryEmptyState() {
  const { t } = useI18n();

  return <p className="text-sm text-[var(--text-muted)]">{t('noPreviousVersions')}</p>;
}
